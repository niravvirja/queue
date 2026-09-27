# Remove pop-up notifications and refine message groups

## Changes
- Remove the Sonner pop-up layer and all success/error toast calls so actions stay quiet.
- Tighten the chat column’s side spacing and reduce bubble padding without crowding text, timestamps, or delivery marks.
- Group consecutive messages by sender and time, breaking the shape whenever the sender changes, the day changes, or the gap is four minutes or more.
- Shape outgoing groups on the right and incoming groups on the left: the first bubble has the lower outer corner sharpened, middle bubbles flatten both outer-side corners, and the final bubble has the upper outer corner sharpened. Single messages keep the existing standalone tail shape.
- Preserve current sending, retry, media, date-divider, and typing behavior.

## Technical details
- Update the existing chat renderer’s previous/next-message checks and semantic corner classes.
- Remove the root toaster mount and Sonner import; replace mutation callbacks with silent success and existing inline/error-state behavior where available.
- Verify type safety and the latest preview build result.
