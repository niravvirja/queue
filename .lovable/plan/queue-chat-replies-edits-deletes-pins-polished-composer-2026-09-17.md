# Queue chat: replies, edits, deletes, pins, polished composer

Refines the existing chat screen only. Same fonts, colours, rounded bubbles, grouping logic, encryption and realtime channel — no redesign of other screens.

## What you'll get

**Composer**
- Starts as one line, grows upward while typing, stops at about five lines and then scrolls inside.
- Attachment and send buttons stay pinned in place at every height.
- Enter sends, Shift+Enter adds a line; on phones the keyboard's return key still makes new lines.
- Height resets the moment a message is sent or cleared; the focus ring stays inside the input pill.

**Reply**
- Reply to any message (yours or theirs) from the action sheet or by swiping the bubble — yours swipe left, theirs swipe right.
- A compact preview sits above the composer with the sender's name, a shortened quote and a close button.
- The sent bubble carries a slim quoted strip; tapping it scrolls to the original and flashes it briefly.
- If the original was deleted, the strip reads "Original message unavailable."
- Swipes need a deliberate distance, get slight resistance past the threshold, show the reply icon progressively, and never block vertical scrolling. Reduced-motion settings are respected.

**Message actions**
- Long-press on touch, right-click or an action button on desktop opens a rounded action sheet.
- Everyone: Reply, Pin/Unpin, Copy, Delete for me.
- Sender only: Edit (text messages) and Delete for everyone. Options you can't use are not shown.

**Editing**
- Loads the message into the composer with an "Editing message" strip and a cancel control.
- Enter or the send button saves; empty edits are rejected; the original time is kept and a subtle "edited" marker appears.
- Editing cancels automatically when you leave the conversation, and the change appears instantly for both people.

**Deleting**
- Delete for me hides it just for you; Delete for everyone (sender only) leaves a minimal "Message deleted" bubble for both, with its attachment removed from storage.
- Both destructive actions go through a confirmation sheet, and reply references and bubble spacing stay intact.

**Pinning**
- Each person pins for their own view. A slim pinned bar sits under the chat header; tapping cycles pins, and a compact list appears when there are several.
- Tapping a pin scrolls to and highlights that message. Unpin from the bar/list or the action sheet. Pins survive reload and don't change message order.

**Day banners**
- Messages group by local calendar day with Today / Yesterday / weekday / date labels.
- The current day's label stays gently stuck near the top while scrolling and swaps cleanly at the boundary — compact and rounded, never overlapping the header, pinned bar, or bubbles.

**Grouping, scrolling, reliability**
- Existing grouped-corner logic kept and recalculated after replies, edits, deletes and day breaks; never groups across days.
- Auto-scroll only when you're already at the bottom or just sent something; otherwise the existing new-message button appears. Scroll position is preserved when pins or edits change.
- Everything syncs live between both people with no duplicates, no full refetch, and survives reload. No horizontal overflow or visible scrollbars.

## Technical notes

Database migration (one call, with grants, indexes and policies):
- `messages`: add `reply_to_id uuid references messages(id) on delete set null`, `edited_at timestamptz`, `deleted_at timestamptz`, plus an index on `(conversation_id, created_at, id)` and on `reply_to_id`.
- New `message_hides (message_id, user_id)` and `message_pins (message_id, user_id, conversation_id, created_at)`; RLS scoped to `auth.uid()` plus `is_conversation_member`, grants to `authenticated`/`service_role`.
- `messages` currently denies UPDATE. Add a sender-only UPDATE policy (`auth.uid() = sender_id`) and a BEFORE UPDATE trigger that allows only `ciphertext`, `iv`, `edited_at`, `deleted_at`, `media_path`, `media_mime` to change, blocks edits to already-deleted rows, and forbids changing `sender_id`/`created_at`/`conversation_id`. Permissions are enforced in the database, not just the UI.
- Set `replica identity full` on `messages` and add the new tables to `supabase_realtime`.

Client:
- `queue-data.ts`: extend `ChatMessage` with `replyToId`, `editedAt`, `deletedAt`, `pinned`, plus hidden-message filtering in `useMessages`; new hooks `useEditMessage`, `useDeleteForMe`, `useDeleteForEveryone`, `useTogglePin` following the existing optimistic `patchMessages` pattern. Edits re-encrypt with the same conversation key. Delete-for-everyone also removes the storage object.
- `useQueueRealtime`: add `UPDATE` on `messages` (decode + patch in place) and `INSERT`/`DELETE` on `message_pins`/`message_hides`, with id-based dedupe. Optimistic reconciliation switches from text matching to a client-generated id echoed back so duplicates can't slip through.
- `queue-app.tsx`: `ChatScreen` gains an auto-resizing textarea (scrollHeight capped to 5 rows), reply/edit composer strips, a `SwipeableMessage` wrapper using pointer events with an axis lock, a `MessageActionsSheet` built on the existing `BottomSheet`, a `PinnedBar`, and a sticky day banner driven by an IntersectionObserver over the day separators. Day keys come from local-time `toDateString` so DST and timezone rollovers stay correct.

Verification: composer growth and Enter/Shift+Enter, reply via sheet and swipe, jump-to-original and jump-to-pin, edit and both deletes from both sides, day labels and stickiness, two-session realtime sync, mobile viewport with keyboard open, and a console/overflow check.
