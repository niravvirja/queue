# Queue: real accounts, real data, real calls

Replace every mock list in the app with a real database, real accounts, live updates, encrypted messages, working calls, and push notifications. The current visual design, motion, and screen flow stay exactly as they are — only the data behind them changes.

## Accounts

- Sign up and sign in with **username + password** (no email). Usernames are unique, claimed at sign-up.
- Every screen except onboarding/sign-in requires being signed in; signing out returns to onboarding.
- Profile (display name, bio, avatar, presence) is stored and editable for real.
- Because there is no email, a forgotten password cannot be recovered — the sign-up screen will say this in one line.

## Connection codes

- "Generate" creates a real one-time code stored in the database with an expiry.
- "Redeem" validates it: invalid, expired, already-used, and own-code cases each show their own state.
- A successful redeem creates a real conversation between the two people and both inboxes update instantly.
- Revoke works; used and expired codes are shown as such.

## Chats

- Conversations, messages, read state, typing indicators, delivery ticks, and unread counts all come from the database.
- Messages arrive live, without refreshing.
- **End-to-end encrypted**: each person gets a key pair created in their browser. Their private key is locked with their password and stored in that locked form, so signing in on a new device restores their chats after entering the password. The server only ever holds unreadable ciphertext.
- Attachments and voice notes are encrypted the same way before upload.

## Calls

- Real one-to-one voice and video calls between two people in their browsers.
- Real ringing: the other person's device rings live, with answer/decline, connected timer, mute, speaker, camera toggle, camera switch, and end.
- Every call is written to the call history as incoming/outgoing/missed/declined with real duration.
- Note: peer-to-peer calls connect directly between devices. On a few strict corporate or mobile networks that can fail; a paid relay service would be needed to cover those, which is not included.

## Notifications

- A real notification feed: new message, code redeemed, code expiring, missed call, security events.
- Live in-app badge and unread counts.
- **Web push** so notifications arrive with the app closed, using the browser permission prompt already in the profile screen. On iPhone this only works after adding Queue to the home screen.

## Empty states

Every list gets a designed empty state in the existing Queue style, not a blank area: no conversations yet, no calls yet, no notifications yet, no statuses yet, no active codes, no search results, plus loading skeletons and a friendly failure state with retry.

## Technical notes

- Supabase tables: `profiles`, `connection_codes`, `conversations`, `conversation_members`, `messages`, `message_receipts`, `calls`, `call_signals`, `notifications`, `push_subscriptions`, `user_keys`, `conversation_keys`. Row-level security on all of them, scoped to conversation membership; grants issued in the same migration. Realtime enabled on messages, conversations, calls, call_signals, notifications.
- Username auth via Supabase Auth using a deterministic internal email derived from the username; the username itself is never exposed as an email in the UI.
- Crypto: browser WebCrypto. ECDH P-256 identity key per user; a per-conversation AES-GCM key wrapped to each member's public key; the private key wrapped with a PBKDF2 key derived from the account password. Server-side code never sees plaintext or keys.
- Calls: WebRTC with public STUN; offer/answer/ICE exchanged through a signalling table over realtime.
- Push: VAPID key pair generated once and stored as project secrets; a service worker plus a server function that fans out pushes on new messages and calls.
- Encrypted media goes to a private Supabase storage bucket with membership-scoped policies.
- All server work uses TanStack server functions; no mock arrays remain in the codebase.

## Validation

Two accounts side by side: sign up, exchange a code, send messages both ways, confirm live delivery and encryption at rest in the database, call each other with audio and video, miss a call and see it logged, receive a push with the tab closed, sign in fresh on another browser and unlock history with the password, and check every empty state on a brand-new account.
