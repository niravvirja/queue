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
const ONBOARDING_SLIDES = [
  {
    tag: "CODE",
    title: "One code. One line.",
    line: "No numbers, no profiles.",
    tone: "bg-pastel-yellow",
    icon: KeyRound,
    rotate: -3,
  },
  {
    tag: "PRESENCE",
    title: "Your people, live.",
    line: "See who is here, right now.",
    tone: "bg-pastel-blush",
    icon: UserRound,
    rotate: 2.5,
  },
  {
    tag: "SEALED",
    title: "Private by design.",
    line: "Encrypted on your device.",
    tone: "bg-pastel-mint",
    icon: LockKeyhole,
    rotate: -2,
  },
] as const;

const STACK_POSE = [
  { y: 0, scale: 1, tilt: 0, opacity: 1, blur: 0 },
  { y: -14, scale: 0.945, tilt: 3.5, opacity: 0.9, blur: 0.4 },
  { y: -27, scale: 0.89, tilt: -4.5, opacity: 0.7, blur: 1 },
] as const;

function OnboardingCard({
  slide,
  pos,
  reduced,
  onAdvance,
}: {
  slide: (typeof ONBOARDING_SLIDES)[number];
  pos: number;
  reduced: boolean;
  onAdvance: () => void;
}) {
  const pose = STACK_POSE[pos] ?? STACK_POSE[2];
  const Icon = slide.icon;
  const front = pos === 0;

  return (
    <motion.div
      key={slide.tag}
      drag={front && !reduced ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 70) onAdvance();
      }}
      animate={{
        y: pose.y,
        scale: pose.scale,
        rotate: slide.rotate + pose.tilt,
        opacity: pose.opacity,
        filter: `blur(${pose.blur}px)`,
      }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
      style={{ zIndex: 10 - pos }}
      className={cn(
        "absolute inset-x-0 top-0 h-full origin-top overflow-hidden rounded-[2rem] border border-ink/5 p-5 text-ink shadow-soft",
        slide.tone,
        front ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      aria-hidden={!front}
    >
      <div className="absolute -right-10 -top-12 size-40 rounded-full bg-paper/25" />
      <div className="absolute -bottom-16 -left-8 size-36 rounded-full bg-ink/5" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between text-[9px] font-bold text-ink/45">
          <span>QUEUE / {slide.tag}</span>
          <span className="h-px w-8 bg-ink/20" />
        </div>
        <div className="relative mt-auto mb-5 size-[4.5rem]">
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-[1.5rem] bg-ink/15" />
          <motion.div
            animate={reduced || !front ? false : { y: [0, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 grid place-items-center rounded-[1.5rem] bg-ink text-paper shadow-soft"
          >
            <Icon className="size-8" weight="duotone" />
          </motion.div>
        </div>
        <h2 className="font-display text-[1.7rem] font-semibold leading-[1.05]">{slide.title}</h2>
        <p className="mt-1.5 text-[13px] leading-5 text-ink/55">{slide.line}</p>
      </div>
    </motion.div>
  );
}

export function Onboarding({
  step,
  setStep,
  onContinue,
  onAccount,
  accountOpen,
  reduced,
}: {
  step: number;
  setStep: (s: number) => void;
  onContinue: () => void;
  onAccount: (mode: "create" | "signin") => void;
  accountOpen: boolean;
  reduced: boolean;
}) {
  return (
    <ScreenMotion className="relative flex flex-col overflow-hidden bg-ink px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-paper">
      <header className="flex h-11 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo inverse />
          <span className="font-display text-sm font-semibold">Queue</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-semibold text-paper/40">
          <span>INTRO</span>
          <span className="h-px w-6 bg-paper/20" />
          <span className="text-paper">0{step + 1}</span>
          <span>/ 03</span>
        </div>
      </header>

      <motion.div
        animate={{ opacity: accountOpen ? 0.6 : 1, scale: accountOpen ? 0.96 : 1 }}
        transition={transition}
        className={cn(
          "relative mx-auto mt-6 w-full max-w-[22rem] min-h-0 flex-1",
          accountOpen && "pointer-events-none",
        )}
      >
        <div className="relative h-[min(26rem,100%)] pb-12">
          {ONBOARDING_SLIDES.map((slide, i) => (
            <OnboardingCard
              key={slide.tag}
              slide={slide}
              pos={(i - step + 3) % 3}
              reduced={reduced}
              onAdvance={() => (step === 2 ? setStep(0) : onContinue())}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: accountOpen ? 0 : 1, y: accountOpen ? 12 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn("shrink-0 pt-5", accountOpen && "pointer-events-none")}
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              aria-label={`Go to introduction ${i + 1}`}
              onClick={() => setStep(i)}
              className={cn(
                "h-1 w-full min-w-0 rounded-full p-0 transition-colors",
                step === i ? "bg-pastel-yellow" : "bg-paper/15 hover:bg-paper/30",
              )}
            />
          ))}
        </div>
        {step === 2 ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => onAccount("create")}
              className="h-12 rounded-xl bg-paper text-ink shadow-none hover:bg-paper/90"
            >
              Register
            </Button>
            <Button
              variant="outline"
              onClick={() => onAccount("signin")}
              className="h-12 rounded-xl border-paper/20 bg-paper/[0.04] text-paper shadow-none hover:bg-paper/10 hover:text-paper"
            >
              Log in
            </Button>
          </div>
        ) : (
          <Button
            onClick={onContinue}
            className="h-12 w-full rounded-xl bg-paper text-ink shadow-none hover:bg-paper/90"
          >
            Continue
            <ChevronRight />
          </Button>
        )}
      </motion.div>
    </ScreenMotion>
  );
}

export function AccountSheet({ mode }: { mode: "create" | "signin" }) {
  const { signUp, signIn } = useQueueAuth();
  const reduceMotion = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [shake, setShake] = useState({ username: 0, password: 0 });

  const showErrors = (next: { username?: string; password?: string }) => {
    setFieldErrors(next);
    setShake((current) => ({
      username: current.username + (next.username ? 1 : 0),
      password: current.password + (next.password ? 1 : 0),
    }));
  };

  const validate = () => {
    const next: { username?: string; password?: string } = {};
    const usernameProblem = validateUsername(username);
    if (usernameProblem) next.username = usernameProblem;
    if (!password) next.password = "Enter your password.";
    else if (mode === "create" && password.length < 8) {
      next.password = "Use at least 8 characters.";
    }
    showErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setFieldErrors({});
    try {
      if (mode === "create") await signUp(username, password);
      else await signIn(username, password);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      const normalized = message.toLowerCase();
      if (normalized.includes("username") && normalized.includes("password")) {
        showErrors({ username: message, password: message });
      } else if (normalized.includes("username") || normalized.includes("name")) {
        showErrors({ username: message });
      } else {
        showErrors({ password: message });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-2">
      <h2 className="font-display text-2xl font-semibold">
        {mode === "create" ? "Create account" : "Welcome back"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "create" ? "Choose your private Queue identity." : "Log in to continue to Queue."}
      </p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-3">
        <Field label="Username">
          <motion.div
            key={`username-${shake.username}`}
            animate={reduceMotion || !fieldErrors.username ? false : { x: [0, -5, 5, -3, 3, 0] }}
            transition={{ duration: 0.28 }}
          >
            <Input
              id="queue-username"
              value={username}
              autoCapitalize="none"
              autoComplete="username"
              maxLength={20}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby="queue-username-message"
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((current) => {
                    const { username: _username, ...remaining } = current;
                    return remaining;
                  });
                }
              }}
              placeholder="yourname"
              className={cn(
                "h-12 rounded-xl border-border bg-muted/35 px-4 shadow-none",
                fieldErrors.username &&
                  "border-destructive bg-destructive/5 focus-visible:ring-destructive",
              )}
            />
          </motion.div>
          <span
            id="queue-username-message"
            className={cn(
              "mt-1.5 flex min-h-4 items-center gap-1 px-2 text-[10px] font-semibold",
              fieldErrors.username ? "text-destructive" : "text-transparent",
            )}
          >
            {fieldErrors.username && <Warning className="size-3" weight="fill" />}
            {fieldErrors.username ?? "Username is available"}
          </span>
        </Field>
        <Field label="Password">
          <motion.div
            key={`password-${shake.password}`}
            animate={reduceMotion || !fieldErrors.password ? false : { x: [0, -5, 5, -3, 3, 0] }}
            transition={{ duration: 0.28 }}
            className="relative"
          >
            <Input
              id="queue-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((current) => {
                    const { password: _password, ...remaining } = current;
                    return remaining;
                  });
                }
              }}
              type={visible ? "text" : "password"}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              maxLength={128}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby="queue-password-message"
              placeholder="Your password"
              className={cn(
                "h-12 rounded-xl border-border bg-muted/35 px-4 pr-12 shadow-none",
                fieldErrors.password &&
                  "border-destructive bg-destructive/5 focus-visible:ring-destructive",
              )}
            />
            <IconButton
              label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
              className="absolute right-1.5 top-1.5 size-9 rounded-full text-muted-foreground"
            >
              {visible ? <EyeOff /> : <Eye />}
            </IconButton>
          </motion.div>
          <span
            id="queue-password-message"
            className={cn(
              "mt-1.5 flex min-h-4 items-center gap-1 px-2 text-[10px] font-semibold",
              fieldErrors.password ? "text-destructive" : "text-transparent",
            )}
          >
            {fieldErrors.password && <Warning className="size-3" weight="fill" />}
            {fieldErrors.password ?? "Password is valid"}
          </span>
        </Field>
        <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" weight="fill" />
          {mode === "create"
            ? "No email recovery. Keep this password safe."
            : "Your password unlocks your encrypted messages."}
        </p>
        <Button type="submit" disabled={busy} className="mt-1 h-12 w-full rounded-xl">
          {busy ? "Please wait…" : mode === "create" ? "Register" : "Log in"}
          <ChevronRight />
        </Button>
      </form>
    </div>
  );
}

export function UnlockScreen() {
  const { unlock, signOut, profile } = useQueueAuth();
  const reduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not unlock.");
      setShake((current) => current + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenMotion className="flex flex-col justify-center bg-ink px-6 text-paper">
      <div className="grid size-16 place-items-center rounded-2xl bg-pastel-yellow text-ink shadow-[0_10px_40px_-10px_rgba(247,212,71,0.5)]">
        <LockKeyhole className="size-7" weight="fill" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold">Unlock your messages</h1>
      <p className="mt-3 text-sm leading-6 text-paper/55">
        Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}. Enter your password
        to decrypt this device.
      </p>
      <form onSubmit={submit} className="mt-8">
        <motion.div
          key={shake}
          animate={reduceMotion || shake === 0 ? false : { x: [0, -6, 6, -4, 4, 0] }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <Input
            required
            autoFocus
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Your password"
            autoComplete="current-password"
            className={cn(
              "h-12 rounded-xl border-paper/15 bg-paper/8 px-4 pr-12 text-paper shadow-none placeholder:text-paper/40",
              error && "border-destructive bg-destructive/10 focus-visible:ring-destructive",
            )}
          />
          <IconButton
            label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
            className="absolute right-1.5 top-1.5 size-9 rounded-full text-paper/50 hover:bg-paper/10 hover:text-paper"
          >
            {visible ? <EyeOff /> : <Eye />}
          </IconButton>
        </motion.div>
        <span
          className={cn(
            "mt-1.5 flex min-h-4 items-center gap-1 px-2 text-[10px] font-semibold",
            error ? "text-destructive" : "text-transparent",
          )}
        >
          {error && <Warning className="size-3" weight="fill" />}
          {error ?? "Password is valid"}
        </span>
        <Button
          type="submit"
          disabled={busy || !password}
          className="mt-3 h-12 w-full rounded-xl bg-paper text-ink hover:bg-pastel-yellow"
        >
          {busy ? "Unlocking…" : "Unlock"}
          {!busy && <ChevronRight />}
        </Button>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 w-full text-center text-xs font-semibold text-paper/50 transition-colors hover:text-paper"
        >
          Sign out and use a different account
        </button>
      </form>
    </ScreenMotion>
  );
}
