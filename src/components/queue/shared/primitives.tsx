import { motion, useReducedMotion } from "motion/react";
import { PhoneCall, ChatCircle as MessageCircle, User as UserRound } from "@phosphor-icons/react";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MainTab } from "../app/types";
export function TypingIndicator({ variant = "list" }: { variant?: "list" | "bubble" | "header" }) {
  const reduceMotion = useReducedMotion();
  const dot =
    variant === "header"
      ? "size-1.5 bg-pastel-mint"
      : variant === "bubble"
        ? "size-[7px] bg-status"
        : "size-1.5 bg-status";

  return (
    <span
      role="status"
      aria-label="Typing"
      className={cn(
        "inline-flex items-center gap-[3px]",
        variant === "bubble" && "min-h-9 px-3 py-2",
      )}
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          animate={
            reduceMotion
              ? { opacity: 0.65 }
              : { opacity: [0.4, 1, 0.4], scale: [0.88, 1, 0.88], y: [0, -2.5, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.82, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: index * 0.12 }
          }
          className={cn("rounded-full", dot)}
        />
      ))}
    </span>
  );
}

export function Logo({
  inverse = false,
  size = "md",
}: {
  inverse?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <img
      src="/favicon.png"
      alt="Queue"
      className={cn(
        "object-contain",
        inverse && "invert",
        size === "sm" ? "size-7" : size === "lg" ? "size-28" : "size-10",
      )}
    />
  );
}

export function Avatar({
  initials,
  tone = "bg-pastel-lilac",
  size = "md",
  online,
}: {
  initials: string;
  tone?: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "grid place-items-center rounded-full font-display font-semibold text-ink",
          tone,
          size === "sm"
            ? "size-9 text-[11px]"
            : size === "lg"
              ? "size-20 text-lg"
              : "size-13 text-xs",
        )}
      >
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface bg-online" />
      )}
    </div>
  );
}

export function IconButton({
  label,
  children,
  className,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn("size-10 shrink-0 rounded-full [&_svg]:size-5 [&_svg]:shrink-0", className)}
    >
      {children}
    </Button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  inverse,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div
        className={cn(
          "grid size-16 place-items-center rounded-full",
          inverse ? "bg-paper/10 text-paper" : "bg-pastel-blue text-ink",
        )}
      >
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      <p
        className={cn(
          "mt-2 max-w-[17rem] text-sm leading-6",
          inverse ? "text-paper/55" : "text-muted-foreground",
        )}
      >
        {body}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
export function ScreenMotion({
  children,
  className,
  containerRef,
}: {
  children: ReactNode;
  className?: string;
  containerRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <section ref={containerRef} className={cn("h-full min-h-0", className)}>
      {children}
    </section>
  );
}

export function MessagesSkeleton() {
  const rows = [
    { mine: false, w: "62%" },
    { mine: true, w: "48%" },
    { mine: false, w: "72%" },
    { mine: true, w: "40%" },
    { mine: false, w: "54%" },
  ];
  return (
    <div aria-hidden className="flex flex-col gap-2 px-3 py-4">
      {rows.map((row, index) => (
        <div key={index} className={cn("flex w-full", row.mine ? "justify-end" : "justify-start")}>
          <div
            style={{ width: row.w }}
            className={cn("h-10 rounded-2xl", row.mine ? "bg-ink/10" : "bg-muted-foreground/15")}
          />
        </div>
      ))}
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1 px-5 py-3">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className="flex items-center gap-3 py-2.5">
          <div className="size-11 shrink-0 rounded-full bg-muted-foreground/15" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-3 rounded-full bg-muted-foreground/15"
              style={{ width: `${52 - index * 4}%` }}
            />
            <div
              className="h-2.5 rounded-full bg-muted-foreground/10"
              style={{ width: `${78 - index * 6}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
export function BottomNav({ active, onTab }: { active: MainTab; onTab: (tab: MainTab) => void }) {
  const reduceMotion = useReducedMotion();
  const items = [
    { id: "calls" as const, label: "Calls", Icon: PhoneCall },
    { id: "chats" as const, label: "Inbox", Icon: MessageCircle },
    { id: "profile" as const, label: "Profile", Icon: UserRound },
  ];
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(20rem,calc(100%-1.5rem))] -translate-x-1/2 items-stretch gap-1 rounded-full bg-pastel-yellow p-1.5 shadow-nav"
    >
      {items.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <Button
            key={id}
            variant="ghost"
            onClick={() => onTab(id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative h-auto flex-1 flex-col gap-1 rounded-full px-3 py-2.5 text-[10px] font-semibold text-ink/55 hover:bg-transparent hover:text-ink",
              isActive && "text-ink hover:text-ink",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-pill"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
                }
                className="absolute inset-0 rounded-full bg-ink"
              />
            )}
            <Icon
              className={cn("relative z-10 size-5", isActive && "text-pastel-yellow")}
              weight={isActive ? "fill" : "regular"}
            />
            <span className={cn("relative z-10", isActive && "text-pastel-yellow")}>{label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
export function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow: string;
  action: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{eyebrow}</p>
        <h1 className="truncate font-display text-3xl font-semibold">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function StatusItem({
  initials,
  name,
  tone,
  statusCount = 1,
  seenCount = 0,
  onClick,
}: {
  initials?: string;
  name?: string;
  tone?: string;
  statusCount?: number;
  seenCount?: number;
  onClick?: () => void;
}) {
  const count = Math.max(1, statusCount);
  const gap = count === 1 ? 0 : Math.min(3, 12 / count);
  const segmentLength = 100 / count - gap;
  const allSeen = seenCount >= count;

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="h-auto shrink-0 flex-col gap-1.5 rounded-2xl p-0 text-paper hover:bg-transparent"
    >
      <div className="relative grid size-12 shrink-0 place-items-center p-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 40 40"
          className="pointer-events-none absolute inset-0 !size-full !shrink-0 -rotate-90 overflow-visible"
        >
          {Array.from({ length: count }, (_, segmentIndex) => (
            <circle
              key={segmentIndex}
              cx="20"
              cy="20"
              r="18"
              pathLength="100"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${100 - segmentLength}`}
              strokeDashoffset={-(segmentIndex * 100) / count}
              className={segmentIndex < seenCount ? "stroke-paper/20" : "stroke-pastel-yellow"}
            />
          ))}
        </svg>
        <div
          className={cn(
            "grid size-full place-items-center rounded-full font-display text-[11px] text-ink transition-opacity",
            tone,
            allSeen && "opacity-60",
          )}
        >
          {initials}
        </div>
      </div>
      <span
        className={cn(
          "max-w-14 truncate text-[10px]",
          allSeen ? "font-medium text-paper/45" : "font-semibold text-paper/80",
        )}
      >
        {name}
      </span>
    </Button>
  );
}

export function PushStatusAction({
  pushState,
  onEnable,
}: {
  pushState: string;
  onEnable: () => void;
}) {
  if (pushState === "enabled") {
    return <span className="text-xs font-semibold text-paper/70">On</span>;
  }
  if (pushState === "denied" || pushState === "unsupported") return null;
  return (
    <Button
      onClick={
        pushState === "newtab"
          ? () => window.open(window.location.href, "_blank", "noopener,noreferrer")
          : onEnable
      }
      size="sm"
      className="rounded-lg bg-paper px-3 text-ink hover:bg-pastel-yellow"
    >
      {pushState === "newtab" ? "Open" : "Enable"}
    </Button>
  );
}
