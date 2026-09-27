import { createFileRoute } from "@tanstack/react-router";
import { QueueApp } from "@/components/queue-app";

const TITLE = "Queue — Private Chat, Calls & Status by One-Time Code";
const DESCRIPTION =
  "Queue is an encrypted messenger with no phone numbers. Share a one-time code, start a private chat, call, or post a status that only your people see.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "private chat app, encrypted messaging, no phone number messenger, invite code chat, secure calls",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Queue",
          applicationCategory: "CommunicationApplication",
          operatingSystem: "Web, iOS, Android",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: QueueApp,
});
