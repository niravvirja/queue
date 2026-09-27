# Finish Queue on real data

The database, encryption, accounts, codes, chats, calls, statuses, notifications and push are already built and the screens already read real data. Two small errors remain, nothing has been tested end to end yet, and sending photos/files/voice notes was left out.

## 1. Fix the two errors blocking the preview

- Push sign-up key: the app passes the whole result object where the key text itself is expected. Pass the key text, and if no key is configured, show the "push unavailable" state instead of trying to subscribe.
- Status name: when someone has no display name or username, the name comes out empty and breaks the status bubble. Fall back to "Queue" before it is used.

## 2. Run the whole flow end to end

Two accounts side by side in the preview:

- Sign up both, confirm profiles and usernames are created.
- Generate a code on one, redeem on the other; check invalid, expired, already-used and own-code states.
- Send messages both ways and confirm they appear instantly without refreshing.
- Confirm stored messages are unreadable in the database.
- Sign in fresh in another browser and unlock history with the password.
- Place an audio call and a video call, decline one, miss one, and check the call history entries and durations.
- Post a status, mark notifications read, and check unread badges.
- Enable browser push on one account and confirm a notification arrives.
- On a brand-new account, walk every screen and confirm the "nothing here yet" states show.

Anything that breaks gets fixed as part of this step.

## 3. Photos, files and voice notes (encrypted)

- A private storage area for message media, readable only by members of that conversation.
- Attach a photo or file from the chat bar; record and send a voice note with a waveform and duration.
- Media is encrypted on the device with the same conversation key before upload, and decrypted for display or playback.
- Upload progress, failure retry, and size limits.

## Technical notes

- Fixes are in `src/components/queue-app.tsx`; `getPushPublicKey` returns `{ publicKey }`, so read `.publicKey` and guard for null.
- Media uses a private Supabase storage bucket with membership-scoped policies on `storage.objects`, plus the existing `media_path`, `media_mime` and `duration_ms` columns on `messages`.
- Testing is done in-browser against the running preview; no mock data is reintroduced anywhere.
