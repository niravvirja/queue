import { createFileRoute } from "@tanstack/react-router";
import { QueueApp } from "@/components/queue-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queue — Private Chats by Code" },
      {
        name: "description",
        content:
          "Queue is a beautifully private chat experience built around one-time connection codes.",
      },
      { property: "og:title", content: "Queue — Private Chats by Code" },
      {
        property: "og:description",
        content: "Meet, message, and call privately with one-time Queue codes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueueApp,
});
