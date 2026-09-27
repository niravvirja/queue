import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueueAuth } from "@/lib/queue-auth";

/* ============================== online presence ============================== */

const onlineUsers = new Set<string>();
const presenceListeners = new Set<() => void>();

function emitPresence() {
  presenceListeners.forEach((listener) => listener());
}

function subscribePresence(listener: () => void) {
  presenceListeners.add(listener);
  return () => presenceListeners.delete(listener);
}

const LAST_SEEN_INTERVAL = 60_000;

/**
 * Joins the shared presence channel for the signed-in user and keeps
 * `profiles.last_seen_at` fresh. Mount exactly once, at the app shell.
 */
export function useQueuePresence(shareLastSeen = true) {
  const { user } = useQueueAuth();

  useEffect(() => {
    if (!user) {
      if (onlineUsers.size) {
        onlineUsers.clear();
        emitPresence();
      }
      return;
    }

    const channel = supabase.channel("queue-presence", {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      const state = channel.presenceState();
      onlineUsers.clear();
      Object.keys(state).forEach((key) => onlineUsers.add(key));
      emitPresence();
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      onlineUsers.clear();
      emitPresence();
    };
  }, [user]);

  // Heartbeat the stored last-seen timestamp while the app is open.
  useEffect(() => {
    if (!user || !shareLastSeen) return;

    let stopped = false;
    const stamp = async () => {
      if (stopped) return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    };

    void stamp();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void stamp();
    }, LAST_SEEN_INTERVAL);

    const onHide = () => {
      if (document.visibilityState === "hidden") void stamp();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [shareLastSeen, user]);
}

/** True while the given user has Queue open on any device. */
export function useIsOnline(userId: string | null | undefined) {
  const online = useSyncExternalStore(
    subscribePresence,
    () => (userId ? onlineUsers.has(userId) : false),
    () => false,
  );
  return online;
}

/** "online" / "last seen 4m ago" style label for a peer. */
export function lastSeenLabel(online: boolean, lastSeenAt?: string | null) {
  if (online) return "online";
  if (!lastSeenAt) return "offline";
  const then = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(then)) return "offline";
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "last seen just now";
  if (minutes < 60) return `last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "last seen yesterday";
  if (days < 7) return `last seen ${days}d ago`;
  return "last seen a while ago";
}

/* ================================== typing ================================== */

const TYPING_TTL = 3_000;
const TYPING_THROTTLE = 1_400;
const TYPING_IDLE = 1_800;

/** conversationId -> timestamp the peer's typing signal expires at. */
const typingUntil = new Map<string, number>();
const typingListeners = new Set<() => void>();

function emitTyping() {
  typingListeners.forEach((listener) => listener());
}

function subscribeTyping(listener: () => void) {
  typingListeners.add(listener);
  return () => typingListeners.delete(listener);
}

function setTypingState(conversationId: string, typing: boolean) {
  if (typing) {
    typingUntil.set(conversationId, Date.now() + TYPING_TTL);
  } else if (!typingUntil.has(conversationId)) {
    return;
  } else {
    typingUntil.delete(conversationId);
  }
  emitTyping();
}

function pruneTyping() {
  const now = Date.now();
  let changed = false;
  typingUntil.forEach((until, id) => {
    if (until <= now) {
      typingUntil.delete(id);
      changed = true;
    }
  });
  if (changed) emitTyping();
}

type TypingPayload = { conversationId?: string; state?: "start" | "stop" };

/**
 * Subscribes to the current user's typing inbox: peers broadcast into
 * `typing:<recipientId>` so one channel covers every conversation.
 * Mount exactly once, at the app shell.
 */
export function useTypingInbox() {
  const { user } = useQueueAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`typing:${user.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { conversationId, state } = (payload ?? {}) as TypingPayload;
        if (!conversationId) return;
        setTypingState(conversationId, state !== "stop");
      })
      .subscribe();

    const interval = window.setInterval(pruneTyping, 500);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
      typingUntil.clear();
      emitTyping();
    };
  }, [user]);
}

/** True while the peer of this conversation is actively typing. */
export function useIsPeerTyping(conversationId: string | null | undefined) {
  return useSyncExternalStore(
    subscribeTyping,
    () => (conversationId ? (typingUntil.get(conversationId) ?? 0) > Date.now() : false),
    () => false,
  );
}

/**
 * Broadcasts this user's typing state into the peer's typing inbox.
 * `notifyTyping()` is throttled and auto-stops after a short idle window;
 * `notifyStopped()` fires immediately (on send, clear, or unmount).
 */
export function useTypingSender(
  conversationId: string | null,
  peerId: string | null | undefined,
  enabled = true,
) {
  const { user } = useQueueAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const idleTimer = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!conversationId || !peerId || !user || !enabled) return;

    const channel = supabase.channel(`typing:${peerId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel.subscribe((status) => setReady(status === "SUBSCRIBED"));

    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
      lastSent.current = 0;
      channelRef.current = null;
      setReady(false);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, peerId, user]);

  const push = useCallback(
    (state: "start" | "stop") => {
      const channel = channelRef.current;
      if (!channel || !conversationId) return;
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { conversationId, state },
      });
    },
    [conversationId],
  );

  const notifyStopped = useCallback(() => {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (lastSent.current === 0) return;
    lastSent.current = 0;
    push("stop");
  }, [push]);

  const notifyTyping = useCallback(() => {
    if (!enabled || !ready) return;
    const now = Date.now();
    if (now - lastSent.current > TYPING_THROTTLE) {
      lastSent.current = now;
      push("start");
    }
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(notifyStopped, TYPING_IDLE);
  }, [enabled, notifyStopped, push, ready]);

  // Always release the signal when leaving the chat.
  useEffect(() => notifyStopped, [notifyStopped]);

  return { notifyTyping, notifyStopped };
}
