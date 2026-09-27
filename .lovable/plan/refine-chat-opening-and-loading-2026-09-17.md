# Refine chat opening and loading

## Goal
Opening a conversation should feel intentional rather than abrupt: the contact header arrives from above, the conversation surface rises from below, and messages load without flashing an empty chat.

## Interaction
- Keep the inbox visually in place while the selected conversation opens over it.
- Animate the contact header—back button, name, presence, and call controls—in from the top.
- Animate the message area and composer together as one rounded lower drawer from the bottom.
- Use a short coordinated ease-out transition with no spring, bounce, scaling, or 3D effect.
- Reverse both motions cleanly when Back is pressed, then return control to the inbox.
- Respect reduced-motion preferences by removing travel while preserving an immediate state change.

## Loading behavior
- Show the selected person’s header immediately so the destination is always clear.
- Keep the lower drawer stable and show message placeholders only inside its conversation area while that user’s messages load.
- Replace the loading placeholders with messages through a small opacity transition, without resizing the drawer.
- Add a clear retry state if that conversation fails to load instead of incorrectly showing an empty-chat message.
- Preserve cached messages when revisiting a chat so repeat opens feel immediate.

## Technical notes
- Add an animated chat overlay boundary in the signed-in app so exit motion can finish before the chat unmounts.
- Separate the existing chat header and lower conversation surface into coordinated motion regions while preserving all messaging, calling, selection, and recording behavior.
- Continue using the existing per-conversation query and cache; no database changes are needed.

## Validation
- Test first open, cached reopen, slow loading, failed loading/retry, and Back on the mobile viewport.
- Confirm rapid switching does not show another user’s messages and that controls remain usable throughout.
- Verify reduced motion and a clean build.
