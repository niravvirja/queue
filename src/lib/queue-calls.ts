import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueueAuth } from "@/lib/queue-auth";
import { sendPushToUser } from "@/lib/push.functions";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export type CallKind = "audio" | "video";
export type CallPhase = "idle" | "outgoing" | "incoming" | "connected" | "ended";

export type ActiveCall = {
  id: string;
  conversationId: string;
  peerId: string;
  peerName: string;
  kind: CallKind;
  direction: "incoming" | "outgoing";
  phase: CallPhase;
};

type SignalPayload =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "end" };

export function useCallEngine() {
  const { user, profile } = useQueueAuth();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const facingRef = useRef<"user" | "environment">("user");

  callRef.current = call;

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setSpeaker(false);
    setSeconds(0);
  }, []);

  const sendSignal = useCallback(
    async (callId: string, recipientId: string, payload: SignalPayload) => {
      if (!user) return;
      await supabase.from("call_signals").insert({
        call_id: callId,
        sender_id: user.id,
        recipient_id: recipientId,
        payload: payload as unknown as never,
      });
    },
    [user],
  );

  const createPeer = useCallback(
    async (callId: string, peerId: string, kind: CallKind) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video" ? { facingMode: facingRef.current } : false,
      });
      localRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remote = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
        setRemoteStream(remote);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(callId, peerId, { type: "ice", candidate: event.candidate.toJSON() });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCall((current) => (current ? { ...current, phase: "connected" } : current));
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [sendSignal],
  );

  const startCall = useCallback(
    async (conversationId: string, peerId: string, peerName: string, kind: CallKind) => {
      if (!user) return;
      setError(null);
      try {
        const { data, error: insertError } = await supabase
          .from("calls")
          .insert({
            conversation_id: conversationId,
            caller_id: user.id,
            callee_id: peerId,
            kind,
            status: "ringing",
          })
          .select("id")
          .single();
        if (insertError || !data) throw new Error("Could not start the call.");

        setCall({
          id: data.id,
          conversationId,
          peerId,
          peerName,
          kind,
          direction: "outgoing",
          phase: "outgoing",
        });

        const pc = await createPeer(data.id, peerId, kind);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(data.id, peerId, { type: "offer", sdp: offer });

        await supabase.from("notifications").insert({
          user_id: peerId,
          kind: "call",
          title: kind === "video" ? "Incoming video call" : "Incoming call",
          body: `${profile?.display_name ?? "Someone"} is calling you.`,
          data: { call_id: data.id, conversation_id: conversationId },
        });
        sendPushToUser({
          data: {
            userId: peerId,
            title: kind === "video" ? "Incoming video call" : "Incoming call",
            body: `${profile?.display_name ?? "Someone"} is calling you on Queue.`,
            tag: `call-${data.id}`,
          },
        }).catch(() => undefined);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not start the call.");
        cleanup();
        setCall(null);
      }
    },
    [cleanup, createPeer, profile?.display_name, sendSignal, user],
  );

  const answerCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || !user) return;
    try {
      const { data: signals } = await supabase
        .from("call_signals")
        .select("payload")
        .eq("call_id", current.id)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: true });

      const offer = (signals ?? [])
        .map((s) => s.payload as unknown as SignalPayload)
        .find((p) => p.type === "offer");
      if (!offer || offer.type !== "offer") throw new Error("The caller hung up.");

      const pc = await createPeer(current.id, current.peerId, current.kind);
      await pc.setRemoteDescription(offer.sdp);

      for (const signal of signals ?? []) {
        const payload = signal.payload as unknown as SignalPayload;
        if (payload.type === "ice") await pc.addIceCandidate(payload.candidate).catch(() => undefined);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(current.id, current.peerId, { type: "answer", sdp: answer });
      await supabase
        .from("calls")
        .update({ status: "active", answered_at: new Date().toISOString() })
        .eq("id", current.id);
      setCall({ ...current, phase: "connected" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not answer the call.");
      cleanup();
      setCall(null);
    }
  }, [cleanup, createPeer, sendSignal, user]);

  const endCall = useCallback(
    async (status?: "declined" | "missed" | "ended") => {
      const current = callRef.current;
      cleanup();
      setCall(null);
      if (!current) return;
      await sendSignal(current.id, current.peerId, { type: "end" });
      const finalStatus =
        status ?? (current.phase === "connected" ? "ended" : current.direction === "incoming" ? "declined" : "missed");
      await supabase
        .from("calls")
        .update({
          status: finalStatus,
          ended_at: new Date().toISOString(),
          duration_seconds: current.phase === "connected" ? seconds : 0,
        })
        .eq("id", current.id);
    },
    [cleanup, sendSignal, seconds],
  );

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((track) => (track.enabled = !next));
    setCameraOff(next);
  }, [cameraOff]);

  const switchCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    facingRef.current = facingRef.current === "user" ? "environment" : "user";
    const fresh = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingRef.current },
      audio: false,
    });
    const track = fresh.getVideoTracks()[0];
    if (!track) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    await sender?.replaceTrack(track);
    const stream = localRef.current;
    stream?.getVideoTracks().forEach((old) => {
      old.stop();
      stream.removeTrack(old);
    });
    stream?.addTrack(track);
    setLocalStream(stream ? new MediaStream(stream.getTracks()) : null);
  }, []);

  /* incoming calls + signaling */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`calls-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            caller_id: string;
            kind: CallKind;
            status: string;
          };
          if (row.status !== "ringing" || callRef.current) return;
          const { data: caller } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", row.caller_id)
            .maybeSingle();
          setCall({
            id: row.id,
            conversationId: row.conversation_id,
            peerId: row.caller_id,
            peerName: caller?.display_name || caller?.username || "Queue contact",
            kind: row.kind,
            direction: "incoming",
            phase: "incoming",
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as { call_id: string; payload: SignalPayload };
          const current = callRef.current;
          if (!current || current.id !== row.call_id) return;
          const pc = pcRef.current;

          if (row.payload.type === "end") {
            cleanup();
            setCall({ ...current, phase: "ended" });
            window.setTimeout(() => setCall(null), 1200);
            return;
          }
          if (!pc) return;
          if (row.payload.type === "answer") {
            await pc.setRemoteDescription(row.payload.sdp).catch(() => undefined);
            setCall({ ...current, phase: "connected" });
          } else if (row.payload.type === "ice") {
            await pc.addIceCandidate(row.payload.candidate).catch(() => undefined);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanup, user]);

  /* connected timer */
  useEffect(() => {
    if (call?.phase !== "connected") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [call?.phase]);

  return {
    call,
    seconds,
    muted,
    speaker,
    cameraOff,
    localStream,
    remoteStream,
    error,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleSpeaker: () => setSpeaker((s) => !s),
    clearError: () => setError(null),
  };
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
