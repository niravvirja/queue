import { AnimatePresence, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useQueueAuth } from "@/lib/queue-auth";
import { AccountSheet, Onboarding, UnlockScreen } from "../auth/auth-screens";
import { BottomSheet } from "../overlays/sheets";
import { Logo } from "../shared/primitives";
import { DesktopLink } from "../link/link-device";
import { SignedInApp } from "./signed-in-app";

export function QueueShell() {
  const { loading, session, needsUnlock } = useQueueAuth();
  const prefersReduced = useReducedMotion();
  const [onboardStep, setOnboardStep] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"create" | "signin">("create");

  return (
    <main className="h-dvh overflow-hidden bg-canvas text-foreground selection:bg-accent">
      <DesktopLink />
      <div className="h-dvh w-full max-w-none overflow-hidden bg-background md:hidden">
        {loading ? (
          <div className="grid h-full place-items-center bg-ink text-paper">
            <div className="flex flex-col items-center">
              <Logo size="lg" />
              <div className="mt-6 h-1 w-16 overflow-hidden rounded-full bg-paper/12">
                <span className="block h-full w-1/2 animate-pulse rounded-full bg-accent" />
              </div>
            </div>
          </div>
        ) : !session ? (
          <>
            <Onboarding
              step={onboardStep}
              setStep={setOnboardStep}
              accountOpen={accountOpen}
              onContinue={() => setOnboardStep((step) => Math.min(step + 1, 2))}
              onAccount={(mode) => {
                setAccountMode(mode);
                setAccountOpen(true);
              }}
              reduced={Boolean(prefersReduced)}
            />
            <AnimatePresence>
              {accountOpen && (
                <BottomSheet kind="account" onClose={() => setAccountOpen(false)}>
                  <AccountSheet mode={accountMode} />
                </BottomSheet>
              )}
            </AnimatePresence>
          </>
        ) : needsUnlock ? (
          <UnlockScreen />
        ) : (
          <SignedInApp />
        )}
      </div>
    </main>
  );
}
