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
import { supabase } from "@/integrations/supabase/client";
export function EditProfileSheet({ onDone }: { onDone: () => void }) {
  const { profile, refreshProfile, user } = useQueueAuth();
  const [draft, setDraft] = useState({
    display_name: profile?.display_name ?? "",
    bio: profile?.bio ?? "",
    presence: profile?.presence ?? "Available",
  });
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!user) return;
        setBusy(true);
        await supabase.from("profiles").update(draft).eq("id", user.id);
        await refreshProfile();
        setBusy(false);
        onDone();
      }}
    >
      <p className="text-xs font-semibold text-muted-foreground">Personal details</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">Edit your profile</h2>
      <div className="my-6 flex justify-center">
        <Avatar
          initials={initialsOf(draft.display_name || profile?.username)}
          tone={profile?.tone ?? "bg-pastel-blue"}
          size="lg"
        />
      </div>
      <div className="space-y-4">
        <Field label="Display name">
          <Input
            value={draft.display_name}
            onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
            className="h-11 rounded-2xl bg-muted px-4"
          />
        </Field>
        <Field label="Bio">
          <Input
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            className="h-11 rounded-2xl bg-muted px-4"
          />
        </Field>
        <Field label="Presence">
          <Input
            value={draft.presence}
            onChange={(e) => setDraft({ ...draft, presence: e.target.value })}
            className="h-11 rounded-2xl bg-muted px-4"
          />
        </Field>
      </div>
      <Button type="submit" disabled={busy} className="mt-6 h-12 w-full rounded-full">
        {busy ? "Saving…" : "Save changes"}
        <Check />
      </Button>
    </form>
  );
}
