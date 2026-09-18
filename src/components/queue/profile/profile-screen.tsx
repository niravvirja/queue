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
import type { SettingsSheetKind } from "../app/types";
export function ProfileScreen({
  profile,
  onEdit,
  onLogout,
  onOpen,
}: {
  profile: Profile | null;
  onEdit: () => void;
  onLogout: () => void;
  onOpen: (screen: SettingsSheetKind) => void;
}) {
  const conversations = useConversations();

  return (
    <ScreenMotion className="relative flex flex-col overflow-hidden bg-surface px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <PageHeader title="Profile" eyebrow="Your Queue" action={<span />} />

      <div className="mt-6 flex items-center gap-3 pb-5 text-left">
        <Avatar
          initials={initialsOf(profile?.display_name ?? profile?.username)}
          tone={profile?.tone ?? "bg-pastel-blue"}
          size="md"
          online
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-lg font-semibold">
              {profile?.display_name || profile?.username || "Your profile"}
            </h2>
            <span className="shrink-0 rounded-full bg-pastel-mint px-2 py-0.5 text-[9px] font-semibold text-ink">
              {profile?.presence || "Available"}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            @{profile?.username ?? "username"}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {profile?.bio || "Add a short bio so your connections know you."}
          </p>
        </div>
        <IconButton label="Edit profile" onClick={onEdit} className="size-10 shrink-0 bg-muted">
          <Settings2 className="size-4" />
        </IconButton>
      </div>

      <div className="grid grid-cols-3 rounded-3xl bg-muted/45 py-4 text-center">
        <div>
          <p className="font-display text-lg font-semibold">{(conversations.data ?? []).length}</p>
          <p className="text-[10px] text-muted-foreground">Queues</p>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">On</p>
          <p className="text-[10px] text-muted-foreground">Encryption</p>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Private</p>
          <p className="text-[10px] text-muted-foreground">Account</p>
        </div>
      </div>

      <section className="mt-5">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase text-muted-foreground">Settings</p>
        <div>
          {[
            {
              icon: ShieldCheck,
              label: "Privacy & security",
              detail: "Blocked contacts and account safety",
              screen: "privacy" as SettingsSheetKind,
              tone: "bg-pastel-mint",
            },
            {
              icon: Bell,
              label: "Notifications",
              detail: "Calls, codes and security alerts",
              screen: "notification-settings" as SettingsSheetKind,
              tone: "bg-pastel-yellow",
            },
            {
              icon: DeviceMobile,
              label: "Media & storage",
              detail: "Downloads and data usage",
              screen: "media" as SettingsSheetKind,
              tone: "bg-pastel-blue",
            },
            {
              icon: LockKeyhole,
              label: "Privacy policy",
              detail: "How Queue protects your data",
              screen: "policy" as SettingsSheetKind,
              tone: "bg-pastel-lilac",
            },
          ].map(({ icon: Icon, label, detail, screen, tone }) => (
            <Button
              key={label}
              variant="ghost"
              onClick={() => onOpen(screen)}
              className={cn("h-16 w-full justify-start gap-3 rounded-2xl px-1 text-left", pressRow)}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full text-ink",
                  tone,
                )}
              >
                <Icon className="size-5" weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-semibold">{label}</span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  {detail}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" weight="bold" />
            </Button>
          ))}
        </div>
      </section>

      <Button
        variant="ghost"
        onClick={onLogout}
        className="mt-auto w-full justify-start rounded-xl px-2 py-6 text-destructive hover:bg-destructive/8 hover:text-destructive"
      >
        <LogOut />
        Sign out
      </Button>
    </ScreenMotion>
  );
}
