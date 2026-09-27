import { AnimatePresence, motion } from "motion/react";
import {
  ChatCircle,
  Devices,
  Gear,
  PhoneCall,
  Phone,
  PhoneDisconnect,
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  User as UserIcon,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueueAuth } from "@/lib/queue-auth";
import { formatDuration, useCallEngine } from "@/lib/queue-calls";
import { clearConversationKeys, useConversations, useQueueRealtime } from "@/lib/queue-data";
import { useQueuePresence, useTypingInbox } from "@/lib/queue-presence";
import { CallsScreen } from "../calls/calls";
import { ChatScreen } from "../chat/chat-screen";
import { ConnectSheet } from "../connections/connect-sheet";
import { DevicesScreen } from "../link/link-device";
import { EditProfileSheet } from "../profile/edit-profile-sheet";
import { ProfileScreen } from "../profile/profile-screen";
import { Inbox } from "../inbox/inbox-screen";
import { StatusSheet, StatusViewer } from "../status/status";
import {
  NotificationSettingsScreen,
  PrivacyPolicyScreen,
  PrivacySecurityScreen,
} from "../settings/settings";
import { Logo } from "../shared/primitives";
import type { SheetKind } from "../app/types";

type DesktopTab = "chats" | "calls" | "devices";

/* ---------------- floating panel ---------------- */

function FloatingWindow({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center bg-overlay p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-surface"
      >
        <header className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="size-9 rounded-full"
          >
            <X weight="bold" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.section>
    </motion.div>
  );
}

/* ---------------- floating call window ---------------- */

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CallWindow({ engine }: { engine: ReturnType<typeof useCallEngine> }) {
  const { call, seconds, muted, cameraOff, localStream, remoteStream } = engine;
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
  const incoming = call.phase === "incoming";

  return (
    <motion.aside
      aria-live="polite"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={cn(
        "fixed bottom-6 right-6 z-[80] overflow-hidden rounded-3xl bg-ink text-paper",
        incoming ? "w-[22rem]" : video ? "w-[26rem]" : "w-[22rem]",
      )}
    >
      <audio ref={audioRef} autoPlay />

      {video && remoteStream && !incoming ? (
        <div className="relative aspect-video w-full bg-ink">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="size-full object-cover opacity-95"
          />
          {localStream && !cameraOff && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-3 right-3 h-24 w-16 rounded-2xl object-cover"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 pt-8">
          <div className="relative w-fit">
            <motion.span
              animate={{
                scale: call.phase === "connected" ? 1 : [1, 1.3, 1],
                opacity: call.phase === "connected" ? 0 : [0.25, 0, 0.25],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-accent"
            />
            <div className="relative grid size-20 place-items-center rounded-full bg-accent font-display text-lg font-semibold text-ink">
              {initialsOf(call.peerName)}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-6 pt-5 text-center">
        <p className="font-display text-lg font-semibold">{call.peerName}</p>
        <p className="mt-1 text-xs text-paper/55">
          {incoming
            ? `Incoming ${call.kind} call`
            : call.phase === "outgoing"
              ? "Calling securely…"
              : call.phase === "connected"
                ? `Connected · ${formatDuration(seconds)}`
                : "Call ended"}
        </p>
        {engine.error && <p className="mt-2 text-xs text-destructive">{engine.error}</p>}

        {incoming ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              onClick={() => void engine.endCall("declined")}
              className="h-12 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              <PhoneDisconnect weight="fill" />
              Decline
            </Button>
            <Button
              onClick={() => void engine.answerCall()}
              className="h-12 rounded-full bg-accent text-ink hover:bg-accent/90"
            >
              <Phone weight="fill" />
              Answer
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={engine.toggleMute}
              className={cn(
                "size-11 rounded-full text-paper hover:bg-paper/10 hover:text-paper",
                muted && "bg-paper/15",
              )}
            >
              {muted ? <MicrophoneSlash weight="fill" /> : <Microphone />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              onClick={engine.toggleCamera}
              disabled={!video}
              className={cn(
                "size-11 rounded-full text-paper hover:bg-paper/10 hover:text-paper",
                cameraOff && "bg-paper/15",
              )}
            >
              {cameraOff ? <VideoCameraSlash weight="fill" /> : <VideoCamera />}
            </Button>
            <Button
              size="icon"
              aria-label="End call"
              onClick={() => void engine.endCall()}
              className="size-11 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              <PhoneDisconnect weight="fill" />
            </Button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

/* ---------------- desktop app ---------------- */

export function DesktopApp() {
  const { profile, signOut } = useQueueAuth();
  const [tab, setTab] = useState<DesktopTab>("chats");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [statusIndex, setStatusIndex] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useQueueRealtime();
  useQueuePresence(true);
  useTypingInbox();
  const conversations = useConversations();
  const engine = useCallEngine();

  const active = useMemo(
    () => (conversations.data ?? []).find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations.data],
  );

  const call = (conversationId: string, peerId: string, name: string, kind: "audio" | "video") =>
    engine.startCall(conversationId, peerId, name, kind);

  const handleSignOut = async () => {
    clearConversationKeys();
    await signOut();
  };

  const rail: { key: DesktopTab; label: string; icon: ReactNode }[] = [
    { key: "chats", label: "Chats", icon: <ChatCircle weight="fill" /> },
    { key: "calls", label: "Calls", icon: <PhoneCall weight="fill" /> },
    { key: "devices", label: "Devices", icon: <Devices weight="fill" /> },
  ];

  return (
    <div className="hidden h-dvh w-full md:flex">
      {/* icon rail */}
      <nav className="flex w-[76px] shrink-0 flex-col items-center gap-2 bg-ink py-5">
        <Logo size="sm" />
        <div className="mt-6 flex flex-1 flex-col gap-2">
          {rail.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              size="icon"
              aria-label={item.label}
              title={item.label}
              onClick={() => setTab(item.key)}
              className={cn(
                "size-12 rounded-2xl text-paper/55 hover:bg-paper/10 hover:text-paper [&_svg]:size-5",
                tab === item.key && "bg-accent text-ink hover:bg-accent hover:text-ink",
              )}
            >
              {item.icon}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          onClick={() => setSheet("privacy")}
          className="size-12 rounded-2xl text-paper/55 hover:bg-paper/10 hover:text-paper [&_svg]:size-5"
        >
          <Gear weight="fill" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Profile"
          title="Profile"
          onClick={() => setProfileOpen(true)}
          className="size-12 rounded-2xl text-paper/55 hover:bg-paper/10 hover:text-paper [&_svg]:size-5"
        >
          <UserIcon weight="fill" />
        </Button>
      </nav>

      {/* list column */}
      <section className="relative w-[360px] shrink-0 overflow-hidden border-r border-ink/10 bg-background">
        {tab === "chats" && (
          <Inbox
            conversations={conversations.data ?? []}
            loading={conversations.isLoading}
            connectOpen={sheet === "connect"}
            onChat={setActiveId}
            onConnect={() => setSheet((current) => (current === "connect" ? null : "connect"))}
            onStatus={setStatusIndex}
            onAddStatus={() => setSheet("status")}
          />
        )}
        {tab === "calls" && (
          <CallsScreen
            conversations={conversations.data ?? []}
            onConnect={() => setSheet("connect")}
            onCall={(conversation, kind) =>
              conversation.peer &&
              call(
                conversation.id,
                conversation.peer.id,
                conversation.peer.display_name || conversation.peer.username,
                kind,
              )
            }
          />
        )}
        {tab === "devices" && (
          <div className="h-full overflow-y-auto pt-4">
            <DevicesScreen />
          </div>
        )}
      </section>

      {/* main pane */}
      <main className="relative min-w-0 flex-1 bg-chat">
        {active ? (
          <ChatScreen
            key={active.id}
            conversation={active}
            onBack={() => setActiveId(null)}
            onCall={(kind) =>
              active.peer &&
              call(
                active.id,
                active.peer.id,
                active.peer.display_name || active.peer.username,
                kind,
              )
            }
          />
        ) : (
          <div className="grid h-full place-items-center px-10 text-center">
            <div>
              <Logo size="lg" />
              <p className="mt-8 font-display text-xl font-semibold">
                {profile?.display_name ? `Hey, ${profile.display_name}` : "Queue on your computer"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a chat on the left to start talking. Everything stays end-to-end encrypted.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* floating windows */}
      <AnimatePresence>
        {statusIndex !== null && (
          <StatusViewer
            index={statusIndex}
            onChange={setStatusIndex}
            onClose={() => setStatusIndex(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && (
          <FloatingWindow title="Profile" onClose={() => setProfileOpen(false)}>
            <ProfileScreen
              profile={profile}
              onEdit={() => {
                setProfileOpen(false);
                setSheet("edit-profile");
              }}
              onLogout={handleSignOut}
              onOpen={(kind) => {
                setProfileOpen(false);
                setSheet(kind);
              }}
            />
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "connect" && (
          <FloatingWindow title="Connect" onClose={() => setSheet(null)}>
            <div className="p-5">
              <ConnectSheet
                onConnected={(conversationId) => {
                  setActiveId(conversationId);
                  setSheet(null);
                  setTab("chats");
                }}
              />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "edit-profile" && (
          <FloatingWindow title="Edit profile" onClose={() => setSheet(null)}>
            <div className="p-5">
              <EditProfileSheet onDone={() => setSheet(null)} />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "status" && (
          <FloatingWindow title="New status" onClose={() => setSheet(null)}>
            <div className="p-5">
              <StatusSheet onDone={() => setSheet(null)} />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "privacy" && (
          <FloatingWindow title="Privacy & security" onClose={() => setSheet(null)}>
            <div className="p-5">
              <PrivacySecurityScreen />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "policy" && (
          <FloatingWindow title="Privacy policy" onClose={() => setSheet(null)}>
            <div className="p-5">
              <PrivacyPolicyScreen />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "notification-settings" && (
          <FloatingWindow title="Notifications" onClose={() => setSheet(null)}>
            <div className="p-5">
              <NotificationSettingsScreen pushState="idle" onEnable={async () => undefined} />
            </div>
          </FloatingWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>{engine.call && <CallWindow engine={engine} />}</AnimatePresence>
    </div>
  );
}
