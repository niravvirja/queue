import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SettingsSheetKind, SheetKind } from "../app/types";
import { IconButton } from "../shared/primitives";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { transition } from "../constants";
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="pb-2">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="ghost" onClick={onCancel} className="h-12 flex-1 rounded-xl bg-muted">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="h-12 flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
export function BottomSheet({
  children,
  onClose,
  kind,
}: {
  children: ReactNode;
  onClose: () => void;
  kind: SheetKind;
}) {
  const fixedSettingsHeight =
    kind !== null &&
    (["privacy", "notification-settings", "media", "policy"] as const).includes(
      kind as SettingsSheetKind,
    );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/90 px-0 backdrop-blur-[2px] md:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${kind ?? "Queue"} sheet`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={transition}
        className={cn(
          "no-scrollbar relative w-full max-w-[430px] overflow-y-auto rounded-t-[1.75rem] bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground shadow-sheet",
          fixedSettingsHeight ? "h-[84dvh]" : "max-h-[84dvh]",
        )}
      >
        <div className="sticky top-0 z-10 flex h-13 items-center justify-end bg-surface">
          <IconButton
            label="Close sheet"
            onClick={onClose}
            className="size-8 text-muted-foreground hover:bg-muted [&_svg]:size-3.5"
          >
            <X weight="regular" />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function TopSheet({
  children,
  onClose,
  kind,
}: {
  children: ReactNode;
  onClose: () => void;
  kind: SheetKind;
}) {
  const underTopBar = kind === "connect";

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-overlay/70",
        // The connect drawer hangs below the app's own top bar instead of colliding with it.
        underTopBar && "pt-[calc(env(safe-area-inset-top)+4.25rem)]",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${kind ?? "Queue"} drawer`}
        initial={{ y: "-100%" }}
        animate={{ y: 0 }}
        exit={{ y: "-100%" }}
        transition={transition}
        className={cn(
          "no-scrollbar max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-b-[2rem] border-x border-b border-border bg-surface px-6 pb-6 text-foreground shadow-app",
          underTopBar && "pt-3",
        )}
      >
        {underTopBar ? (
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        ) : (
          <div className="sticky top-0 z-10 flex h-13 items-center bg-surface">
            <IconButton
              label="Close drawer"
              onClick={onClose}
              className="size-8 text-muted-foreground hover:bg-muted [&_svg]:size-3.5"
            >
              <X weight="regular" />
            </IconButton>
          </div>
        )}
        {children}
      </motion.div>
    </motion.div>
  );
}

export function FloatingPanel({
  children,
  onClose,
  kind,
}: {
  children: ReactNode;
  onClose: () => void;
  kind: SheetKind;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/80 px-4 backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${kind ?? "Queue"} panel`}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={transition}
        className="relative flex h-[min(540px,80dvh)] w-full max-w-[400px] flex-col overflow-hidden rounded-3xl border border-border bg-surface px-4 pb-4 text-foreground shadow-app"
      >
        <div className="flex h-10 shrink-0 items-center justify-end">
          <IconButton
            label="Close panel"
            onClick={onClose}
            className="size-8 text-muted-foreground hover:bg-muted [&_svg]:size-3.5"
          >
            <X weight="regular" />
          </IconButton>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}
