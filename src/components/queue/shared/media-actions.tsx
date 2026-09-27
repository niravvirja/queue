import type { Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MediaAction = {
  label: string;
  Icon: Icon;
  tone: string;
  action: () => void;
};

export function MediaActionGrid({ actions }: { actions: MediaAction[] }) {
  return (
    <div
      className={cn(
        "grid gap-2 pb-2",
        actions.length === 2 ? "grid-cols-2" : actions.length === 3 ? "grid-cols-3" : "grid-cols-4",
      )}
    >
      {actions.map(({ label, Icon, tone, action }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          onClick={action}
          className="h-auto min-w-0 flex-col gap-2 rounded-2xl bg-transparent px-1 py-2 text-center hover:bg-muted/70"
        >
          <span className={cn("grid size-11 place-items-center rounded-full text-ink", tone)}>
            <Icon className="size-5" />
          </span>
          <span className="w-full truncate font-display text-[11px] font-semibold">{label}</span>
        </Button>
      ))}
    </div>
  );
}