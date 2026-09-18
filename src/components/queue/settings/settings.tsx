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
import { PushStatusAction } from "../shared/primitives";
export function SettingsShell({
  title,
  eyebrow,
  onBack,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  onBack?: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col bg-surface pb-2">
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        action={
          <div className="flex gap-2">
            {onBack && (
              <IconButton label="Back" onClick={onBack} className="bg-muted">
                <ArrowLeft weight="bold" />
              </IconButton>
            )}
            {action}
          </div>
        }
      />
      {children}
    </div>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase text-muted-foreground">{title}</p>
      <div className="rounded-3xl bg-muted/45 px-3">{children}</div>
    </section>
  );
}

export function ToggleRow({
  icon: Icon,
  label,
  detail,
  checked,
  onChange,
  disabled,
  last,
}: {
  icon: typeof Bell;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center gap-3 py-3.5", !last && "mb-1", disabled && "opacity-55")}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
        <Icon className="size-5" weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold">{label}</p>
        <p className="text-[10px] leading-4 text-muted-foreground">{detail}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function PrivacySecurityScreen() {
  const blocked = useBlockedContacts();
  const blockContact = useBlockContact();
  const [readReceipts, setReadReceipts] = useLocalPref("read-receipts", true);
  const [typing, setTyping] = useLocalPref("typing", true);
  const [lastSeen, setLastSeen] = useLocalPref("last-seen", true);

  const unblock = (userId: string, name: string) => {
    void name;
    blockContact.mutate({ userId, blocked: false });
  };

  return (
    <SettingsShell title="Privacy" eyebrow="Privacy & security">
      <div className="mt-7 rounded-3xl bg-ink p-4 text-paper">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-pastel-mint text-ink">
            <ShieldCheck weight="fill" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold">End-to-end encrypted</p>
            <p className="mt-1 text-[10px] leading-4 text-paper/55">
              Messages, media and voice notes are encrypted on your device. Queue never sees them.
            </p>
          </div>
        </div>
      </div>

      <SettingsGroup title="What others see">
        <ToggleRow
          icon={CheckCheck}
          label="Read receipts"
          detail="Show double ticks when you have read a message"
          checked={readReceipts}
          onChange={setReadReceipts}
        />
        <ToggleRow
          icon={MessageCircle}
          label="Typing indicator"
          detail="Let contacts know when you are writing"
          checked={typing}
          onChange={setTyping}
        />
        <ToggleRow
          icon={Eye}
          label="Last seen"
          detail="Share when you were last active"
          checked={lastSeen}
          onChange={setLastSeen}
          last
        />
      </SettingsGroup>

      <section className="mt-6">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase text-muted-foreground">
          Blocked contacts
        </p>
        {blocked.isLoading ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : (blocked.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Prohibit className="size-7" weight="fill" />}
            title="Nobody is blocked"
            body="Block someone from a chat's menu and they will show up here."
          />
        ) : (
          <div className="rounded-3xl bg-muted/45 px-3">
            {(blocked.data ?? []).map((entry) => {
              const name =
                entry.profile?.display_name || entry.profile?.username || "Queue contact";
              return (
                <div key={entry.id} className="flex min-h-16 items-center gap-3 py-2">
                  <Avatar
                    initials={initialsOf(name)}
                    tone={entry.profile?.tone ?? "bg-pastel-blush"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Blocked {timeAgo(entry.created_at)} ago
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unblock(entry.blocked_id, name)}
                    className="rounded-full bg-surface px-4 text-xs font-semibold hover:bg-surface"
                  >
                    Unblock
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </SettingsShell>
  );
}

export function NotificationSettingsScreen({
  pushState,
  onEnable,
}: {
  pushState: string;
  onEnable: () => void;
}) {
  const [calls, setCalls] = useLocalPref("alert-calls", true);
  const [codes, setCodes] = useLocalPref("alert-codes", true);

  const pushText =
    pushState === "enabled"
      ? "Browser alerts are on for this device."
      : pushState === "newtab"
        ? "Open Queue in its own browser tab to turn alerts on."
        : pushState === "denied"
          ? "Your browser blocked alerts. Allow notifications for this site in your browser settings, then try again."
          : pushState === "unsupported"
            ? "This browser cannot show Queue alerts."
            : "Get incoming-call and security alerts even when Queue is closed.";

  return (
    <SettingsShell title="Alerts" eyebrow="Notifications">
      <div className="mt-7 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-ink p-4 text-paper">
        <div className="grid size-11 place-items-center rounded-full bg-pastel-yellow text-ink">
          <BellRing weight="duotone" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">Browser notifications</p>
          <p className="mt-1 text-[10px] leading-4 text-paper/55">{pushText}</p>
        </div>
        <PushStatusAction pushState={pushState} onEnable={onEnable} />
      </div>

      <SettingsGroup title="Alert me about">
        <ToggleRow
          icon={PhoneCall}
          label="Calls"
          detail="Incoming audio and video calls"
          checked={calls}
          onChange={setCalls}
        />
        <ToggleRow
          icon={KeyRound}
          label="Connection codes"
          detail="Used, expired or revoked codes"
          checked={codes}
          onChange={setCodes}
          last
        />
      </SettingsGroup>
      <p className="mt-4 px-1 text-[10px] leading-4 text-muted-foreground">
        Chat messages remain inside Chats and never appear in this notification centre.
      </p>
    </SettingsShell>
  );
}

export function MediaStorageScreen() {
  const [photos, setPhotos] = useLocalPref("auto-photos", true);
  const [files, setFiles] = useLocalPref("auto-files", false);
  const [voice, setVoice] = useLocalPref("auto-voice", true);
  const [cacheMb, setCacheMb] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      if (typeof navigator === "undefined" || !navigator.storage?.estimate) return setCacheMb(0);
      try {
        const { usage } = await navigator.storage.estimate();
        if (!cancelled) setCacheMb(Math.round(((usage ?? 0) / (1024 * 1024)) * 10) / 10);
      } catch {
        if (!cancelled) setCacheMb(0);
      }
    };
    void read();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearCache = async () => {
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      setCacheMb(0);
    } catch {
      setCacheMb(null);
    }
  };

  return (
    <SettingsShell title="Storage" eyebrow="Media & storage">
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-pastel-blue/60 p-4">
          <p className="font-display text-2xl font-semibold">
            {Math.round(MAX_MEDIA_BYTES / (1024 * 1024))} MB
          </p>
          <p className="mt-1 text-[10px] leading-4 text-ink/65">Largest attachment you can send</p>
        </div>
        <div className="rounded-3xl bg-muted p-4">
          <p className="font-display text-2xl font-semibold">
            {cacheMb === null ? "…" : `${cacheMb} MB`}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Cached on this device</p>
        </div>
      </div>

      <SettingsGroup title="Download automatically">
        <ToggleRow
          icon={Image}
          label="Photos"
          detail="Decrypt and show photos as they arrive"
          checked={photos}
          onChange={setPhotos}
        />
        <ToggleRow
          icon={FileIcon}
          label="Files"
          detail="Fetch documents without tapping first"
          checked={files}
          onChange={setFiles}
        />
        <ToggleRow
          icon={Mic}
          label="Voice notes"
          detail="Have voice notes ready to play instantly"
          checked={voice}
          onChange={setVoice}
          last
        />
      </SettingsGroup>

      <Button
        variant="ghost"
        onClick={() => void clearCache()}
        className="mt-6 h-12 w-full justify-start gap-3 rounded-2xl bg-muted/45 px-4 text-left hover:bg-muted/45"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
          <HardDrives className="size-5" weight="duotone" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold">Clear cached media</span>
          <span className="block text-[10px] font-normal text-muted-foreground">
            Your messages stay; only local copies are removed
          </span>
        </span>
      </Button>
    </SettingsShell>
  );
}

export function PrivacyPolicyScreen() {
  const sections = [
    {
      icon: KeyRound,
      title: "One-time codes",
      body: "Queue connections start with a single-use code that expires in 24 hours. There is no phone number, no address book upload and no people search.",
    },
    {
      icon: LockKeyhole,
      title: "End-to-end encryption",
      body: "Every message, photo, file and voice note is encrypted on your device with a key only you and your contact hold. Stored messages are unreadable to anyone else, including us.",
    },
    {
      icon: HardDrives,
      title: "What we store",
      body: "Your username, display name, bio, presence, encrypted message contents and call timings. We do not store message text, media contents or call audio in readable form.",
    },
    {
      icon: Prohibit,
      title: "What we never do",
      body: "No advertising, no selling data, no scanning your chats, no third-party trackers.",
    },
    {
      icon: Trash,
      title: "Deleting your data",
      body: "Deleting a chat removes it for both people. Your encrypted conversation data is removed with the chat.",
    },
  ];

  return (
    <SettingsShell title="Privacy policy" eyebrow="How Queue works">
      <div className="mt-7 space-y-3">
        {sections.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-3xl bg-muted/45 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
                <Icon className="size-5" weight="duotone" />
              </span>
              <h2 className="font-display text-sm font-semibold">{title}</h2>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </SettingsShell>
  );
}
