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
  useMarkRead,
  useMessages,
  useMyCodes,

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
import { StatusItem } from "../shared/primitives";
export function Inbox({
  conversations,
  loading,
  onChat,
  onConnect,
  connectOpen,
  onStatus,
  onAddStatus,
}: {
  conversations: ConversationRow[];
  loading: boolean;
  onChat: (id: string) => void;
  onConnect: () => void;
  connectOpen: boolean;
  onStatus: (index: number) => void;
  onAddStatus: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const statuses = useStatuses();
  const groupedStatuses = useMemo(() => {
    const groups = new Map<
      string,
      { status: NonNullable<typeof statuses.data>[number]; indices: number[]; seenCount: number }
    >();

    for (const [index, status] of (statuses.data ?? []).entries()) {
      const current = groups.get(status.user_id);
      if (current) {
        current.indices.push(index);
        if (status.seen) current.seenCount += 1;
      } else {
        groups.set(status.user_id, {
          status,
          indices: [index],
          seenCount: status.seen ? 1 : 0,
        });
      }
    }

    return [...groups.values()];
  }, [statuses.data]);

  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef as RefObject<HTMLElement> });
  const railOpacity = useTransform(scrollY, [0, 86], [1, 0]);
  const railScale = useTransform(scrollY, [0, 118], [1, 0.96]);
  const railLift = useTransform(scrollY, [0, 118], [0, -10]);
  const railHeight = useTransform(scrollY, [0, 118], [118, 0]);
  const listScrollHandoff = useTransform(scrollY, [0, 118], [0, 118]);

  const visible = conversations.filter((c) =>
    query
      ? (c.peer?.display_name ?? c.peer?.username ?? "").toLowerCase().includes(query.toLowerCase())
      : true,
  );

  const ordered = useMemo(
    () =>
      [...visible].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt ?? b.last_message_at).getTime() -
          new Date(a.lastMessageAt ?? a.last_message_at).getTime()
        );
      }),
    [visible],
  );

  const [actionChat, setActionChat] = useState<ConversationRow | null>(null);
  const [lockTarget, setLockTarget] = useState<ConversationRow | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<ConversationRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    chat: ConversationRow;
    kind: "block" | "delete";
  } | null>(null);

  const updateSettings = useUpdateChatSettings();
  const deleteConversation = useDeleteConversation();
  const blockContact = useBlockContact();

  const openChat = (chat: ConversationRow) => {
    if (chat.locked && chat.lockPinHash) setUnlockTarget(chat);
    else onChat(chat.id);
  };

  const patchChat = (chat: ConversationRow, patch: Record<string, unknown>) => {
    updateSettings.mutate({ conversationId: chat.id, ...patch });
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-ink text-paper">
       <div className={cn("z-30 shrink-0 bg-ink px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]", connectOpen && "relative z-[60]")}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-pastel-yellow shadow-soft">
              <Logo size="sm" />
            </span>
            <h1 className="font-display text-lg font-semibold tracking-tight">Queue</h1>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
               label={connectOpen ? "Close connection drawer" : "New connection"}
              onClick={onConnect}
               className="bg-pastel-yellow text-ink transition-transform duration-150 active:scale-95 hover:bg-pastel-yellow/85"
            >
              <Plus
                weight="regular"
                 className={cn(
                   "transition-transform duration-200",
                   connectOpen && "rotate-45",
                 )}
              />
            </IconButton>
          </div>
        </div>
      </div>
      <motion.header
        style={{
          height: railHeight,
          ...(reduceMotion ? {} : { opacity: railOpacity, scale: railScale, y: railLift }),
        }}
        className="z-0 shrink-0 origin-top overflow-hidden px-5 pt-2.5 will-change-transform"
      >
        <div className="h-[108px] overflow-hidden">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Live now</h2>
            <span className="text-[10px] text-paper/45">{groupedStatuses.length} active</span>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            <Button
              variant="ghost"
              onClick={onAddStatus}
              className="h-auto shrink-0 flex-col gap-1.5 rounded-2xl p-0 text-paper hover:bg-transparent"
            >
              <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-paper/25">
                <Plus weight="regular" className="size-5" />
              </span>
              <span className="max-w-14 truncate text-[10px] font-medium text-paper/55">
                Status
              </span>
            </Button>
            {groupedStatuses.map(({ status, indices, seenCount }) => (
              <StatusItem
                key={status.user_id}
                initials={initialsOf(status.profile?.display_name ?? status.profile?.username)}
                name={
                  (status.profile?.display_name || status.profile?.username || "Queue").split(
                    " ",
                  )[0] || "Queue"
                }
                tone={status.tone}
                statusCount={indices.length}
                seenCount={seenCount}
                onClick={() => {
                  const firstUnseen = indices.find((statusIndex) => !statuses.data?.[statusIndex]?.seen);
                  const targetIndex = firstUnseen ?? indices[0];
                  if (targetIndex !== undefined) onStatus(targetIndex);
                }}
              />
            ))}
          </div>
        </div>
      </motion.header>
      <div className="relative isolate z-10 flex min-h-0 flex-1 transform-gpu flex-col overflow-hidden rounded-t-[2.5rem] bg-surface pt-4 text-foreground shadow-sheet [backface-visibility:hidden]">
        {conversations.length > 0 && (
          <div className="px-3">
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-muted-foreground">
              <Search className="size-4" />
              <input
                aria-label="Search conversations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your Queue"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
        <div
          ref={scrollRef}
          className="no-scrollbar min-h-0 flex-1 overscroll-contain overflow-y-auto pb-28"
        >
           <motion.div className="min-h-[calc(100%+118px)]" style={{ y: listScrollHandoff }}>
            {loading ? (
              <ChatListSkeleton />
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={<KeyRound className="size-7" weight="fill" />}
                title="No conversations yet"
                body="Share a one-time code, or redeem someone else's, to start your first private chat."
                action={
                  <Button onClick={onConnect} className="h-12 rounded-full px-6">
                    <Plus weight="regular" />
                    New connection
                  </Button>
                }
              />
            ) : visible.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No chats match “{query}”.
              </p>
            ) : (
              <div className="px-3">
                {ordered.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    onOpen={() => openChat(chat)}
                    onActions={() => setActionChat(chat)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {actionChat && (
          <BottomSheet kind="account" onClose={() => setActionChat(null)}>
            <ChatActionsSheet
              chat={actionChat}
              onClose={() => setActionChat(null)}
              onPin={(chat) => patchChat(chat, { pinned: !chat.pinned })}
              onMute={(chat) => patchChat(chat, { muted: !chat.muted })}
              onLock={(chat) => {
                if (chat.locked) {
                  patchChat(chat, { locked: false, lock_pin_hash: null });
                } else {
                  setLockTarget(chat);
                }
              }}
              onBlock={(chat) => setConfirmAction({ chat, kind: "block" })}
              onDelete={(chat) => setConfirmAction({ chat, kind: "delete" })}
            />
          </BottomSheet>
        )}
        {lockTarget && (
          <BottomSheet kind="account" onClose={() => setLockTarget(null)}>
            <PinSheet
              mode="set"
              title="Lock this chat"
              body="Choose a 4–6 digit passcode. It never leaves your device — we only store a scrambled version."
              onSubmit={async (pin) => {
                const hash = await hashPin(`${lockTarget.id}:${pin}`);
                patchChat(lockTarget, { locked: true, lock_pin_hash: hash });
                setLockTarget(null);
                return true;
              }}
            />
          </BottomSheet>
        )}
        {unlockTarget && (
          <BottomSheet kind="account" onClose={() => setUnlockTarget(null)}>
            <PinSheet
              mode="check"
              title="Enter passcode"
              body="This chat is locked. Enter its passcode to open it."
              onSubmit={async (pin) => {
                const hash = await hashPin(`${unlockTarget.id}:${pin}`);
                if (hash !== unlockTarget.lockPinHash) return false;
                const id = unlockTarget.id;
                setUnlockTarget(null);
                onChat(id);
                return true;
              }}
            />
          </BottomSheet>
        )}
        {confirmAction && (
          <BottomSheet kind="account" onClose={() => setConfirmAction(null)}>
            <ConfirmSheet
              title={confirmAction.kind === "block" ? "Block this contact?" : "Delete this chat?"}
              body={
                confirmAction.kind === "block"
                  ? "They will no longer be able to message or call you. You can unblock them in Privacy & security."
                  : "The whole conversation is removed for both of you. This cannot be undone."
              }
              confirmLabel={confirmAction.kind === "block" ? "Block" : "Delete"}
              onCancel={() => setConfirmAction(null)}
              onConfirm={() => {
                const { chat, kind } = confirmAction;
                setConfirmAction(null);
                setActionChat(null);
                if (kind === "block") {
                  if (!chat.peer) return;
                  blockContact.mutate({ userId: chat.peer.id, blocked: true });
                } else {
                  deleteConversation.mutate(chat.id);
                }
              }}
            />
          </BottomSheet>
        )}
      </AnimatePresence>
    </section>
  );
}

function ChatRow({
  chat,
  onOpen,
  onActions,
}: {
  chat: ConversationRow;
  onOpen: () => void;
  onActions: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const typing = useIsPeerTyping(chat.id);
  const peerOnline = useIsOnline(chat.peer?.id);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const startHold = () => {
    heldRef.current = false;
    holdRef.current = setTimeout(() => {
      heldRef.current = true;
      onActions();
    }, 450);
  };
  const endHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = null;
  };
  useEffect(() => endHold, []);

  const name = chat.peer?.display_name || chat.peer?.username || "Queue contact";

  return (
    <motion.div
      layout={!reduceMotion}
      transition={transition}
      className={cn("relative rounded-2xl", chat.pinned && "bg-muted/40")}
    >
      <Button
        variant="ghost"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onContextMenu={(event) => {
          event.preventDefault();
          onActions();
        }}
        onClick={() => {
          if (heldRef.current) return;
          onOpen();
        }}
        className={cn("h-auto w-full justify-start rounded-2xl px-2 py-2.5 text-left", pressRow)}
      >
        <Avatar
          initials={initialsOf(chat.peer?.display_name ?? chat.peer?.username)}
          tone={chat.peer?.tone ?? "bg-pastel-lilac"}
          online={peerOnline}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-display text-sm font-semibold">{name}</span>
              {chat.locked && <LockKeyhole className="size-3 shrink-0 text-muted-foreground" />}
              {chat.muted && <BellSlash className="size-3 shrink-0 text-muted-foreground" />}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-normal text-muted-foreground">
              {chat.pinned && <PushPin weight="fill" className="size-3" />}
              {timeAgo(chat.lastMessageAt ?? chat.last_message_at)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate text-xs font-normal",
                typing && !chat.locked ? "font-semibold text-status" : "text-muted-foreground",
              )}
            >
              {chat.locked ? (
                "Locked chat"
              ) : typing ? (
                <TypingIndicator variant="list" />
              ) : (
                (chat.lastMessage ?? "Say hello")
              )}
            </span>
            {chat.unread > 0 && (
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[9px]",
                  chat.muted ? "bg-muted text-muted-foreground" : "bg-ink text-paper",
                )}
              >
                {chat.unread}
              </span>
            )}
          </div>
        </div>
      </Button>
    </motion.div>
  );
}

function ChatActionsSheet({
  chat,
  onClose,
  onPin,
  onMute,
  onLock,
  onBlock,
  onDelete,
}: {
  chat: ConversationRow;
  onClose: () => void;
  onPin: (chat: ConversationRow) => void;
  onMute: (chat: ConversationRow) => void;
  onLock: (chat: ConversationRow) => void;
  onBlock: (chat: ConversationRow) => void;
  onDelete: (chat: ConversationRow) => void;
}) {
  const actions = [
    {
      icon: chat.pinned ? PushPinSlash : PushPin,
      label: chat.pinned ? "Unpin chat" : "Pin to top",
      run: () => {
        onPin(chat);
        onClose();
      },
    },
    {
      icon: chat.muted ? Bell : BellSlash,
      label: chat.muted ? "Unmute" : "Mute notifications",
      run: () => {
        onMute(chat);
        onClose();
      },
    },
    {
      icon: chat.locked ? LockKeyOpen : LockKeyhole,
      label: chat.locked ? "Remove lock" : "Lock with passcode",
      run: () => {
        onLock(chat);
        if (chat.locked) onClose();
      },
    },
    { icon: Prohibit, label: "Block contact", run: () => onBlock(chat), danger: true },
    { icon: Trash, label: "Delete chat", run: () => onDelete(chat), danger: true },
  ];

  return (
    <div className="pb-2">
      {actions.map(({ icon: Icon, label, run, danger }, index, items) => (
        <Button
          key={label}
          variant="ghost"
          onClick={run}
          className={cn(
            "h-auto w-full justify-start gap-2.5 rounded-xl px-1 py-2.5 text-left",
            pressRow,
            index < items.length - 1 && "rounded-b-none border-b border-border",
            danger && "text-destructive",
          )}
        >
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full bg-muted",
              danger && "bg-destructive/10",
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className="font-display text-[13px] font-semibold">{label}</span>
        </Button>
      ))}
    </div>
  );
}

function PinBoxes({
  value,
  autoFocus,
  onChange,
  invalid,
}: {
  value: string;
  autoFocus?: boolean;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={6}
        aria-label="Passcode"
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div className="pointer-events-none flex justify-center gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const filled = index < value.length;
          const active = focused && index === Math.min(value.length, 5);
          return (
            <div
              key={index}
              className={cn(
                "grid size-11 place-items-center rounded-xl border bg-muted/35 transition-all",
                filled ? "border-border" : "border-border/60",
                active && "border-foreground/60 ring-2 ring-foreground/10",
                invalid && "border-destructive",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full bg-foreground transition-transform",
                  filled ? "scale-100" : "scale-0",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PinSheet({
  mode,
  title,
  body,
  onSubmit,
}: {
  mode: "set" | "check";
  title: string;
  body: string;
  onSubmit: (pin: string) => Promise<boolean>;
}) {
  const reduceMotion = useReducedMotion();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const fail = (message: string) => {
    setError(message);
    setShake((current) => current + 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pin.length < 4) return fail("Use at least 4 digits");
    if (mode === "set" && pin !== confirmPin) return fail("Those passcodes do not match");
    setBusy(true);
    const ok = await onSubmit(pin);
    setBusy(false);
    if (!ok) {
      fail("Wrong passcode");
      setPin("");
      setConfirmPin("");
    }
  };

  return (
    <form onSubmit={submit} className="pb-2">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-pastel-yellow text-ink">
          <KeyRound weight="fill" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Chat lock</p>
          <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{body}</p>
      <motion.div
        key={shake}
        animate={reduceMotion || shake === 0 ? false : { x: [0, -6, 6, -4, 4, 0] }}
        transition={{ duration: 0.3 }}
        className="mt-5 space-y-4"
      >
        <PinBoxes
          value={pin}
          autoFocus
          invalid={Boolean(error)}
          onChange={(next) => {
            setError("");
            setPin(next);
          }}
        />
        {mode === "set" && (
          <div>
            <p className="mb-2 text-center text-[10px] font-bold uppercase text-muted-foreground">
              Confirm passcode
            </p>
            <PinBoxes
              value={confirmPin}
              invalid={Boolean(error)}
              onChange={(next) => {
                setError("");
                setConfirmPin(next);
              }}
            />
          </div>
        )}
      </motion.div>
      <span
        className={cn(
          "mt-2 flex min-h-4 items-center justify-center gap-1 text-[10px] font-semibold",
          error ? "text-destructive" : "text-transparent",
        )}
      >
        {error && <Warning className="size-3" weight="fill" />}
        {error ?? "Passcode is valid"}
      </span>
      <Button
        type="submit"
        disabled={busy || pin.length < 4 || (mode === "set" && confirmPin.length < 4)}
        className="mt-3 h-12 w-full rounded-xl"
      >
        {busy ? "Please wait…" : mode === "set" ? "Lock chat" : "Open chat"}
        {!busy && <ChevronRight />}
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
        <LockKeyhole className="size-3" weight="fill" />
        4–6 digits. Stored hashed on this device only.
      </p>
    </form>
  );
}
