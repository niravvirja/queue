import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const pushInput = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().max(240).default(""),
  tag: z.string().max(80).optional(),
  url: z.string().max(200).optional(),
});

export const sendPushToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pushInput.parse(input))
  .handler(async ({ data, context }) => {
    // Only people you share a conversation with can trigger a push to you.
    const { data: allowed, error: checkError } = await context.supabase.rpc("shares_conversation", {
      _a: context.userId,
      _b: data.userId,
    });
    if (checkError || !allowed) return { sent: 0 };

    const subject = process.env["VAPID_SUBJECT"];
    const publicKey = process.env["VAPID_PUBLIC_KEY"];
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    if (!subject || !publicKey || !privateKey) return { sent: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", data.userId);

    if (!subs?.length) return { sent: 0 };

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    let sent = 0;

    for (const sub of subs) {
      try {
        const payload = await buildPushPayload(
          {
            data: JSON.stringify({
              title: data.title,
              body: data.body,
              tag: data.tag ?? "queue",
              data: { url: data.url ?? "/" },
            }),
            options: { ttl: 60 * 60 },
          },
          {
            endpoint: sub.endpoint,
            expirationTime: null,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          { subject, publicKey, privateKey },
        );
        const response = await fetch(sub.endpoint, payload);
        if (response.ok) sent += 1;
        if (response.status === 404 || response.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch (error) {
        console.error("[push] delivery failed", error);
      }
    }

    return { sent };
  });
