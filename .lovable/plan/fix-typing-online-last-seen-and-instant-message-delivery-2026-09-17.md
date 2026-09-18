# Fix typing, online/last seen, and instant message delivery

## What's wrong today (verified in the code)

- **Typing lingers for many seconds.** Typing is saved into the database on each keystroke and read back only when the chat list is refetched (every 15 seconds). Nothing clears it when you send a message, so your own typing signal stays "alive" long after you stopped.
- **Messages feel delayed.** Every keystroke's typing write triggers a full reload of chats *and* messages, so live updates fight with heavy refetching. New messages also reload the entire conversation instead of appending the one new message.
- **"Online" is fake.** The chat header always prints the word "online" — it is hardcoded. The "last seen" timestamp field exists in the database but nothing ever writes to it, so last seen can never be correct.
- **Typing text is wordy.** Two places show "typing" / "Ayush is typing" text; you want pure indicators.

## What I'll build

**1. Instant typing signal (no database, no lag)**
Typing moves to live in-memory signalling on a per-chat live channel: keystrokes send a lightweight "typing" ping (throttled to ~1 per 1.5s), and a "stopped" ping fires the moment you send a message, clear the box, or go idle for 2 seconds. The peer's indicator appears within a fraction of a second and disappears instantly on send. Typing stops writing to the database entirely.

**2. Real online + last seen**
Each signed-in device joins a shared live presence channel, so "online" becomes true presence — the peer shows online only while they actually have the app open. Your last-seen time is stamped when the app opens, on a slow heartbeat while open, and when you leave. The chat header then shows: a live dot + "online" when present, otherwise "last seen 5m ago" / "last seen yesterday", and your custom presence text ("Available") stays as its own badge, unchanged.

**3. Truly realtime messages**
New/edited/deleted messages update the open conversation directly from the live event instead of triggering a full reload, and the chat list updates its preview, ordering and unread badge from the same event. Optimistic bubbles reconcile with the real row so there's no flicker or duplicate. Read receipts and the chats list stop being reloaded on unrelated changes. The chat list's 15-second polling drops to a slow safety net only.

**4. Redesigned indicator (dots only)**
One shared indicator component, no words: three softly staggered dots in a small pill. In the chat list it replaces the message preview line; in the conversation it sits as a compact bubble at the bottom of the thread and in the header. Reduced-motion users get a static dimmed version.

## Notes

- No database schema change is needed. The typing column simply stops being used (kept in place, harmless).
- Live delivery for messages/chats is already enabled on the backend; presence and typing use ephemeral channels that need no tables.

## Technical detail

- New `src/lib/queue-presence.ts`: one global presence channel (`queue-presence`, key = user id) exposing `useIsOnline(userId)`, plus `useTypingChannel(conversationId)` built on `channel.send({ type: 'broadcast', event: 'typing' })` with `{ self: false }`, a 1.5s throttle on send and a 3s auto-expire on receive.
- Rewrite `useQueueRealtime` to use payload-driven `queryClient.setQueryData` for `["messages", conversationId]` and `["conversations"]` instead of blanket `invalidateQueries`; keep invalidation only for notifications/calls.
- Remove `useTypingPing`'s DB write; drop `typing` derivation from `useConversations` and source it from the typing channel in `queue-app.tsx`.
- Add a last-seen writer (mount + ~60s heartbeat + `visibilitychange`/`pagehide`) in `queue-auth.tsx`; select `last_seen_at` in the profile queries that feed the chat header.
- Replace `TypingDots` with a label-free `TypingIndicator` (variants: `list`, `bubble`, `header`) honouring `prefers-reduced-motion`; update the three call sites.
- Reduce `useConversations` `refetchInterval` to a 60s fallback.
