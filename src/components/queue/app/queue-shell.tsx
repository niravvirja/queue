import { AnimatePresence, useReducedMotion } from "motion/react";
import { DeviceMobile } from "@phosphor-icons/react";
import { useState } from "react";
import { useQueueAuth } from "@/lib/queue-auth";
import { AccountSheet, Onboarding, UnlockScreen } from "../auth/auth-screens";
import { BottomSheet } from "../overlays/sheets";
import { Logo } from "../shared/primitives";
import { SignedInApp } from "./signed-in-app";

export function QueueShell() {
  const { loading, session, needsUnlock } = useQueueAuth();
  const prefersReduced = useReducedMotion();
  const [onboardStep, setOnboardStep] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"create" | "signin">("create");

  return (
    <main className="h-dvh overflow-hidden bg-canvas text-foreground selection:bg-pastel-yellow">
      <section
        className="hidden h-full items-center justify-center px-8 md:flex"
        aria-labelledby="mobile-only-title"
      >
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-pastel-blue text-ink">
            <DeviceMobile className="size-7" weight="fill" aria-hidden="true" />
          </div>
          <div className="mt-8">
            <Logo />
          </div>
          <h1 id="mobile-only-title" className="mt-7 font-display text-3xl font-semibold">
            Queue is mobile only
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Open this page on your phone to continue.
          </p>
        </div>
      </section>
      <div className="h-dvh w-full max-w-none overflow-hidden bg-background md:hidden">
        {loading ? (
          <div className="grid h-full place-items-center bg-ink text-paper">
            <Logo inverse size="lg" />
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
