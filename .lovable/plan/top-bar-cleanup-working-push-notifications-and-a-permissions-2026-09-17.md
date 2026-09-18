# Top bar cleanup, working push notifications, and a permissions step

## 1. Remove the notifications panel, keep only the add button

Today the top of the chat list has two round buttons: a yellow "+" and a bell that opens a notifications list.

- Remove the bell button, its unread red dot, and the whole notifications panel and its list screen.
- Keep the yellow "+" button as the only action there.
- Tapping "+" now opens a panel that slides **down from the top** of the screen instead of up from the bottom. Same content as today (start a new connection), same close button, tap-outside-to-close, and drag-down-to-open animation reversed.

## 2. Why push notifications never arrive (two confirmed causes)

**Cause A — the sending keys were never set up.** Sending a web push needs a key pair (VAPID) stored in the project. The project currently has no such keys, so every send attempt quietly gives up and returns "sent: 0". No amount of allowing notifications in Chrome can fix this from the phone side.

Fix: generate the key pair and store it as three project secrets (public key, private key, contact subject). Nothing for you to paste — it is generated for you.

**Cause B — nothing triggers a push for messages.** A push is only requested when someone starts a call. Sending a text, photo, voice note or file never asks the server to notify the other person.

Fix: after a message is stored, ask the server to push the recipient, with the sender's name as the title and a neutral body (messages are encrypted, so no message text leaves the device). Respect the per-chat mute setting and skip when the recipient is actively looking at that chat.

**Also worth knowing:** inside the Lovable preview frame Chrome refuses to register notifications at all. The app already detects this; the "+"/settings screen will show a clear "open in a new tab to enable" note. Real delivery must be tested in a normal browser tab or after publishing, and on iPhone only after adding the site to the Home Screen.

Additional hardening in the same pass:
- Register the background handler on app start (not only when you press Enable) and reuse an existing registration.
- Save the device subscription so re-installing or re-allowing does not create duplicate rows, and remove stale ones.
- Surface the real outcome (enabled / blocked / not supported / open in new tab) instead of a silent failure.

## 3. Ask for device permissions right after sign-up

New one-time screen after account creation / first sign-in, before the chat list:

- Notifications — so messages and calls reach you.
- Microphone — voice notes and calls.
- Camera — video calls and photos.
- Photos, videos and files — attachments.

Each row has its own "Allow" button and shows granted / blocked state; a "Skip for now" link continues without blocking. Once completed it never shows again, and any skipped item can still be enabled later from Settings.

Note on what a browser can actually do: the web can only request notifications, microphone, camera, and open a file picker for photos/videos/files. There is no separate "phone media library" permission on the web; the file picker covers it. Contacts, SMS and full storage access are not available to a website.

## Technical notes

- `inbox-screen.tsx`: drop the bell `IconButton`, `useNotifications`/`useMarkNotificationsRead` usage and the `onNotifications` prop; keep `onConnect`.
- Delete `components/queue/notifications/notifications.tsx`; drop `"notifications"` from `Screen`/`SheetKind` in `app/types.ts` and from `signed-in-app.tsx`.
- Add a `TopSheet` to `overlays/sheets.tsx` (mirror of `BottomSheet`: `items-start`, `rounded-b-[1.75rem]`, `y: "-100%"`), used for the connect sheet.
- Generate VAPID keys and add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` secrets; `push.functions.ts` already reads them.
- Call `sendPushToUser` from the text and media send mutations in `queue-data.ts` (fire-and-forget, failures ignored) alongside the existing call trigger in `queue-calls.ts`.
- Upsert `push_subscriptions` on `endpoint` (add a unique index migration) instead of plain insert.
- New `components/queue/onboarding/permissions-screen.tsx`, gated by a local pref flag, rendered by `queue-app.tsx`/`signed-in-app.tsx` before the inbox.
