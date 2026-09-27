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
export function SwipeableMessage({
  mine,
  disabled,
  selectionActive,
  onReply,
  onLongPress,
  onTap,
  nodeRef,
  children,
}: {
  mine: boolean;
  disabled?: boolean;
  selectionActive: boolean;
  onReply: () => void;
  onLongPress: () => void;
  onTap: () => void;
  nodeRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const longPress = useRef<number | null>(null);
  const fired = useRef(false);
  const cancelLongPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current);
    longPress.current = null;
  };
  const startLongPress = () => {
    cancelLongPress();
    fired.current = false;
    longPress.current = window.setTimeout(() => {
      cancelLongPress();
      fired.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, 450);
  };

  const reduceMotion = useReducedMotion();
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ x: number; y: number; axis: "none" | "x" | "y" } | null>(null);
  const threshold = 56;
  const direction = mine ? -1 : 1;

  const end = () => {
    if (Math.abs(offset) >= threshold - 2) {
      onReply();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    }
    setOffset(0);
    gesture.current = null;
  };

  const progress = Math.min(1, Math.abs(offset) / threshold);

  return (
    <div
      ref={nodeRef}
      className="relative select-none"
      onContextMenu={(event) => {
        event.preventDefault();
        cancelLongPress();
        onLongPress();
      }}
      onClick={(event) => {
        // Links, media controls and the quoted preview keep their own behaviour.
        if ((event.target as HTMLElement).closest("a,button,video,audio,input")) return;
        // A plain tap only toggles while a selection is already running,
        // so one click can never select a message on its own.
        if (fired.current) {
          fired.current = false;
          return;
        }
        if (selectionActive) onTap();
      }}
      onMouseDown={(event) => {
        if (event.button === 0) startLongPress();
      }}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={(event) => {
        startLongPress();
        if (disabled) return;
        const touch = event.touches[0];
        if (touch) gesture.current = { x: touch.clientX, y: touch.clientY, axis: "none" };
      }}
      onTouchMove={(event) => {
        const start = gesture.current;
        const touch = event.touches[0];
        if (!start || !touch || disabled) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (start.axis === "none") {
          // Vertical scrolling always wins so the list never feels stuck.
          if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
            start.axis = "y";
            return;
          }
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) start.axis = "x";
          else return;
        }
        if (start.axis !== "x") return;
        const pulled = dx * direction;
        if (pulled <= 0) {
          setOffset(0);
          return;
        }
        // Resistance once past the threshold.
        const eased = pulled > threshold ? threshold + (pulled - threshold) * 0.25 : pulled;
        setOffset(Math.min(eased, threshold + 16) * direction);
      }}
      onTouchEnd={() => {
        cancelLongPress();
        end();
      }}
      onTouchMoveCapture={cancelLongPress}
      onTouchCancel={() => {
        cancelLongPress();
        setOffset(0);
        gesture.current = null;
      }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 flex items-center",
          mine ? "right-2" : "left-2",
        )}
        style={{ opacity: progress }}
      >
        <span
          className="grid size-7 place-items-center rounded-full bg-surface text-ink shadow-soft"
          style={{ transform: `scale(${0.7 + progress * 0.3})` }}
        >
          <ArrowBendUpLeft className="size-4" weight="bold" />
        </span>
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 && !reduceMotion ? "transform .18s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Sheet asking how the selected messages should be deleted. */
export function MessageDeleteChoice({
  count,
  canDeleteForEveryone,
  onDeleteForMe,
  onDeleteForEveryone,
}: {
  count: number;
  canDeleteForEveryone: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}) {
  return (
    <div className="pb-2">
      <h2 className="font-display text-xl font-semibold">
        {count > 1 ? `Delete ${count} messages?` : "Delete message?"}
      </h2>
      <div className="mt-5 space-y-2">
        <Button
          variant="ghost"
          onClick={onDeleteForMe}
          className="h-12 w-full justify-start gap-3 rounded-xl bg-muted/60 px-4 text-sm font-semibold"
        >
          <Trash className="size-4" />
          Delete for me
        </Button>
        {canDeleteForEveryone && (
          <Button
            variant="ghost"
            onClick={onDeleteForEveryone}
            className="h-12 w-full justify-start gap-3 rounded-xl bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/15"
          >
            <Trash className="size-4" weight="fill" />
            Delete for everyone
          </Button>
        )}
      </div>
    </div>
  );
}

/** Slim bar under the header listing this person's pinned messages. */
export function PinnedBar({
  pins,
  index,
  onCycle,
  onOpen,
  onUnpin,
}: {
  pins: ChatMessage[];
  index: number;
  onCycle: () => void;
  onOpen: () => void;
  onUnpin: () => void;
}) {
  const current = pins[index % pins.length];
  if (!current) return null;
  return (
    // Tucked straight under the header curve — no floating card, no gap.
    <div className="relative z-10 -mt-5 shrink-0 rounded-b-[1.75rem] bg-surface px-4 pb-2 pt-6">
      <div className="flex items-center gap-2">
        <PushPin weight="fill" className="size-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => {
            onOpen();
            if (pins.length > 1) onCycle();
          }}
          className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-ink"
        >
          {shortSummary(current, 70)}
        </button>
        {pins.length > 1 && (
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums">
            {(index % pins.length) + 1}/{pins.length}
          </span>
        )}
        <IconButton label="Unpin message" onClick={onUnpin} className="size-7 bg-muted">
          <PushPinSlash className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
