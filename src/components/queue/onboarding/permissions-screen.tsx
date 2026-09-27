import { BellRinging, Check } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScreenMotion } from "../shared/primitives";

type PermissionResult = "idle" | "requesting" | "complete";

export function PermissionsScreen({
  onEnablePush,
  onDone,
}: {
  onEnablePush: () => Promise<void> | void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<PermissionResult>("idle");
  const [granted, setGranted] = useState(0);

  const requestLocation = () =>
    new Promise<boolean>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    });

  const allow = async () => {
    setState("requesting");
    let allowed = 1; // File access uses the phone's native picker when it is needed.
    await onEnablePush();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") allowed += 1;

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        allowed += 1;
      } catch {
        // The user can enable this later when starting a call or voice note.
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        allowed += 1;
      } catch {
        // Camera capture still falls back to the phone's native camera picker.
      }
    }

    if (await requestLocation()) allowed += 1;
    setGranted(allowed);
    setState("complete");
  };

  const complete = state === "complete";

  return (
    <ScreenMotion className="flex h-full flex-col bg-ink px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-paper">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8 text-center">
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="grid size-16 place-items-center rounded-2xl bg-accent text-ink"
        >
          {complete ? (
            <Check className="size-7" weight="bold" />
          ) : (
            <BellRinging className="size-7" weight="duotone" />
          )}
        </motion.div>
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.06 }}
          className="mt-6 max-w-xs font-display text-[1.8rem] font-semibold leading-tight"
        >
          {complete ? "Queue is ready" : "Stay in the loop"}
        </motion.h1>
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.12 }}
          className="mt-3 max-w-sm text-sm leading-6 text-paper/60"
        >
          {complete
            ? `${granted} of 5 access options are ready. You can change them later in your browser settings.`
            : "Allow access so calls, alerts, location sharing, and attachments work when you need them."}
        </motion.p>
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.18 }}
        className="grid shrink-0 grid-cols-2 gap-3"
      >
        <Button
          onClick={onDone}
          disabled={state === "requesting"}
          className="h-12 rounded-full border border-accent bg-transparent text-accent shadow-none hover:bg-accent/10 hover:text-accent"
        >
          Skip
        </Button>
        <Button
          onClick={() => (complete ? onDone() : void allow())}
          disabled={state === "requesting"}
          className="h-12 rounded-full bg-accent text-ink shadow-none hover:bg-accent/90"
        >
          {complete ? "Next" : state === "requesting" ? "Waiting…" : "Allow access"}
        </Button>
      </motion.div>
    </ScreenMotion>
  );
}
