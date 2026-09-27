import { IconContext } from "@phosphor-icons/react";
import { QueueAuthProvider } from "@/lib/queue-auth";
import { QueueShell } from "./queue-shell";

export function QueueApp() {
  return (
    <IconContext.Provider value={{ size: 20, weight: "duotone", mirrored: false }}>
      <QueueAuthProvider>
        <QueueShell />
      </QueueAuthProvider>
    </IconContext.Provider>
  );
}
