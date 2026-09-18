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
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { SwipeableMessage, MessageDeleteChoice, PinnedBar } from "./message-parts";
import { AttachmentActions, MediaBubble, LocationBubble } from "./media";
export function ChatScreen({
  conversation,
  onBack,
  onCall,
}: {
  conversation: ConversationRow;
  onBack: () => void;
  onCall: (kind: CallKind) => void;
}) {
  const [text, setText] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [micHint, setMicHint] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordDragX, setRecordDragX] = useState(0);
  // live loudness of the note being recorded, newest value last
  const [recordLevels, setRecordLevels] = useState<number[]>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; everyone: boolean } | null>(
    null,
  );
  const [deleteChoice, setDeleteChoice] = useState<string[] | null>(null);

  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [pinIndex, setPinIndex] = useState(0);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  // Cancelling must win even though the recorder emits one last chunk on stop.
  const recordCancelled = useRef(false);
  const recordStartedAt = useRef(0);
  const micHoldTimer = useRef<number | null>(null);
  const micHintTimer = useRef<number | null>(null);
  const micHeld = useRef(false);
  const micStartX = useRef(0);
  const discardRecording = useRef(false);
  const finishMicHold = useRef<(cancel?: boolean) => void>(() => undefined);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bubbleRefs = useRef(new Map<string, HTMLDivElement>());
  const reduceMotion = useReducedMotion();
  const messages = useMessages(conversation.id);
  const send = useSendMessage(conversation.id, conversation.peer);
  const sendMedia = useSendMedia(conversation.id, conversation.peer);
  const markRead = useMarkRead(conversation.id);
  const editMessage = useEditMessage(conversation.id);
  const deleteForMe = useDeleteForMe(conversation.id);
  const deleteForEveryone = useDeleteForEveryone(conversation.id);
  const togglePin = useTogglePinMessage(conversation.id);
  const [typingEnabled] = useLocalPref("typing", true);
  const typing = useIsPeerTyping(conversation.id);
  const peerOnline = useIsOnline(conversation.peer?.id);
  const { notifyTyping, notifyStopped } = useTypingSender(
    conversation.id,
    conversation.peer?.id,
    typingEnabled,
  );
  const peerName =
    conversation.peer?.display_name || conversation.peer?.username || "Queue contact";

  const list = useMemo(() => messages.data ?? [], [messages.data]);
  const byId = useMemo(() => new Map(list.map((item) => [item.id, item])), [list]);
  const pins = useMemo(() => list.filter((item) => item.pinned && !item.deletedAt), [list]);
  const replyTarget = replyTo ? byId.get(replyTo) : null;
  const editingMessage = editing ? byId.get(editing) : null;
  // Selection: long press starts it, extra taps add or remove messages.
  const selected = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter(Boolean) as ChatMessage[],
    [selectedIds, byId],
  );
  const selectionActive = selected.length > 0;
  const singleSelected = selected.length === 1 ? selected[0] : null;
  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const clearSelection = () => setSelectedIds([]);

  useEffect(() => {
    void markRead();
  }, [markRead, messages.data?.length]);

  // Leaving the conversation must never carry a half-finished edit or reply over.
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    setSelectedIds([]);

    setConfirmDelete(null);
    setDeleteChoice(null);
    setPinIndex(0);
    setText("");
  }, [conversation.id]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(
    () => () => {
      if (micHoldTimer.current !== null) window.clearTimeout(micHoldTimer.current);
      if (micHintTimer.current !== null) window.clearTimeout(micHintTimer.current);
    },
    [],
  );

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!micHeld.current) return;
      const drag = Math.min(0, Math.max(-104, event.clientX - micStartX.current));
      discardRecording.current = drag <= -72;
      setRecordDragX(drag);
    };
    const release = () => finishMicHold.current(discardRecording.current);
    const cancel = () => finishMicHold.current(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  // Grow the composer up to roughly five lines, then scroll inside it.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 124)}px`;
  }, [text]);

  const jumpTo = (id: string) => {
    const node = bubbleRefs.current.get(id);
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    setHighlighted(id);
    window.setTimeout(() => setHighlighted((current) => (current === id ? null : current)), 1600);
  };

  const retries = useRef(new Map<string, () => void>());

  const sendText = (
    value: string,
    tempId = crypto.randomUUID(),
    replyToId: string | null = null,
  ) => {
    retries.current.set(tempId, () => sendText(value, tempId, replyToId));
    send.mutate({ text: value, tempId, replyToId });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (editing) {
      const id = editing;
      setEditing(null);
      setText("");
      notifyStopped();
      editMessage.mutate({ messageId: id, text: value });
      return;
    }
    const quoted = replyTo;
    setText("");
    setReplyTo(null);
    notifyStopped();
    sendText(value, undefined, quoted);
  };

  const sendDraft = (draft: Omit<MediaDraft, "tempId">, tempId = crypto.randomUUID()) => {
    const full = { ...draft, tempId };
    notifyStopped();
    retries.current.set(tempId, () => sendDraft(draft, tempId));
    setMediaError(null);
    sendMedia.mutate(full, {
      onError: (error) =>
        setMediaError(error instanceof Error ? error.message : "Could not send that attachment."),
    });
  };

  const retry = (id: string) => retries.current.get(id)?.();

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    sendDraft({
      file,
      name: file.name,
      mime: file.type || "application/octet-stream",
      kind: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file",
    });
  };

  const startRecording = async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];

      // live level meter for the recording bar
      let frame = 0;
      let ctx: AudioContext | null = null;
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          let tick = 0;
          const read = () => {
            analyser.getByteTimeDomainData(data);
            if (tick % 4 === 0) {
              let peak = 0;
              for (let i = 0; i < data.length; i += 1)
                peak = Math.max(peak, Math.abs((data[i] ?? 128) - 128) / 128);
              setRecordLevels((prev) =>
                [...prev, Math.max(0.12, Math.min(1, peak * 1.8))].slice(-28),
              );
            }
            tick += 1;
            frame = window.requestAnimationFrame(read);
          };
          frame = window.requestAnimationFrame(read);
        }
      } catch {
        // level meter is decorative; recording continues without it
      }

      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        if (frame) window.cancelAnimationFrame(frame);
        void ctx?.close();
        stream.getTracks().forEach((t) => t.stop());
        const cancelled = recordCancelled.current;
        const seconds = Math.max(1, Math.round((Date.now() - recordStartedAt.current) / 1000));
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        chunks.current = [];
        setRecording(false);
        setRecordSeconds(0);
        setRecordLevels([]);
        if (cancelled || blob.size < 500) return;
        sendDraft({
          file: blob,
          name: "Voice note",
          mime: blob.type,
          kind: "audio",
          durationMs: seconds * 1000,
        });
      };
      recorder.current = mr;
      recordCancelled.current = false;
      recordStartedAt.current = Date.now();
      setRecordSeconds(0);
      setRecordLevels([]);
      setRecordDragX(0);
      discardRecording.current = false;
      setRecording(true);
      mr.start();
    } catch {
      setMediaError("Microphone permission is needed to record a voice note.");
    }
  };

  const stopRecording = (cancel = false) => {
    const mr = recorder.current;
    if (!mr) return;
    recordCancelled.current = cancel;
    recorder.current = null;
    if (mr.state !== "inactive") mr.stop();
    else setRecording(false);
  };

  const showMicHint = () => {
    setMicHint(true);
    if (micHintTimer.current !== null) window.clearTimeout(micHintTimer.current);
    micHintTimer.current = window.setTimeout(() => setMicHint(false), 1800);
  };

  const beginMicHold = (clientX: number) => {
    micHeld.current = true;
    micStartX.current = clientX;
    discardRecording.current = false;
    setRecordDragX(0);
    showMicHint();
    if (micHoldTimer.current !== null) window.clearTimeout(micHoldTimer.current);
    micHoldTimer.current = window.setTimeout(() => {
      micHoldTimer.current = null;
      if (!micHeld.current) return;
      setMicHint(false);
      void startRecording().then(() => {
        if (!micHeld.current) stopRecording(false);
      });
    }, 320);
  };

  const endMicHold = (cancel = false) => {
    micHeld.current = false;
    discardRecording.current = false;
    setRecordDragX(0);
    if (micHoldTimer.current !== null) {
      window.clearTimeout(micHoldTimer.current);
      micHoldTimer.current = null;
      showMicHint();
      return;
    }
    stopRecording(cancel);
  };
  finishMicHold.current = endMicHold;


  const shareLocation = () => {
    setAttachmentsOpen(false);
    setMediaError(null);
    if (!navigator.geolocation) {
      setMediaError("Location sharing is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        sendText(
          `📍 My location\nhttps://www.google.com/maps?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`,
        );
      },
      () => setMediaError("Location permission is needed to share your location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Actions shown in the header while messages are selected.
  type BarAction = {
    label: string;
    Icon: typeof Copy;
    action: () => void;
    danger?: boolean;
  };
  const messageBarActions: BarAction[] = [];
  if (selectionActive) {
    const single = singleSelected;
    const copyable = selected.filter((item) => item.kind === "text" && !item.deletedAt);
    if (single && !single.deletedAt) {
      messageBarActions.push({
        label: "Reply",
        Icon: ArrowBendUpLeft,
        action: () => {
          setEditing(null);
          setReplyTo(single.id);
          clearSelection();
          textareaRef.current?.focus();
        },
      });
    }
    if (copyable.length > 0) {
      messageBarActions.push({
        label: "Copy",
        Icon: Copy,
        action: () => {
          void navigator.clipboard?.writeText(copyable.map((item) => item.text).join("\n\n"));
          clearSelection();
        },
      });
    }
    if (single && single.mine && single.kind === "text" && !single.deletedAt && !single.pending) {
      messageBarActions.push({
        label: "Edit",
        Icon: PencilSimple,
        action: () => {
          setReplyTo(null);
          setEditing(single.id);
          setText(single.text);
          clearSelection();
          window.setTimeout(() => textareaRef.current?.focus(), 80);
        },
      });
    }
    const pinnable = selected.filter((item) => !item.deletedAt);
    if (pinnable.length > 0) {
      const allPinned = pinnable.every((item) => item.pinned);
      messageBarActions.push({
        label: allPinned ? "Unpin" : "Pin",
        Icon: allPinned ? PushPinSlash : PushPin,
        action: () => {
          pinnable.forEach((item) => {
            if (Boolean(item.pinned) === allPinned) {
              togglePin.mutate({ messageId: item.id, pinned: allPinned });
            }
          });
          clearSelection();
        },
      });
    }
    messageBarActions.push({
      label: "Delete",
      Icon: Trash,
      danger: true,
      action: () => setDeleteChoice(selectedIds),
    });
  }

  return (
    <ScreenMotion className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-chat">
      <header
        className="relative z-20 grid min-h-[4.75rem] w-full shrink-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-1 rounded-b-[1.4rem] bg-pastel-blue px-3 pb-2.5 pt-2 text-ink shadow-soft"
      >
        {selectionActive ? (
          <>
            <IconButton
              label="Cancel selection"
              onClick={clearSelection}
              className="size-9 bg-transparent text-ink hover:bg-surface/45"
            >
              <X className="size-[17px]" weight="regular" />
            </IconButton>
            <p className="min-w-0 truncate pl-0.5 font-display text-[13px] font-semibold text-ink/85 tabular-nums">
              {selected.length} selected
            </p>

            <div className="flex shrink-0 items-center justify-end">
              {messageBarActions.map(({ label, Icon, action, danger }) => (
                <IconButton
                  key={label}
                  label={label}
                  onClick={action}
                  className={cn(
                    "size-9 bg-transparent text-ink hover:bg-surface/45",
                    danger && "text-destructive hover:bg-destructive/15",
                  )}
                >
                  <Icon className="size-[17px]" />
                </IconButton>
              ))}
            </div>
          </>
        ) : (
          <>
            <IconButton
              label="Back"
              onClick={onBack}
              className="size-9 bg-transparent text-ink hover:bg-surface/45"
            >
              <ArrowLeft className="size-[17px]" />
            </IconButton>
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                initials={initialsOf(peerName)}
                tone={conversation.peer?.tone ?? "bg-pastel-lilac"}
                size="sm"
              />
              <div className="min-w-0 leading-none">
                <h1 className="truncate font-display text-[14px] font-semibold">{peerName}</h1>
                <div className="mt-1 flex h-3 items-center text-[10px] font-semibold text-status">
                  {typing ? (
                    <TypingIndicator variant="header" />
                  ) : (
                    lastSeenLabel(peerOnline, conversation.peer?.last_seen_at)
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-1.5">
              <IconButton
                label="Audio call"
                onClick={() => onCall("audio")}
                className="size-9 bg-surface/45 text-ink hover:bg-surface/70"
              >
                <Phone className="size-[17px]" />
              </IconButton>
              <IconButton
                label="Video call"
                onClick={() => onCall("video")}
                className="size-9 bg-surface/45 text-ink hover:bg-surface/70"
              >
                <Video className="size-[17px]" />
              </IconButton>
            </div>
          </>
        )}
      </header>
      <motion.div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-chat"
      >
      {pins.length > 0 && (
        <PinnedBar
          pins={pins}
          index={pinIndex}
          onCycle={() => setPinIndex((current) => (current + 1) % pins.length)}
          onOpen={() => {
            const pin = pins[pinIndex % pins.length];
            if (pin) jumpTo(pin.id);
          }}
          onUnpin={() => {
            const pin = pins[pinIndex % pins.length];
            if (pin) togglePin.mutate({ messageId: pin.id, pinned: true });
            setPinIndex(0);
          }}
        />
      )}
      <Conversation className="queue-pattern no-scrollbar min-h-0 min-w-0">
        <ConversationContent className="min-w-0 gap-0 overflow-x-hidden px-2.5 pb-4 pt-3">
          <AnimatePresence mode="wait" initial={false}>
          {messages.isLoading ? (
            <motion.div key="loading" exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              <MessagesSkeleton />
            </motion.div>
          ) : messages.isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-52 flex-col items-center justify-center px-6 text-center"
            >
              <Warning className="size-6 text-destructive" weight="fill" />
              <p className="mt-3 text-sm font-semibold text-ink">Messages couldn’t load</p>
              <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void messages.refetch()}
                className="mt-4 h-9 rounded-full bg-muted px-4 text-xs text-ink"
              >
                <ArrowClockwise className="size-4" />
                Try again
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={`messages-${conversation.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
              className="flex min-w-0 flex-col gap-0"
            >
          {list.length === 0 && (
            <EmptyState
              icon={<MessageCircle className="size-7" weight="fill" />}
              title="Say hello"
              body={`You and ${peerName} are connected. Your first message starts the conversation.`}
            />
          )}
          {list.map((item, index, all) => {
            const previous = index > 0 ? all[index - 1] : null;
            const next = index < all.length - 1 ? all[index + 1] : null;
            const newDay = !previous || dayKey(previous.created_at) !== dayKey(item.created_at);
            const deleted = Boolean(item.deletedAt);
            const quoted = item.replyToId ? byId.get(item.replyToId) : null;
            // Same-sender runs group regardless of how much time passed between
            // the messages — only a new day or a deleted bubble breaks the run,
            // so reply bubbles keep exactly the same corner logic as any other.
            const continuesPrevious =
              !newDay && !deleted && !previous?.deletedAt && previous?.mine === item.mine;
            const continuesNext =
              Boolean(next) &&
              !deleted &&
              !next?.deletedAt &&
              next?.mine === item.mine &&
              dayKey(next.created_at) === dayKey(item.created_at);
            const failed = item.pending === "failed";

            return (
              <Fragment key={item.id}>
                {newDay && (
                  <div className="sticky top-1 z-10 mx-auto my-3 w-fit rounded-full bg-surface/95 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-soft">
                    {dayLabel(item.created_at)}
                  </div>
                )}
                <SwipeableMessage
                  mine={item.mine}
                  disabled={deleted}
                  selectionActive={selectionActive}
                  onLongPress={() => toggleSelected(item.id)}
                  onTap={() => toggleSelected(item.id)}
                  nodeRef={(node) => {
                    if (node) bubbleRefs.current.set(item.id, node);
                    else bubbleRefs.current.delete(item.id);
                  }}
                  onReply={() => {
                    setEditing(null);
                    setReplyTo(item.id);
                    textareaRef.current?.focus();
                  }}
                >
                  <Message
                    from={item.mine ? "user" : "assistant"}
                    className={cn("max-w-full", continuesPrevious ? "mt-0.5" : "mt-3")}
                  >
                    <MessageContent
                      className={cn(
                        "relative max-w-[84%] gap-0 rounded-[1.2rem] px-3 py-2 shadow-soft transition-[opacity,box-shadow]",
                        item.pending === "sending" && "opacity-70",
                        highlighted === item.id && "ring-2 ring-pastel-mint",
                        selectedIds.includes(item.id) && "ring-2 ring-pastel-blue",

                        // deleted bubbles keep the normal bubble colour so a run
                        // of messages never breaks its rhythm
                        item.mine
                          ? "bg-ink text-paper group-[.is-user]:rounded-[1.2rem] group-[.is-user]:bg-ink group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-paper"
                          : "bg-pastel-yellow text-ink",
                        // right side flattens toward the inside of a run:
                        // first bubble → sharp bottom-right, middle → both right corners sharp,
                        // last bubble → sharp top-right (mirrored on the left for their messages)
                        item.mine &&
                          continuesPrevious &&
                          "rounded-tr-[3px] group-[.is-user]:rounded-tr-[3px]",
                        item.mine &&
                          continuesNext &&
                          "rounded-br-[3px] group-[.is-user]:rounded-br-[3px]",
                        !item.mine && continuesPrevious && "rounded-tl-[3px]",
                        !item.mine && continuesNext && "rounded-bl-[3px]",
                      )}
                    >
                      {deleted ? (
                        <p
                          className={cn(
                            "flex items-center gap-1.5 text-[13px] italic leading-5",
                            item.mine ? "text-paper/60" : "text-ink/55",
                          )}
                        >
                          <Prohibit className="size-3.5 shrink-0" />
                          {item.mine ? "You deleted this message" : "This message was deleted"}
                        </p>
                      ) : (
                        <>
                          {item.replyToId && (
                            <button
                              type="button"
                              onClick={() => quoted && jumpTo(quoted.id)}
                              className={cn(
                                "mb-1 flex w-full min-w-0 items-center rounded-lg border-l-2 px-2 py-1 text-left",
                                item.mine
                                  ? "border-pastel-mint bg-paper/10"
                                  : "border-ink/40 bg-ink/5",
                              )}
                            >
                              <span className="w-full truncate text-[12px] leading-4 opacity-75">
                                {messageSummary(quoted)}
                              </span>
                            </button>
                          )}
                          {item.kind === "text" ? (
                            locationFromMessage(item.text) ? (
                              <LocationBubble
                                location={locationFromMessage(item.text)}
                                mine={item.mine}
                              />
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-[15px] leading-5">
                                {item.text}
                                <span
                                  aria-hidden
                                  className={cn(
                                    "inline-block select-none",
                                    item.mine ? "w-20" : "w-16",
                                  )}
                                />
                              </p>
                            )
                          ) : (
                            <MediaBubble conversationId={conversation.id} message={item} />
                          )}
                        </>
                      )}
                      {!deleted && (
                        <div
                          className={cn(
                            "pointer-events-none absolute bottom-1.5 right-3 flex items-center gap-1 text-[9px] font-medium leading-none tabular-nums",
                            item.mine ? "text-paper/45" : "text-ink/45",
                          )}
                        >
                          {item.pinned && <PushPin weight="fill" className="size-2.5" />}
                          {item.editedAt && <span>edited</span>}
                          <span>{clockTime(item.created_at)}</span>
                          {item.mine &&
                            (item.pending === "sending" ? (
                              <Clock3 className="size-3" />
                            ) : failed ? (
                              <Warning className="size-3 text-destructive" />
                            ) : item.read ? (
                              <CheckCheck weight="bold" className="size-3" />
                            ) : (
                              <Check weight="bold" className="size-3" />
                            ))}
                        </div>
                      )}
                    </MessageContent>
                  </Message>
                </SwipeableMessage>

                {failed && (
                  <button
                    type="button"
                    onClick={() => retry(item.id)}
                    className="mr-1 self-end text-[10px] font-semibold text-destructive underline-offset-2 hover:underline"
                  >
                    Failed — tap to retry
                  </button>
                )}
              </Fragment>
            );
          })}

          {typing && (
            <Message from="assistant" className="mt-2 max-w-full">
              <TypingIndicator variant="bubble" />
            </Message>
          )}
            </motion.div>
          )}
          </AnimatePresence>
        </ConversationContent>
        <ConversationScrollButton
          aria-label="Scroll to latest message"
          className="bottom-3 size-9 border-border bg-surface text-ink shadow-soft"
        />
      </Conversation>

      <div className="pointer-events-none relative z-10 shrink-0 bg-chat px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <AnimatePresence>
          {micHint && !recording && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              className="pointer-events-none absolute bottom-[calc(100%+.35rem)] right-4 rounded-full bg-ink px-3 py-1.5 text-[10px] font-semibold text-paper shadow-soft"
            >
              Hold to record · release to send
            </motion.div>
          )}
        </AnimatePresence>
        {mediaError && (
          <div className="pointer-events-auto mx-1 mb-2 rounded-2xl bg-surface px-3 py-2 text-[11px] text-destructive shadow-soft">
            {mediaError}
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={photoInput}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {recording ? (
          // The mic button stays exactly where the finger is holding it, so the
          // cancel hint lives on the far left of the pill — never under the finger.
          <div className="flex min-w-0 items-end gap-1">
            <motion.div
              role="status"
              aria-label={`Recording voice note, ${formatDuration(recordSeconds)}. Slide left to cancel, or release to send.`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
              className="pointer-events-auto flex min-w-0 flex-1 items-center rounded-[1.65rem] border border-border/60 bg-muted/70 pl-3 pr-2.5 backdrop-blur-md"
            >
              {/* Same inner box as the normal composer pill, so the row height
                  never jumps when recording starts or stops. */}
              <div className="flex min-h-12 w-full min-w-0 items-center gap-2.5">
                <motion.span
                  animate={{
                    x: reduceMotion ? 0 : Math.min(10, recordDragX * 0.12),
                    opacity: recordDragX <= -72 ? 1 : 0.72,
                  }}
                  transition={{ duration: 0 }}
                  className={cn(
                    "flex shrink-0 items-center gap-0.5 text-[10px] font-medium",
                    recordDragX <= -72 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  <ArrowLeft className="size-3.5" />
                  {recordDragX <= -72 ? "Release to cancel" : "Slide to cancel"}
                </motion.span>
                <span className="size-2 shrink-0 rounded-full bg-destructive" />
                <span className="w-10 shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                  {formatDuration(recordSeconds)}
                </span>
                <div className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[2.5px] overflow-hidden" aria-hidden="true">
                  {(recordLevels.length ? recordLevels.slice(-18) : Array.from({ length: 18 }, () => 0.16)).map(
                    (level, i, all) => (
                      <span
                        key={i}
                        style={{
                          height: `${Math.max(3, Math.round(level * 18))}px`,
                          opacity: 0.3 + (0.55 * (i + 1)) / all.length,
                        }}
                        className="w-0.5 shrink-0 rounded-full bg-ink transition-[height] duration-100 ease-out"
                      />
                    ),
                  )}
                </div>
              </div>
            </motion.div>
            <div className="pointer-events-none relative size-12 shrink-0">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 rounded-full bg-pastel-mint/60",
                  !reduceMotion && "animate-ping",
                )}
              />
              <span className="relative flex size-12 items-center justify-center rounded-full bg-pastel-mint text-ink shadow-soft">
                <Mic className="size-5" />
              </span>
            </div>
          </div>
        ) : (

          // The pill holds the attachment button and the text only; the send /
          // voice control lives outside it as its own round button.
          <PromptInput
            onSubmit={(_, event) => void submit(event)}
            className="pointer-events-auto min-w-0 [&_[data-slot=input-group]]:grid [&_[data-slot=input-group]]:w-full [&_[data-slot=input-group]]:grid-cols-[minmax(0,1fr)_3rem] [&_[data-slot=input-group]]:items-end [&_[data-slot=input-group]]:gap-1 [&_[data-slot=input-group]]:overflow-visible [&_[data-slot=input-group]]:rounded-none [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group]]:p-0 [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:outline-none [&_[data-slot=input-group]]:ring-0!"
          >
            <div className="min-w-0 flex-1 overflow-hidden rounded-[1.65rem] border border-border/60 bg-muted/70 shadow-soft backdrop-blur-md">
              {(replyTarget || editingMessage) && (
                <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
                  {editingMessage ? (
                    <PencilSimple className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ArrowBendUpLeft className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      {editingMessage
                        ? "Editing message"
                        : replyTarget?.mine
                          ? "Replying to you"
                          : `Replying to ${peerName}`}
                    </p>
                    <p className="truncate text-[11px] text-ink">
                      {shortSummary(editingMessage ?? replyTarget, 80)}
                    </p>
                  </div>
                  <IconButton
                    label={editingMessage ? "Cancel editing" : "Cancel reply"}
                    onClick={() => {
                      if (editingMessage) {
                        setEditing(null);
                        setText("");
                      } else {
                        setReplyTo(null);
                      }
                    }}
                    className="size-7 bg-muted"
                  >
                    <X className="size-3.5" weight="regular" />
                  </IconButton>
                </div>
              )}
              <div className="flex min-h-12 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Attach a photo or file"
                  onClick={() => setAttachmentsOpen(true)}
                  className="ml-1 size-10 shrink-0 rounded-full text-muted-foreground shadow-none hover:bg-muted hover:text-ink focus-visible:ring-0"
                >
                  <Paperclip className="size-5" />
                </Button>
                <PromptInputTextarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    const next = e.target.value;
                    setText(next);
                    if (next.trim()) notifyTyping();
                    else notifyStopped();
                  }}
                  onKeyDown={(event) => {
                    // Touch keyboards keep their natural newline behaviour.
                    const coarse =
                      typeof window !== "undefined" &&
                      window.matchMedia?.("(pointer: coarse)").matches;
                    if (event.key === "Enter" && !event.shiftKey && coarse) {
                      event.preventDefault();
                      const node = event.currentTarget;
                      const start = node.selectionStart ?? node.value.length;
                      const end = node.selectionEnd ?? start;
                      const next = `${node.value.slice(0, start)}\n${node.value.slice(end)}`;
                      setText(next);
                      window.requestAnimationFrame(() => {
                        node.selectionStart = node.selectionEnd = start + 1;
                      });
                    }
                  }}
                  placeholder={editingMessage ? "Edit your message…" : "Message…"}
                  aria-label={`Message ${peerName}`}
                  rows={1}
                  className="my-0 max-h-[7.75rem] min-h-12 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-3 pr-3 text-sm leading-5 shadow-none focus-visible:outline-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="relative size-12 shrink-0 self-end">
                {text.trim() ? (
                  <PromptInputSubmit
                    type="submit"
                    variant="ghost"
                    disabled={send.isPending}
                    className="size-12 shrink-0 rounded-full bg-pastel-mint text-ink shadow-soft transition-transform hover:bg-pastel-mint/85 active:scale-95"
                    aria-label={editingMessage ? "Save changes" : "Send message"}
                    title={editingMessage ? "Save changes" : "Send message"}
                  >
                    {editingMessage ? <Check className="size-5" /> : <Send className="size-5" />}
                  </PromptInputSubmit>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Hold to record a voice note"
                    title="Hold to record a voice note"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      beginMicHold(event.clientX);
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                    className="size-12 shrink-0 touch-none select-none rounded-full bg-pastel-mint text-ink shadow-soft transition-transform hover:bg-pastel-mint/85 active:scale-95"
                  >
                    <Mic className="size-5" />
                  </Button>
                )}
            </div>
          </PromptInput>
        )}
      </div>
      </motion.div>
      <AnimatePresence>
        {attachmentsOpen && (
          <BottomSheet kind="attachment" onClose={() => setAttachmentsOpen(false)}>
            <AttachmentActions
              onCamera={() => {
                setAttachmentsOpen(false);
                cameraInput.current?.click();
              }}
              onGallery={() => {
                setAttachmentsOpen(false);
                photoInput.current?.click();
              }}
              onFile={() => {
                setAttachmentsOpen(false);
                fileInput.current?.click();
              }}
              onLocation={shareLocation}
            />
          </BottomSheet>
        )}
        {deleteChoice && !confirmDelete && (
          <BottomSheet kind="attachment" onClose={() => setDeleteChoice(null)}>
            <MessageDeleteChoice
              count={deleteChoice.length}
              canDeleteForEveryone={deleteChoice.every((id) => {
                const item = byId.get(id);
                return Boolean(item?.mine) && !item?.deletedAt && !item?.pending;
              })}
              onDeleteForMe={() => {
                setConfirmDelete({ ids: deleteChoice, everyone: false });
                setDeleteChoice(null);
              }}
              onDeleteForEveryone={() => {
                setConfirmDelete({ ids: deleteChoice, everyone: true });
                setDeleteChoice(null);
              }}
            />
          </BottomSheet>
        )}
        {confirmDelete && (
          <BottomSheet
            kind="attachment"
            onClose={() => {
              setConfirmDelete(null);
              clearSelection();
            }}
          >
            <ConfirmSheet
              title={confirmDelete.everyone ? "Delete for everyone?" : "Delete for me?"}
              body={
                confirmDelete.everyone
                  ? `This removes ${confirmDelete.ids.length > 1 ? "these messages" : "the message"} for you and ${peerName}. It cannot be undone.`
                  : `This hides ${confirmDelete.ids.length > 1 ? "these messages" : "the message"} on your side only. The other person keeps their copy.`
              }
              confirmLabel="Delete"
              onCancel={() => {
                setConfirmDelete(null);
                clearSelection();
              }}
              onConfirm={() => {
                confirmDelete.ids.forEach((id) => {
                  const target = byId.get(id);
                  if (confirmDelete.everyone) {
                    deleteForEveryone.mutate({
                      messageId: id,
                      mediaPath: target?.mediaPath ?? null,
                    });
                  } else {
                    deleteForMe.mutate({ messageId: id });
                  }
                  if (replyTo === id) setReplyTo(null);
                  if (editing === id) {
                    setEditing(null);
                    setText("");
                  }
                });
                setConfirmDelete(null);
                clearSelection();
              }}
            />
          </BottomSheet>
        )}
      </AnimatePresence>
    </ScreenMotion>
  );
}
