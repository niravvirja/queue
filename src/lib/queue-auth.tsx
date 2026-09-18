import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  createIdentity,
  fromB64,
  importPrivateKey,
  toB64,
  unwrapIdentity,
  type KeyRecord,
} from "@/lib/crypto";

const EMAIL_DOMAIN = "queueapp.chat";
const TONES = [
  "bg-pastel-lilac",
  "bg-pastel-blue",
  "bg-pastel-yellow",
  "bg-pastel-mint",
  "bg-pastel-blush",
];

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  tone: string;
  presence: string;
  last_seen_at?: string | null;
};

type AuthValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  privateKey: CryptoKey | null;
  needsUnlock: boolean;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@${EMAIL_DOMAIN}`;
}

export function validateUsername(username: string) {
  const value = username.trim();
  if (value.length < 3) return "Username needs at least 3 characters.";
  if (value.length > 20) return "Username can be at most 20 characters.";
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) return "Use letters, numbers, dots, dashes or underscores.";
  return null;
}

function cacheKey(userId: string) {
  return `queue.identity.${userId}`;
}

export function QueueAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, tone, presence, last_seen_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const restoreCachedKey = useCallback(async (userId: string) => {
    if (typeof window === "undefined") return false;
    const cached = window.sessionStorage.getItem(cacheKey(userId));
    if (!cached) return false;
    try {
      const key = await importPrivateKey(fromB64(cached).buffer as ArrayBuffer);
      setPrivateKey(key);
      return true;
    } catch {
      window.sessionStorage.removeItem(cacheKey(userId));
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
        const restored = await restoreCachedKey(data.session.user.id);
        setNeedsUnlock(!restored);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setPrivateKey(null);
        setNeedsUnlock(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, restoreCachedKey]);

  const storeKey = useCallback(async (userId: string, pkcs8: ArrayBuffer) => {
    const key = await importPrivateKey(pkcs8);
    setPrivateKey(key);
    setNeedsUnlock(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(cacheKey(userId), toB64(pkcs8));
    }
  }, []);

  const signUp = useCallback(
    async (username: string, password: string) => {
      const problem = validateUsername(username);
      if (problem) throw new Error(problem);
      if (password.length < 8) throw new Error("Password needs at least 8 characters.");

      const { data: available, error: availableError } = await supabase.rpc("username_available", {
        p_username: username,
      });
      if (availableError) throw new Error("Could not check that username. Try again.");
      if (!available) throw new Error("That username is already taken.");

      const email = usernameToEmail(username);
      const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("already")
            ? "That username is already taken."
            : error.message,
        );
      }

      let activeSession = signUpData.session;
      if (!activeSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw new Error(signInError.message);
        activeSession = signInData.session;
      }
      if (!activeSession?.user) throw new Error("Could not start your session.");

      const userId = activeSession.user.id;
      const tone = TONES[Math.floor(Math.random() * TONES.length)]!;
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        username: username.trim(),
        display_name: username.trim(),
        tone,
      });
      if (profileError && !profileError.message.includes("duplicate")) {
        throw new Error("Could not create your profile.");
      }

      const identity = await createIdentity(password);
      const { error: keyError } = await supabase.from("user_keys").insert({
        user_id: userId,
        ...identity,
      });
      if (keyError) throw new Error("Could not set up encryption for your account.");

      const pkcs8 = await unwrapIdentity(identity, password);
      await storeKey(userId, pkcs8);
      setSession(activeSession);
      await loadProfile(userId);
    },
    [loadProfile, storeKey],
  );

  const loadAndUnlockKeys = useCallback(
    async (userId: string, password: string) => {
      const { data } = await supabase
        .from("user_keys")
        .select("public_key, wrapped_private_key, salt, iv")
        .eq("user_id", userId)
        .maybeSingle();

      if (!data) {
        // Account exists without keys (interrupted sign-up) — create them now.
        const identity = await createIdentity(password);
        await supabase.from("user_keys").insert({ user_id: userId, ...identity });
        const fresh = await unwrapIdentity(identity, password);
        await storeKey(userId, fresh);
        return;
      }

      try {
        const pkcs8 = await unwrapIdentity(data as KeyRecord, password);
        await storeKey(userId, pkcs8);
      } catch {
        throw new Error("That password can't unlock your encrypted chats.");
      }
    },
    [storeKey],
  );

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) throw new Error("Wrong username or password.");
      if (!data.session?.user) throw new Error("Could not start your session.");
      setSession(data.session);
      await loadProfile(data.session.user.id);
      await loadAndUnlockKeys(data.session.user.id, password);
    },
    [loadAndUnlockKeys, loadProfile],
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!user) throw new Error("You're signed out.");
      await loadAndUnlockKeys(user.id, password);
    },
    [loadAndUnlockKeys, user],
  );

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined" && user) {
      window.sessionStorage.removeItem(cacheKey(user.id));
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPrivateKey(null);
    setNeedsUnlock(false);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [loadProfile, user]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      privateKey,
      needsUnlock: needsUnlock && !privateKey,
      signUp,
      signIn,
      unlock,
      signOut,
      refreshProfile,
    }),
    [
      loading,
      session,
      user,
      profile,
      privateKey,
      needsUnlock,
      signUp,
      signIn,
      unlock,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useQueueAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useQueueAuth must be used inside QueueAuthProvider");
  return ctx;
}
