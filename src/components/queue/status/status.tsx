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
  TextT,
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
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  useStatusMedia,
  useMarkStatusSeen,
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
function StatusMedia({
  path,
  mime,
  kind,
  paused,
  onEnded,
  onProgress,
  onReady,
}: {
  path: string;
  mime: string | null;
  kind: string | null;
  paused: boolean;
  onEnded: () => void;
  onProgress?: (value: number) => void;
  onReady?: () => void;
}) {
  const media = useStatusMedia(path);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, media.data]);
  if (!media.data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-ink/20 border-t-ink/70" />
      </div>
    );
  }
  const isVideo = kind === "video" || (mime ?? "").startsWith("video/");
  return isVideo ? (
    <video
      ref={videoRef}
      key={media.data}
      src={media.data}
      className="absolute inset-0 size-full object-cover"
      autoPlay
      playsInline
      muted={false}
      onEnded={onEnded}
      onPlaying={onReady}
      onTimeUpdate={(event) => {
        const video = event.currentTarget;
        // The bar follows the real playback position, so it can never race the video.
        if (video.duration > 0) onProgress?.(Math.min(1, video.currentTime / video.duration));
      }}
    />
  ) : (
    <img
      key={media.data}
      src={media.data}
      alt="Status photo"
      className="absolute inset-0 size-full object-cover"
      onLoad={onReady}
    />
  );
}


export function StatusViewer({
  index,
  onChange,
  onClose,
}: {
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const statuses = useStatuses();
  const markSeen = useMarkStatusSeen();
  const queryClient = useQueryClient();
  // Freeze the list for the length of the session so marking statuses as read
  // (which re-sorts unseen-first) can't shuffle the story we're playing.
  const [list] = useState(() => statuses.data ?? []);
  const status = list[index];
  const personList = status ? list.filter((item) => item.user_id === status.user_id) : [];
  const personIndex = status ? personList.findIndex((item) => item.id === status.id) : -1;
  const seenRef = useRef<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!status || seenRef.current.has(status.id)) return;
    seenRef.current.add(status.id);
    markSeen.mutate(status.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.id]);

  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: ["statuses"] });
    },
    [queryClient],
  );

  const goNext = () => {
    setDirection(1);
    if (index < list.length - 1) onChange(index + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index <= 0) return;
    setDirection(-1);
    onChange(index - 1);
  };
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const isVideoStatus =
    status?.media_kind === "video" || (status?.media_mime ?? "").startsWith("video/");
  const statusHasMedia = Boolean(status?.media_path);

  // One number drives the one active bar, so two timelines can never run at once.
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    setReady(!statusHasMedia);
    setPaused(false);
  }, [index, statusHasMedia]);

  useEffect(() => {
    if (!status || isVideoStatus || !ready || paused) return;
    let frame = 0;
    const start = performance.now() - progressRef.current * 5000;
    const tick = (now: number) => {
      const value = Math.min(1, (now - start) / 5000);
      progressRef.current = value;
      setProgress(value);
      if (value < 1) frame = requestAnimationFrame(tick);
      else goNextRef.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, status?.id, isVideoStatus, ready, paused]);

  if (!status) return null;
  const name = status.profile?.display_name || status.profile?.username || "Queue contact";
  const hasMedia = statusHasMedia;
  const statusTextSize = hasMedia
    ? status.note.length > 500
      ? "text-[10px] leading-4"
      : status.note.length > 220
        ? "text-xs leading-snug"
        : "text-base leading-snug"
    : status.note.length > 700
      ? "text-sm leading-snug"
      : status.note.length > 400
        ? "text-base leading-snug"
        : status.note.length > 180
          ? "text-lg leading-7"
          : status.note.length > 80
            ? "text-xl leading-tight"
            : "text-2xl leading-tight";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex justify-center overflow-hidden bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
    >
      <div className="relative h-dvh w-full max-w-[430px] overflow-hidden">
        <motion.section
          aria-label={`${name}'s status`}
          className={cn(
            "absolute inset-0 flex touch-pan-y flex-col overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
            hasMedia ? "text-paper" : "text-ink",
          )}
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onDragEnd={(_, info) => {
            const swipe = Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 520;
            if (!swipe) return;
            if (info.offset.x < 0) goNext();
            else goPrev();
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <motion.div
              key={`backdrop-${status.id}`}
              custom={direction}
              className={cn("absolute inset-0", hasMedia ? "bg-ink" : status.tone)}
              variants={{
                enter: { opacity: reduceMotion ? 1 : 0 },
                active: { opacity: 1 },
                exit: { opacity: reduceMotion ? 1 : 0 },
              }}
              initial="enter"
              animate="active"
              exit="exit"
              transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }}
            >
              {hasMedia && status.media_path ? (
                <StatusMedia
                  path={status.media_path}
                  mime={status.media_mime}
                  kind={status.media_kind}
                  paused={paused}
                  onEnded={goNext}
                  onProgress={(value) => {
                    progressRef.current = value;
                    setProgress(value);
                  }}
                  onReady={() => setReady(true)}
                />
              ) : null}
              {hasMedia && <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />}
            </motion.div>
          </AnimatePresence>
            <div className="relative z-20 flex gap-1 pt-1">
              {personList.map((item, itemIndex) => {
                const fill = itemIndex < personIndex ? 1 : itemIndex === personIndex ? progress : 0;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "h-0.5 flex-1 overflow-hidden rounded-full",
                      hasMedia ? "bg-paper/25" : "bg-ink/15",
                    )}
                  >
                    <div
                      className={cn(
                        "h-full w-full origin-left rounded-full",
                        hasMedia ? "bg-paper" : "bg-ink",
                      )}
                      style={{ transform: `scaleX(${fill})` }}
                    />
                  </div>
                );
              })}
            </div>

            <header className="relative z-20 mt-3 flex items-center gap-2.5">
              <Avatar initials={initialsOf(name)} tone="bg-paper" size="sm" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-sm font-semibold">{name}</h2>
                <p className={cn("text-[10px]", hasMedia ? "text-paper/65" : "text-ink/55")}>
                  {timeAgo(status.created_at)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close status"
                onClick={onClose}
                className={cn(
                  "size-10 shrink-0 rounded-full",
                  hasMedia ? "text-paper hover:bg-paper/10 hover:text-paper" : "text-ink hover:bg-ink/10 hover:text-ink",
                )}
              >
                <X className="size-5" />
              </Button>
            </header>
            <div className="relative flex min-h-0 flex-1 items-stretch justify-center">
              <Button
                type="button"
                variant="ghost"
                aria-label="Previous status"
                onClick={goPrev}
                disabled={index <= 0}
                className="absolute inset-y-0 left-0 z-10 h-full w-1/3 cursor-default rounded-none opacity-0"
              />
              <AnimatePresence initial={false} custom={direction} mode="sync">
                {status.note ? (
                  <motion.div
                    key={`note-${status.id}`}
                    custom={direction}
                    className={cn(
                      "no-scrollbar pointer-events-none relative z-20 flex min-h-0 w-full items-center justify-center overflow-y-auto",
                      hasMedia ? "items-end pb-6" : "",
                    )}
                    variants={{
                      enter: { opacity: reduceMotion ? 1 : 0 },
                      active: { opacity: 1 },
                      exit: { opacity: reduceMotion ? 1 : 0 },
                    }}
                    initial="enter"
                    animate="active"
                    exit="exit"
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }}
                  >
                    <p
                      className={cn(
                        "w-full whitespace-pre-wrap break-words text-center font-display font-semibold",
                        statusTextSize,
                      )}
                    >
                      {status.note}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <Button
                type="button"
                variant="ghost"
                aria-label="Next status"
                onClick={goNext}
                className="absolute inset-y-0 right-0 z-10 h-full w-2/3 cursor-default rounded-none opacity-0"
              />
            </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

export function StatusSheet({ onDone }: { onDone: () => void }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [tone, setTone] = useState("bg-pastel-mint");
  const inputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const post = usePostStatus();
  const tones = ["bg-pastel-mint", "bg-pastel-yellow", "bg-pastel-blue", "bg-pastel-lilac", "bg-pastel-blush"];

  useEffect(() => {
    if (!textEditorOpen) return;
    const frame = requestAnimationFrame(() => noteRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [textEditorOpen]);

  const pick = (selected: File | null) => {
    setFile(selected);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return selected ? URL.createObjectURL(selected) : null;
    });
  };

  const isVideo = Boolean(file?.type.startsWith("video/"));
  const editorTextSize =
    note.length > 700
      ? "text-sm leading-snug"
      : note.length > 400
        ? "text-base leading-snug"
        : note.length > 180
          ? "text-lg leading-7"
          : note.length > 80
            ? "text-xl leading-tight"
            : "text-2xl leading-tight";

  const submit = async () => {
    if (!note.trim() && !file) return;
    await post.mutateAsync(file ? { note, file } : { note, tone });
    pick(null);
    onDone();
  };

  const textEditor = textEditorOpen
    ? createPortal(
        <motion.form
          aria-label="Text status editor"
          className={cn(
            "fixed inset-0 z-[80] mx-auto flex h-dvh w-full max-w-[430px] flex-col text-ink",
            tone,
          )}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          onSubmit={async (event) => {
            event.preventDefault();
            await submit();
          }}
        >
          <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Back to status choices"
              onClick={() => {
                setNote("");
                setTextEditorOpen(false);
              }}
              className="size-11 rounded-full bg-transparent hover:bg-transparent active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </Button>
          <span className="mr-3 min-w-16 text-right text-xs font-semibold tabular-nums text-ink/55">
             {note.length}/1000
          </span>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-2">
          <textarea
            ref={noteRef}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            aria-label="Status text"
            placeholder="Type a status"
            rows={1}
            className={cn(
              "no-scrollbar h-full min-h-0 w-full resize-none content-center overflow-y-auto whitespace-pre-wrap break-words bg-transparent text-center font-display font-semibold text-ink outline-none placeholder:text-ink/35",
              editorTextSize,
            )}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <div className="flex items-center gap-2" aria-label="Status background">
              {tones.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Use ${item.replace("bg-pastel-", "")} background`}
                  aria-pressed={tone === item}
                  onClick={() => setTone(item)}
                  className={cn(
                    "size-8 rounded-full border-2 p-0 hover:bg-transparent",
                    item,
                    tone === item ? "border-ink" : "border-ink/15",
                  )}
                />
              ))}
            </div>
            <Button
              type="submit"
              size="icon"
              aria-label="Share text status"
              disabled={post.isPending || !note.trim()}
              className="size-8 shrink-0 rounded-full p-0 shadow-soft"
            >
              {post.isPending ? <ArrowsClockwise className="size-4 animate-spin" /> : <Send weight="fill" className="size-4" />}
            </Button>
          </footer>
          {post.isError ? (
            <p className="px-5 pb-3 text-center text-xs font-semibold text-destructive">
              {(post.error as Error).message}
            </p>
          ) : null}
        </motion.form>,
        document.body,
      )
    : null;

  return (
    <>
      <form
        onSubmit={async (event) => {
        event.preventDefault();
        await submit();
      }}
      >
      <p className="text-xs font-semibold text-muted-foreground">Visible for 24 hours</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Share a status</h2>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-muted">
          {isVideo ? (
            <video src={previewUrl} className="h-48 w-full object-cover" muted playsInline controls />
          ) : (
            <img src={previewUrl} alt="Status preview" className="h-48 w-full object-cover" />
          )}
          <button
            type="button"
            aria-label="Remove media"
            onClick={() => pick(null)}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-ink/70 text-paper"
          >
            <X weight="regular" className="size-4" />
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-muted/45 px-2 pt-2">
          <MediaActionGrid
            actions={[
              {
                label: "Gallery",
                Icon: Image,
                tone: "bg-pastel-yellow",
                action: () => {
                  inputRef.current?.removeAttribute("capture");
                  inputRef.current?.click();
                },
              },
              {
                label: "Camera",
                Icon: Camera,
                tone: "bg-pastel-blue",
                action: () => {
                  inputRef.current?.setAttribute("capture", "environment");
                  inputRef.current?.click();
                },
              },
              {
                label: "Text",
                Icon: TextT,
                tone: "bg-pastel-mint",
                 action: () => setTextEditorOpen(true),
              },
            ]}
          />
        </div>
      )}

      {file ? (
        <>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            placeholder="Add a caption (optional)"
            className="mt-3 h-14 rounded-2xl bg-muted px-4"
          />
          <Button
            type="submit"
            disabled={post.isPending}
            className="mt-4 h-12 w-full rounded-full"
          >
            {post.isPending ? "Sharing…" : "Share status"}
            <Check />
          </Button>
          {post.isError ? (
            <p className="mt-2 text-center text-xs text-destructive">
              {(post.error as Error).message}
            </p>
          ) : null}
        </>
      ) : null}
      </form>
      {textEditor}
    </>
  );
}
