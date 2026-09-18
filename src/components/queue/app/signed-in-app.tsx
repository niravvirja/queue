import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueueAuth } from "@/lib/queue-auth";
import { useCallEngine } from "@/lib/queue-calls";
import { clearConversationKeys, useConversations, useQueueRealtime } from "@/lib/queue-data";
import { useQueuePresence, useTypingInbox } from "@/lib/queue-presence";
import { getPushPublicKey } from "@/lib/push.functions";
import { CallsScreen, CallOverlay } from "../calls/calls";
import { ChatScreen } from "../chat/chat-screen";
import { ConnectSheet } from "../connections/connect-sheet";
import { useLocalPref } from "../hooks/use-local-pref";
import { Inbox } from "../inbox/inbox-screen";
import { PermissionsScreen } from "../onboarding/permissions-screen";
import { BottomSheet, TopSheet } from "../overlays/sheets";

import { EditProfileSheet } from "../profile/edit-profile-sheet";
import { ProfileScreen } from "../profile/profile-screen";
import {
  NotificationSettingsScreen,
  MediaStorageScreen,
  PrivacyPolicyScreen,
  PrivacySecurityScreen,
} from "../settings/settings";
import { BottomNav } from "../shared/primitives";
import { StatusSheet, StatusViewer } from "../status/status";
import type { MainTab, Screen, SettingsSheetKind, SheetKind } from "./types";

type PushState = "idle" | "enabled" | "denied" | "newtab" | "unsupported";

export function SignedInApp() {
  const { profile, signOut } = useQueueAuth();
  const [screen, setScreen] = useState<Screen>("inbox");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState<number | null>(null);
  const [pushState, setPushState] = useState<PushState>("idle");
  const reduceMotion = useReducedMotion();
  const [shareLastSeen] = useLocalPref("last-seen", true);
  const [permissionsDone, setPermissionsDone] = useLocalPref("permissions-done", false);


  useQueueRealtime();
  useQueuePresence(shareLastSeen);
  useTypingInbox();
  const conversations = useConversations();
  const engine = useCallEngine();
  const active = useMemo(
    () => (conversations.data ?? []).find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations.data],
  );

  const navigate = (next: Screen) => {
    setScreen(next);
    setSheet(null);
  };
  const setTab = (tab: MainTab) => navigate(tab === "chats" ? "inbox" : tab);

  const enablePush = async () => {
    if (window.top !== window.self) return setPushState("newtab");
    if (!("Notification" in window) || !("serviceWorker" in navigator))
      return setPushState("unsupported");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setPushState("denied");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await getPushPublicKey();
      if (!publicKey) return setPushState("unsupported");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const json = subscription.toJSON();
      const { data: userData } = await supabase.auth.getUser();
      const p256dh = json.keys?.["p256dh"];
      const auth = json.keys?.["auth"];
      if (userData.user && json.endpoint && p256dh && auth) {
        // Re-subscribing yields the same endpoint, so keep one row per device.
        await supabase
          .from("push_subscriptions")
          .upsert(
            { user_id: userData.user.id, endpoint: json.endpoint, p256dh, auth },
            { onConflict: "endpoint" },
          );
      }

      setPushState("enabled");
    } catch {
      setPushState("denied");
    }
  };

  useEffect(() => {
    if (window.top !== window.self) {
      setPushState("newtab");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setPushState("idle");
      return;
    }
    let mounted = true;
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!mounted) return;
        // Permission is already granted, so silently (re)create the missing subscription.
        if (!subscription) return void enablePush();
        setPushState("enabled");
      })
      .catch(() => {
        if (mounted) setPushState("unsupported");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    clearConversationKeys();
    await signOut();
  };
  const settingsOpen =
    sheet !== null &&
    (["privacy", "notification-settings", "media", "policy"] as const).includes(
      sheet as SettingsSheetKind,
    );

  if (!permissionsDone) {
    return (
      <PermissionsScreen
        onEnablePush={enablePush}
        onDone={() => setPermissionsDone(true)}
      />
    );
  }

  return (
    <div className="relative h-full overflow-hidden">

      {(screen === "inbox" || screen === "chat") && (
        <div
          className="h-full"
          aria-hidden={screen === "chat" || undefined}
          inert={screen === "chat" || undefined}
        >
          <Inbox
            conversations={conversations.data ?? []}
            loading={conversations.isLoading}
            connectOpen={sheet === "connect"}
            onChat={(id) => {
              setActiveId(id);
              navigate("chat");
            }}
            onConnect={() => setSheet((current) => (current === "connect" ? null : "connect"))}
            onStatus={setStatusIndex}

            onAddStatus={() => setSheet("status")}
          />
        </div>
      )}
      <AnimatePresence initial={false}>
        {screen === "chat" && active && (
          <motion.div
            key="chat"
            className="absolute inset-0 z-40 overflow-hidden bg-chat will-change-[opacity,transform]"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChatScreen
              conversation={active}
              onBack={() => navigate("inbox")}
              onCall={(kind) =>
                active.peer &&
                engine.startCall(
                  active.id,
                  active.peer.id,
                  active.peer.display_name || active.peer.username,
                  kind,
                )
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
      {screen === "calls" && (
        <CallsScreen
          conversations={conversations.data ?? []}
          onConnect={() => setSheet("connect")}
          onCall={(conversation, kind) =>
            conversation.peer &&
            engine.startCall(
              conversation.id,
              conversation.peer.id,
              conversation.peer.display_name || conversation.peer.username,
              kind,
            )
          }
        />
      )}
      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          onEdit={() => setSheet("edit-profile")}
          onLogout={handleSignOut}
          onOpen={setSheet}
        />
      )}
      {(screen === "inbox" || screen === "calls" || screen === "profile") && (
        <BottomNav active={screen === "inbox" ? "chats" : screen} onTab={setTab} />
      )}

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
        {sheet === "connect" && (
          <TopSheet kind="connect" onClose={() => setSheet(null)}>
            <ConnectSheet
              onConnected={(conversationId) => {
                setActiveId(conversationId);
                setSheet(null);
                setScreen("chat");
              }}
            />
          </TopSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(sheet === "edit-profile" || sheet === "status") && (
          <BottomSheet kind={sheet} onClose={() => setSheet(null)}>
            {sheet === "edit-profile" ? (
              <EditProfileSheet onDone={() => setSheet(null)} />
            ) : (
              <StatusSheet onDone={() => setSheet(null)} />
            )}
          </BottomSheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settingsOpen && (
          <BottomSheet kind={sheet} onClose={() => setSheet(null)}>
            {sheet === "privacy" && <PrivacySecurityScreen />}
            {sheet === "notification-settings" && (
              <NotificationSettingsScreen pushState={pushState} onEnable={enablePush} />
            )}
            {sheet === "media" && <MediaStorageScreen />}
            {sheet === "policy" && <PrivacyPolicyScreen />}
          </BottomSheet>
        )}
      </AnimatePresence>
      <AnimatePresence>{engine.call && <CallOverlay engine={engine} />}</AnimatePresence>
    </div>
  );
}
