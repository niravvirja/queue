import { BellRinging, Camera, FolderOpen, Microphone, Check, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo, ScreenMotion } from "../shared/primitives";

type Key = "notifications" | "microphone" | "camera" | "files";
type State = "idle" | "granted" | "blocked";

const ROWS: { key: Key; icon: typeof BellRinging; label: string; detail: string }[] = [
  {
    key: "notifications",
    icon: BellRinging,
    label: "Notifications",
    detail: "New messages and calls reach you even when Queue is closed.",
  },
  {
    key: "microphone",
    icon: Microphone,
    label: "Microphone",
    detail: "Voice notes and audio calls.",
  },
  { key: "camera", icon: Camera, label: "Camera", detail: "Video calls and quick photos." },
  {
    key: "files",
    icon: FolderOpen,
    label: "Photos, videos & files",
    detail: "Pick attachments from your phone.",
  },
];

/** One-time screen after sign-up that asks for the device permissions Queue needs. */
export function PermissionsScreen({
  onEnablePush,
  onDone,
}: {
  onEnablePush: () => Promise<void> | void;
  onDone: () => void;
}) {
  const [states, setStates] = useState<Record<Key, State>>({
    notifications: "idle",
    microphone: "idle",
    camera: "idle",
    files: "idle",
  });
  const [busy, setBusy] = useState<Key | null>(null);

  const mark = (key: Key, state: State) => setStates((prev) => ({ ...prev, [key]: state }));

  const requestMedia = async (key: "microphone" | "camera") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        key === "microphone" ? { audio: true } : { video: true },
      );
      stream.getTracks().forEach((track) => track.stop());
      mark(key, "granted");
    } catch {
      mark(key, "blocked");
    }
  };

  const request = async (key: Key) => {
    setBusy(key);
    try {
      if (key === "notifications") {
        await onEnablePush();
        const granted =
          typeof Notification !== "undefined" && Notification.permission === "granted";
        mark(key, granted ? "granted" : "blocked");
      } else if (key === "files") {
        // The web has no standing media-library permission: the picker itself is the grant.
        mark(key, "granted");
      } else {
        await requestMedia(key);
      }
    } finally {
      setBusy(null);
    }
  };

  const allowAll = async () => {
    for (const row of ROWS) {
      if (states[row.key] === "idle") await request(row.key);
    }
  };

  return (
    <ScreenMotion className="flex h-full flex-col overflow-hidden bg-ink px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-paper">
      <header className="flex h-11 shrink-0 items-center gap-2.5">
        <Logo inverse />
        <span className="font-display text-sm font-semibold">Queue</span>
      </header>

      <div className="mt-6 shrink-0">
        <h1 className="font-display text-[1.7rem] font-semibold leading-[1.1]">
          Let Queue reach you
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-paper/55">
          Allow these once so calls, voice notes and attachments just work. You can change any of
          them later in Settings.
        </p>
      </div>

      <div className="no-scrollbar mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {ROWS.map((row) => {
          const state = states[row.key];
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-paper/[0.06] p-4"
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full text-ink",
                  state === "granted" ? "bg-pastel-blue" : "bg-pastel-yellow",
                )}
              >
                <Icon weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold">{row.label}</p>
                <p className="mt-1 text-[10px] leading-4 text-paper/55">
                  {state === "granted"
                    ? "Allowed"
                    : state === "blocked"
                      ? "Blocked — allow it in your browser settings for this site."
                      : row.detail}
                </p>
              </div>
              {state === "granted" ? (
                <span className="grid size-9 place-items-center rounded-full bg-pastel-blue text-ink">
                  <Check weight="bold" className="size-4" />
                </span>
              ) : state === "blocked" ? (
                <span className="grid size-9 place-items-center rounded-full bg-paper/10 text-paper/60">
                  <X weight="bold" className="size-4" />
                </span>
              ) : (
                <Button
                  size="sm"
                  disabled={busy === row.key}
                  onClick={() => void request(row.key)}
                  className="h-9 rounded-full bg-paper px-4 text-ink shadow-none hover:bg-paper/90"
                >
                  {busy === row.key ? "…" : "Allow"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 pt-4">
        <Button
          onClick={() => void allowAll()}
          className="h-12 w-full rounded-xl bg-pastel-yellow text-ink shadow-none hover:bg-pastel-yellow/90"
        >
          Allow all
        </Button>
        <Button variant="ghost" onClick={onDone} className="mt-2 h-11 w-full rounded-xl text-paper/60 hover:bg-paper/10 hover:text-paper">
          Continue
        </Button>
      </div>
    </ScreenMotion>
  );
}
