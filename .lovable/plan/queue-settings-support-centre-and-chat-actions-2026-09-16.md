# Queue settings, support centre and chat actions

The database and data layer already support pinning, muting, chat lock with a passcode, blocking, and support tickets. This plan finishes the screens on top of them, in Queue's existing black / off-white / pastel language with Sora and Manrope type.

## 1. Calmer lists

- Remove the grey hover highlight from every row in the settings list, the chat list, the calls list and the notifications list.
- Rows respond to touch instead: a small press-down scale and a brief tint that fades out, matching the rest of the app.
- Keep row heights, dividers, avatars and spacing exactly as they are today.

## 2. Real settings pages

Each settings row opens its own screen with the standard Queue header and back arrow.

- **Privacy & security** — read receipts and typing indicators, last-seen visibility, plus the blocked-contacts list with an unblock action and an empty state when nobody is blocked.
- **Notifications** — browser push on/off (reusing the existing push sign-up), message, call and status alert toggles, and a clear explanation when the browser has denied permission.
- **Media & storage** — the 20 MB attachment limit, auto-download preference for photos, files and voice notes, an estimate of cached media, and a clear-cache action.
- **Privacy policy** — a readable page explaining one-time codes, end-to-end encryption, what is stored and what is not, and how to delete an account.

## 3. Support centre

"Help & support" stops being a dead row and becomes a working ticket centre:

- A list of the account's tickets with subject, category, status and last-updated time, newest first, and a friendly empty state.
- "New ticket" sheet with subject, category (account, chats, calls, media, other) and description.
- Opening a ticket shows the conversation thread, lets the user add a reply, and lets them close a resolved ticket (closed tickets are read-only but still visible).

## 4. Chat actions

- The three-dot button on a chat row and a long press on the row both open the same rounded action sheet.
- Actions: **Pin / Unpin**, **Mute / Unmute**, **Lock / Unlock**, **Block contact**, **Delete chat**.
- Pinning animates: the row lifts and settles into the pinned group at the top, with a small pin marker on pinned rows. Muted rows show a muted bell and the unread badge goes quiet grey.
- Locking asks for a 4-6 digit passcode (confirmed once). A locked chat shows its name only, hides the message preview, and asks for the passcode before opening. Unlocking asks for the same passcode.
- Block and Delete both ask for confirmation and explain what happens; blocking also hides that person from status and calls.
- Every action shows a short toast and reverts cleanly if the server rejects it.

## Technical notes

- New screens are added to the existing `Screen` union in `src/components/queue-app.tsx` with the existing `navigate` transition; no new routes.
- All screens use the hooks already in `src/lib/queue-data.ts`: `useBlockedContacts`, `useBlockContact`, `useUpdateChatSettings`, `useDeleteConversation`, `useSupportTickets`, `useCreateTicket`, `useTicketUpdates`, `useAddTicketUpdate`, `useCloseTicket`. No schema changes are needed.
- The lock passcode is hashed on the device (SHA-256 with a per-conversation salt) before it is saved to `lock_pin_hash`; the passcode itself never leaves the device.
- Notification and media preferences that have no column are stored locally on the device; anything backed by the database is saved there.
- Action sheet uses the existing `BottomSheet`, long press uses a pointer-hold timer with the app's reduced-motion handling respected throughout.
