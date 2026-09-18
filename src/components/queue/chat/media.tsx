import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import * as Icons from "@phosphor-icons/react";
import {
  ArrowLeft,
  ArrowBendUpLeft,
  PencilSimple,
  Bell,
  BellRinging as BellRing,
  Check,
  Checks as CheckCheck,
  CaretRight as ChevronRight,
  Clock as Clock3,
  WarningCircle as Warning,
  Copy,
  DeviceMobile,
  Camera,
  File as FileIcon,
  Image,
  MapPin,
  Eye,
  EyeSlash as EyeOff,
  Key as KeyRound,
  LockKey as LockKeyhole,
  SignOut as LogOut,
  ChatCircle as MessageCircle,
  Microphone as Mic,
  MicrophoneSlash as MicOff,
  Phone,
  PhoneCall,
  PhoneDisconnect as PhoneOff,
  PhoneIncoming,
  PhoneX as PhoneMissed,
  Play,
  Pause,
  Plus,
  Paperclip,
  FileArrowDown as FileDown,
  ArrowClockwise,
  MagnifyingGlass as Search,
  PaperPlaneTilt as Send,
  SlidersHorizontal as Settings2,
  ShieldCheck,
  User as UserRound,
  VideoCamera as Video,
  VideoCameraSlash as VideoOff,
  SpeakerHigh as Volume2,
  SpeakerSlash as VolumeX,
  ArrowsClockwise,
  X,
  Lightning as Zap,
  PushPin,
  PushPinSlash,
  Trash,
  Prohibit,
  BellSlash,
  LockKeyOpen,
  HardDrives,
} from "@phosphor-icons/react";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { QueueAuthProvider, useQueueAuth, validateUsername, type Profile } from "@/lib/queue-auth";
import {
  clearConversationKeys,
  useCallHistory,
  useConversations,
  useGenerateCode,
  useMarkNotificationsRead,
  useMarkRead,
  useMessages,
  useMyCodes,
  useNotifications,
  usePostStatus,
  useQueueRealtime,
  useRedeemCode,
  useRevokeCode,
  useSendMessage,
  useSendMedia,
  useEditMessage,
  useDeleteForMe,
  useDeleteForEveryone,
  useTogglePinMessage,
  useDecryptedMedia,
  useStatuses,
  useBlockedContacts,
  useBlockContact,
  useUpdateChatSettings,
  useDeleteConversation,
  hashPin,
  MAX_MEDIA_BYTES,
  type ChatMessage,
  type MediaDraft,
  type ConversationRow,
} from "@/lib/queue-data";
import { formatDuration, useCallEngine, type CallKind } from "@/lib/queue-calls";
import {
  lastSeenLabel,
  useIsOnline,
  useIsPeerTyping,
  useQueuePresence,
  useTypingInbox,
  useTypingSender,
} from "@/lib/queue-presence";
import {
  Avatar,
  BottomNav,
  ChatListSkeleton,
  EmptyState,
  Field,
  IconButton,
  Logo,
  MessagesSkeleton,
  PageHeader,
  ScreenMotion,
  TypingIndicator,
} from "../shared/primitives";
import { BottomSheet, ConfirmSheet, TopSheet } from "../overlays/sheets";
import { pressRow, transition } from "../constants";
import { useLocalPref } from "../hooks/use-local-pref";
import {
  clockTime,
  dayKey,
  dayLabel,
  fileKindLabel,
  initialsOf,
  locationFromMessage,
  timeAgo,
} from "../utils/formatting";
import { messageSummary, shortSummary } from "../utils/message-formatting";
import { MediaActionGrid } from "../shared/media-actions";
export function AttachmentActions({
  onCamera,
  onGallery,
  onFile,
  onLocation,
}: {
  onCamera: () => void;
  onGallery: () => void;
  onFile: () => void;
  onLocation: () => void;
}) {
  const actions = [
    { label: "Camera", Icon: Camera, tone: "bg-pastel-blue", action: onCamera },
    { label: "Gallery", Icon: Image, tone: "bg-pastel-yellow", action: onGallery },
    { label: "File", Icon: FileIcon, tone: "bg-pastel-lilac", action: onFile },
    { label: "Location", Icon: MapPin, tone: "bg-pastel-mint", action: onLocation },
  ];
  return <MediaActionGrid actions={actions} />;
}

export function MediaBubble({
  conversationId,
  message,
}: {
  conversationId: string;
  message: ChatMessage;
}) {
  const media = useDecryptedMedia(conversationId, message);
  const isImage = message.kind === "image";
  const isVideo = message.kind === "video";
  const isAudio = message.kind === "audio";
  const src = message.localUrl ?? media.data ?? null;

  if (!src && (media.isPending || media.isLoading)) {
    return (
      <div className="flex min-h-20 min-w-56 items-center gap-3 pb-4">
        <span className="size-9 rounded-full bg-current opacity-10" />
        <div>
          <p className="text-[13px] font-semibold">
            {message.pending === "sending" ? "Sending…" : "Opening…"}
          </p>
          <p className="mt-0.5 max-w-44 truncate text-[10px] opacity-55">{message.text}</p>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => void media.refetch()}
        className="h-auto min-w-56 justify-start gap-3 rounded-xl px-2 py-3 text-left hover:bg-current/5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-current/10">
          <ArrowClockwise className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold">Couldn’t open attachment</span>
          <span className="block truncate text-[10px] opacity-55">Tap to try again</span>
        </span>
      </Button>
    );
  }

  if (isImage) {
    return (
      <div className="w-[min(13.5rem,58vw)] pb-4">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="group/media relative block overflow-hidden rounded-[1rem] bg-muted"
        >
          <img
            src={src}
            alt={message.text}
            className="block h-auto max-h-[17rem] w-full object-contain transition-transform duration-300 group-hover/media:scale-[1.02]"
          />
          <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-1 text-[9px] font-semibold text-paper backdrop-blur-sm">
            Open
          </span>
        </a>
      </div>
    );
  }

  if (isVideo) {
    return <VideoNotePlayer src={src} label={message.text} mine={message.mine} />;
  }

  if (isAudio) {
    return <VoiceNotePlayer src={src} durationMs={message.durationMs} mine={message.mine} />;
  }

  return (
    <a href={src} download={message.text} className="flex min-w-60 items-center gap-3 pb-4 pr-1">
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-xl",
          message.mine ? "bg-paper/12" : "bg-ink/10",
        )}
      >
        <FileIcon className="size-6" weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{message.text}</span>
        <span
          className={cn(
            "mt-0.5 block text-[9px] font-semibold uppercase",
            message.mine ? "text-paper/50" : "text-ink/50",
          )}
        >
          {fileKindLabel(message.text, message.mediaMime)}
        </span>
      </span>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          message.mine ? "bg-paper text-ink" : "bg-ink text-paper",
        )}
      >
        <FileDown className="size-4" />
      </span>
    </a>
  );
}

export function LocationBubble({
  location,
  mine,
}: {
  location: { latitude: number; longitude: number } | null;
  mine: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  if (!location) return null;
  const query = `${location.latitude},${location.longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  // OpenStreetMap static tiles: real map imagery, no API key required.
  const tileUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${query}&zoom=15&size=640x360&maptype=mapnik&markers=${query},red-pushpin`;

  return (
    <a href={mapsUrl} target="_blank" rel="noreferrer" className="block w-[15rem] max-w-full pb-4">
      <span
        className={cn(
          "relative block h-32 overflow-hidden rounded-[1rem]",
          mine ? "bg-paper/10" : "bg-ink/5",
        )}
      >
        {state !== "failed" && (
          <img
            src={tileUrl}
            alt="Map of the shared location"
            loading="lazy"
            onLoad={() => setState("ready")}
            onError={() => setState("failed")}
            className={cn(
              "size-full object-cover transition-opacity duration-500",
              state === "ready" ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        {state !== "ready" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-11 place-items-center rounded-full bg-ink text-paper shadow-soft">
              <MapPin className="size-5" weight="fill" />
            </span>
          </span>
        )}
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-surface/85 px-1.5 py-0.5 text-[8px] font-semibold text-ink/70 backdrop-blur-sm">
          © OpenStreetMap
        </span>
      </span>
      <span className="flex items-center justify-between gap-3 px-1 pt-2.5">
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold">Shared location</span>
          <span
            className={cn(
              "block truncate text-[9px] tabular-nums",
              mine ? "text-paper/50" : "text-ink/50",
            )}
          >
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
        </span>
      </span>
    </a>
  );
}

export function VideoNotePlayer({
  src,
  label,
  mine,
}: {
  src: string;
  label: string;
  mine: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const progress = Math.min(1, currentTime / duration);
  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };
  const seek = (event: MouseEvent<HTMLButtonElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = event.currentTarget.getBoundingClientRect();
    video.currentTime =
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration;
  };
  return (
    <div className="min-w-[15rem] pb-4">
      <div className="relative overflow-hidden rounded-[1rem] bg-ink">
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="block h-auto max-h-60 w-auto max-w-full object-contain"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(Math.max(1, event.currentTarget.duration))}
        />
        <div className="absolute inset-0 grid place-items-center bg-overlay/25">
          <IconButton
            label={playing ? "Pause video" : "Play video"}
            onClick={toggle}
            className="size-12 bg-paper/90 text-ink shadow-soft hover:bg-paper"
          >
            {playing ? (
              <Pause className="size-5" weight="fill" />
            ) : (
              <Play className="ml-0.5 size-5" weight="fill" />
            )}
          </IconButton>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={seek}
          aria-label="Seek video"
          className="absolute inset-x-2 bottom-2 h-5 rounded-full bg-ink/45 p-1 hover:bg-ink/55"
        >
          <span className="h-1 w-full overflow-hidden rounded-full bg-paper/30">
            <span
              className="block h-full rounded-full bg-paper"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
        <span className="max-w-40 truncate text-[10px] font-semibold">{label}</span>
        <span className={cn("text-[9px] tabular-nums", mine ? "text-paper/50" : "text-ink/50")}>
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.ceil(duration))}
        </span>
      </div>
    </div>
  );
}

const WAVE_BUCKETS = 40;
const peakCache = new Map<string, number[]>();

export function VoiceNotePlayer({
  src,
  durationMs,
  mine,
}: {
  src: string;
  durationMs: number | null;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(Math.max(1, Math.round((durationMs ?? 0) / 1000)));
  const [peaks, setPeaks] = useState<number[] | null>(() => peakCache.get(src) ?? null);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  // Decode the note once so every waveform reflects its own loudness.
  useEffect(() => {
    if (peakCache.has(src)) {
      setPeaks(peakCache.get(src)!);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) throw new Error("no audio context");
        const buffer = await (await fetch(src)).arrayBuffer();
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buffer);
        const channel = decoded.getChannelData(0);
        const size = Math.floor(channel.length / WAVE_BUCKETS) || 1;
        const raw: number[] = [];
        for (let i = 0; i < WAVE_BUCKETS; i += 1) {
          let sum = 0;
          const start = i * size;
          for (let j = 0; j < size; j += 1) sum += Math.abs(channel[start + j] ?? 0);
          raw.push(sum / size);
        }
        void ctx.close();
        const loudest = Math.max(...raw, 0.0001);
        const normalised = raw.map((value) => Math.max(0.16, Math.min(1, value / loudest)));
        peakCache.set(src, normalised);
        if (!cancelled) setPeaks(normalised);
      } catch {
        // Decoding is unavailable (or the blob is unreadable): fall back to a calm pattern.
        const fallback = Array.from(
          { length: WAVE_BUCKETS },
          (_, i) => 0.3 + 0.55 * Math.abs(Math.sin(i * 0.7)),
        );
        peakCache.set(src, fallback);
        if (!cancelled) setPeaks(fallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Smooth playhead: driven by rAF rather than timeupdate ticks.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setStarted(true);
      void audio.play();
    } else audio.pause();
  };

  const seekTo = (clientX: number) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const bars = peaks ?? Array.from({ length: WAVE_BUCKETS }, () => 0.45);

  return (
    <div className="flex w-[15.5rem] max-w-full items-center gap-3 pb-4 pt-0.5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration))
            setDuration(Math.max(1, event.currentTarget.duration));
          event.currentTarget.playbackRate = speed;
        }}
      />
      <IconButton
        label={playing ? "Pause voice note" : "Play voice note"}
        onClick={toggle}
        className={cn(
          "size-11 shrink-0 transition-transform active:scale-95",
          mine ? "bg-paper text-ink hover:bg-paper/90" : "bg-ink text-paper hover:bg-ink/85",
        )}
      >
        {playing ? (
          <Pause className="size-4" weight="fill" />
        ) : (
          <Play className="ml-0.5 size-4" weight="fill" />
        )}
      </IconButton>
      <div className="min-w-0 flex-1">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.ceil(duration)}
          aria-valuenow={Math.floor(currentTime)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seekTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) seekTo(event.clientX);
          }}
          onKeyDown={(event) => {
            const audio = audioRef.current;
            if (!audio) return;
            if (event.key === "ArrowRight")
              audio.currentTime = Math.min(duration, audio.currentTime + 2);
            if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 2);
          }}
          className="relative flex h-8 cursor-pointer touch-none items-center gap-[2px] outline-none"
        >
          {bars.map((peak, index) => {
            const barPoint = (index + 0.5) / bars.length;
            const played = barPoint <= progress;
            const active = !reduceMotion && playing && Math.abs(barPoint - progress) < 0.05;
            return (
              <span
                key={index}
                style={{ height: `${Math.round(peak * 26)}px` }}
                className={cn(
                  "w-[3px] flex-1 origin-center rounded-full transition-[transform,background-color] duration-200",
                  active && "scale-y-125",
                  played ? (mine ? "bg-paper" : "bg-ink") : mine ? "bg-paper/30" : "bg-ink/25",
                )}
              />
            );
          })}
          <span
            aria-hidden
            style={{ left: `calc(${progress * 100}% - 5px)` }}
            className={cn(
              "pointer-events-none absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full shadow-soft transition-opacity",
              mine ? "bg-paper" : "bg-ink",
              started ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        <span className="flex items-center justify-end gap-2">
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
              aria-label={`Playback speed ${speed}x`}
              className={cn(
                "rounded-full px-1.5 py-[1px] text-[9px] font-bold tabular-nums transition-colors",
                mine ? "bg-paper/15 text-paper/80" : "bg-ink/8 text-ink/70",
              )}
            >
              {speed}x
            </button>
            <span className={cn("text-[9px] tabular-nums", mine ? "text-paper/55" : "text-ink/55")}>
              {formatDuration(Math.floor(started || playing ? currentTime : duration))}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
