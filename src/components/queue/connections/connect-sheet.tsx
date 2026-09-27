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
export function ConnectSheet({ onConnected }: { onConnected: (conversationId: string) => void }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const codes = useMyCodes();
  const generate = useGenerateCode();
  const revoke = useRevokeCode();
  const redeem = useRedeemCode();

  const latest = (codes.data ?? []).find((c) => !c.used_at && !c.revoked_at) ?? null;

  const copy = async () => {
    if (!latest) return;
    try {
      await navigator.clipboard.writeText(latest.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked in preview */
    }
  };

  const submitRedeem = async () => {
    setMessage(null);
    const result = await redeem.mutateAsync(input.trim().toUpperCase());
    if (result.status === "ok") {
      setMessage("Connected. Opening your Queue…");
      window.setTimeout(() => onConnected(result.conversationId), 700);
      return;
    }
    setMessage(
      result.status === "own"
        ? "That is your own code."
        : result.status === "used"
          ? "That code has already been used."
          : result.status === "expired"
            ? "That code has expired."
            : result.status === "revoked"
              ? "That code was revoked."
              : "That code is not valid.",
    );
  };

  return (
    <div className="h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-1 flex-col justify-center p-3">
          {latest && (
            <p className="text-center text-[10px] font-semibold text-muted-foreground">
              expires {timeAgo(latest.expires_at)}
            </p>
          )}
          <p className="mt-1 text-center font-display text-[2rem] font-semibold leading-none tracking-code text-ink">
            {latest ? latest.code : "········"}
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
            <Button
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
              className="h-11 rounded-2xl text-xs font-semibold"
            >
              <Zap weight="regular" />
              {generate.isPending ? "Generating…" : latest ? "New code" : "Generate code"}
            </Button>
            <IconButton
              label={copied ? "Copied" : "Copy code"}
              disabled={!latest}
              onClick={() => void copy()}
              className="size-11 rounded-2xl bg-muted text-ink [&_svg]:size-4"
            >
              {copied ? <Check weight="regular" /> : <Copy weight="regular" />}
            </IconButton>
            <IconButton
              label="Revoke code"
              disabled={!latest || revoke.isPending}
              onClick={() => latest && revoke.mutate(latest.id)}
              className="size-11 rounded-2xl bg-muted text-destructive [&_svg]:size-4"
            >
              <Trash weight="regular" />
            </IconButton>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 px-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-1 flex-col justify-center p-3">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
              setMessage(null);
            }}
            maxLength={8}
            placeholder="Enter their code"
            className="h-12 rounded-2xl border-0 bg-muted px-4 text-center font-display text-lg shadow-none tracking-code focus-visible:ring-2"
          />
          {message && (
            <p
              className={cn(
                "mt-2 text-xs font-semibold",
                message.startsWith("Connected") ? "text-status" : "text-destructive",
              )}
            >
              {message}
            </p>
          )}
          <Button
            onClick={() => void submitRedeem()}
            disabled={redeem.isPending || input.trim().length < 8}
            className="mt-3 h-11 w-full rounded-2xl text-xs font-semibold"
          >
            {redeem.isPending ? "Connecting…" : "Connect privately"}
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
