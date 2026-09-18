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
export function CallsScreen({
  conversations,
  onCall,
  onConnect,
}: {
  conversations: ConversationRow[];
  onCall: (conversation: ConversationRow, kind: CallKind) => void;
  onConnect: () => void;
}) {
  const { user } = useQueueAuth();
  const history = useCallHistory();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<ConversationRow | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef as RefObject<HTMLElement> });
  const stripOpacity = useTransform(scrollY, [0, 118], [1, 0]);
  const stripScale = useTransform(scrollY, [0, 154], [1, 0.92]);
  const stripLift = useTransform(scrollY, [0, 154], [0, -16]);
  const stripHeight = useTransform(scrollY, [0, 154], [154, 0]);
  const historyScrollHandoff = useTransform(scrollY, [0, 154], [0, 154]);
  const peerName = (id: string) => {
    const match = conversations.find((c) => c.peer?.id === id);
    return match?.peer?.display_name || match?.peer?.username || "Queue contact";
  };
  const quickCalls = (history.data ?? []).reduce<ConversationRow[]>((items, call) => {
    const other = call.caller_id === user?.id ? call.callee_id : call.caller_id;
    const conversation = conversations.find((entry) => entry.peer?.id === other);
    if (conversation && !items.some((entry) => entry.id === conversation.id) && items.length < 4) {
      items.push(conversation);
    }
    return items;
  }, []);

  return (
    <ScreenMotion className="relative flex min-h-0 flex-col overflow-hidden bg-ink text-paper">
      <header className="z-30 shrink-0 bg-ink px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-pastel-yellow shadow-soft">
            <Logo size="sm" />
          </span>
          <h1 className="font-display text-lg font-semibold tracking-tight">Queue</h1>
        </div>
      </header>
      <motion.section
        style={{
          height: stripHeight,
          ...(reduceMotion ? {} : { opacity: stripOpacity, scale: stripScale, y: stripLift }),
        }}
        className="z-0 shrink-0 origin-top overflow-hidden px-5 pt-4 will-change-transform"
        aria-label="Quick calls"
      >
        <div className="h-[138px] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Call again</h2>
            <span className="text-[10px] text-paper/45">{quickCalls.length} recent</span>
          </div>
          <div className="no-scrollbar flex gap-5 overflow-x-auto pb-3">
            <Button
              variant="ghost"
              onClick={() => (conversations.length ? setPickerOpen(true) : onConnect())}
              className="h-auto shrink-0 flex-col gap-2 rounded-2xl p-0 text-paper hover:bg-transparent"
            >
              <span className="grid size-14 place-items-center rounded-full border-2 border-dashed border-paper/25">
                <Plus weight="regular" className="size-5" />
              </span>
              <span className="max-w-14 truncate text-[10px] font-medium text-paper/55">
                New call
              </span>
            </Button>
            {quickCalls.map((conversation) => (
              <Button
                key={conversation.id}
                variant="ghost"
                onClick={() => setCallTarget(conversation)}
                className="h-auto shrink-0 flex-col gap-2 rounded-2xl p-0 text-paper hover:bg-transparent"
              >
                <span className="rounded-full border-2 border-paper/15 p-0.5">
                  <Avatar
                    initials={initialsOf(
                      conversation.peer?.display_name ?? conversation.peer?.username,
                    )}
                    tone={conversation.peer?.tone ?? "bg-pastel-lilac"}
                  />
                </span>
                <span className="max-w-14 truncate text-[10px] font-medium text-paper/55">
                  {conversation.peer?.display_name || conversation.peer?.username || "Contact"}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </motion.section>
      <div className="relative isolate z-10 flex min-h-0 flex-1 transform-gpu flex-col overflow-hidden rounded-t-[2.5rem] bg-surface pt-4 text-foreground shadow-sheet [backface-visibility:hidden]">
        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 flex-1 overscroll-contain overflow-y-auto pb-28"
        >
           <motion.div className="min-h-[calc(100%+154px)]" style={{ y: historyScrollHandoff }}>
            {history.isLoading ? (
              <ChatListSkeleton />
            ) : (history.data ?? []).length === 0 ? (
              <EmptyState
                icon={<PhoneCall className="size-7" weight="fill" />}
                title="No calls yet"
                body={
                  conversations.length === 0
                    ? "Connect with someone first, then call them straight from your Queue."
                    : "Pick a contact above to start your first call."
                }
              />
            ) : (
              <div className="px-3">
                {(history.data ?? []).map((call) => {
                  const outgoing = call.caller_id === user?.id;
                  const other = outgoing ? call.callee_id : call.caller_id;
                  const missed = call.status === "missed" || call.status === "declined";
                  const Icon = missed ? PhoneMissed : call.kind === "video" ? Video : PhoneIncoming;
                  return (
                    <Button
                      key={call.id}
                      variant="ghost"
                      onClick={() => {
                        const conversation = conversations.find(
                          (entry) => entry.peer?.id === other,
                        );
                        if (conversation) setCallTarget(conversation);
                      }}
                      className={cn(
                        "h-auto w-full justify-start gap-3 rounded-full px-3 py-3 text-left",
                        pressRow,
                      )}
                    >
                      <Avatar initials={initialsOf(peerName(other))} tone="bg-pastel-blue" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-display text-sm font-semibold",
                            missed && "text-destructive",
                          )}
                        >
                          {peerName(other)}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                          <Icon className="size-3" />
                          {outgoing ? "Outgoing" : "Incoming"} {call.kind} ·{" "}
                          {missed ? call.status : formatDuration(call.duration_seconds)}
                        </p>
                      </div>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {timeAgo(call.created_at)}
                      </span>
                      <Phone className="size-4 shrink-0" />
                    </Button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        {pickerOpen && (
          <BottomSheet kind="call" onClose={() => setPickerOpen(false)}>
            <div>
              <h2 className="font-display text-xl font-semibold">Start a call</h2>
              <div className="mt-3 max-h-[calc(90dvh-8.5rem)] space-y-1 overflow-y-auto pb-1">
                {conversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant="ghost"
                    onClick={() => {
                      setPickerOpen(false);
                      setCallTarget(conversation);
                    }}
                    className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-muted/65 px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <Avatar
                      initials={initialsOf(
                        conversation.peer?.display_name ?? conversation.peer?.username,
                      )}
                      tone={conversation.peer?.tone ?? "bg-pastel-lilac"}
                      size="sm"
                    />
                    <span className="truncate font-display text-sm font-semibold">
                      {conversation.peer?.display_name || conversation.peer?.username || "Contact"}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          </BottomSheet>
        )}
        {callTarget && (
          <BottomSheet kind="call" onClose={() => setCallTarget(null)}>
            <div>
              <h2 className="truncate font-display text-xl font-semibold">
                Call {callTarget.peer?.display_name || callTarget.peer?.username || "contact"}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    const target = callTarget;
                    setCallTarget(null);
                    onCall(target, "audio");
                  }}
                  className="h-13 rounded-2xl bg-ink text-paper hover:bg-ink/85"
                >
                  <Phone className="size-5" />
                  Voice call
                </Button>
                <Button
                  onClick={() => {
                    const target = callTarget;
                    setCallTarget(null);
                    onCall(target, "video");
                  }}
                  className="h-13 rounded-2xl bg-pastel-blue text-ink hover:bg-pastel-blue/85"
                >
                  <Video className="size-5" />
                  Video call
                </Button>
              </div>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </ScreenMotion>
  );
}

export function CallOverlay({ engine }: { engine: ReturnType<typeof useCallEngine> }) {
  const { call, seconds, muted, speaker, cameraOff, localStream, remoteStream } = engine;
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, remoteStream]);

  if (!call) return null;
  const video = call.kind === "video";

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex justify-center bg-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section
        aria-live="polite"
        className="relative flex h-dvh w-full max-w-[430px] flex-col bg-ink text-paper"
      >
        <audio ref={audioRef} autoPlay />
        {video && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-cover opacity-90"
          />
        )}
        {video && localStream && !cameraOff && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute right-4 top-[max(1.5rem,env(safe-area-inset-top))] z-10 h-40 w-28 rounded-3xl object-cover shadow-app"
          />
        )}

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="mb-7 flex items-center gap-1.5 text-[10px] font-semibold text-paper/50">
            <span className="size-1.5 rounded-full bg-online" />
            Private Queue call
          </span>
          {!(video && remoteStream) && (
            <div className="relative mx-auto w-fit">
              <motion.div
                animate={{
                  scale: call.phase === "connected" ? 1 : [1, 1.28, 1],
                  opacity: call.phase === "connected" ? 0 : [0.25, 0, 0.25],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-pastel-lilac"
              />
              <div className="relative grid size-24 place-items-center rounded-full bg-pastel-lilac font-display text-xl font-semibold text-ink">
                {initialsOf(call.peerName)}
              </div>
            </div>
          )}
          <h2 className="mt-5 font-display text-2xl font-semibold">{call.peerName}</h2>
          <p className="mt-1 text-xs font-medium text-paper/55">
            {call.phase === "incoming"
              ? `Incoming ${call.kind} call`
              : call.phase === "outgoing"
                ? "Calling securely…"
                : call.phase === "connected"
                  ? `Connected · ${formatDuration(seconds)}`
                  : "Call ended"}
          </p>
          {engine.error && (
            <p className="mt-3 text-xs font-semibold text-pastel-blush">{engine.error}</p>
          )}
        </div>

        <div className="relative z-10 rounded-t-[2.5rem] bg-surface px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-6 text-foreground shadow-sheet">
          <div className="mx-auto mb-7 h-1 w-10 rounded-full bg-border" />
          {call.phase === "incoming" ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => void engine.endCall("declined")}
                className="h-14 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/85"
              >
                <PhoneOff weight="fill" />
                Decline
              </Button>
              <Button
                onClick={() => void engine.answerCall()}
                className="h-14 rounded-full bg-online text-ink hover:bg-online/85"
              >
                <Phone weight="fill" />
                Answer
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              <IconButton
                label={muted ? "Unmute" : "Mute"}
                onClick={engine.toggleMute}
                className={cn(
                  "mx-auto size-12",
                  muted ? "bg-ink text-paper hover:bg-ink/85" : "bg-muted hover:bg-muted/70",
                )}
              >
                {muted ? <MicOff weight="fill" /> : <Mic />}
              </IconButton>
              <IconButton
                label={speaker ? "Turn speaker off" : "Turn speaker on"}
                onClick={engine.toggleSpeaker}
                className={cn(
                  "mx-auto size-12",
                  speaker ? "bg-ink text-paper hover:bg-ink/85" : "bg-muted hover:bg-muted/70",
                )}
              >
                {speaker ? <Volume2 weight="fill" /> : <VolumeX />}
              </IconButton>
              <IconButton
                label={cameraOff ? "Turn camera on" : "Turn camera off"}
                onClick={engine.toggleCamera}
                disabled={!video}
                className={cn(
                  "mx-auto size-12",
                  cameraOff ? "bg-ink text-paper hover:bg-ink/85" : "bg-muted hover:bg-muted/70",
                )}
              >
                {cameraOff ? <VideoOff weight="fill" /> : <Video />}
              </IconButton>
              <IconButton
                label="Switch camera"
                onClick={() => void engine.switchCamera()}
                disabled={!video}
                className="mx-auto size-12 bg-muted hover:bg-muted/70"
              >
                <ArrowsClockwise />
              </IconButton>
              <IconButton
                label="End call"
                onClick={() => void engine.endCall()}
                className="mx-auto size-12 bg-destructive text-destructive-foreground hover:bg-destructive/85"
              >
                <PhoneOff weight="fill" />
              </IconButton>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
