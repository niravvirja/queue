# Refine status writing, plus menu, and drawer scrolling

## Status text
- Raise the status text and media-caption limit from 120 to 1,000 characters, with a live `used/1000` counter.
- Make the editor text size and spacing step down as the message grows, while keeping short statuses bold and centered.
- Apply matching adaptive sizing and safe scrolling/wrapping in the status viewer so long statuses remain readable without covering the header or controls.
- Remove the circular background from the back arrow while preserving a clear touch target and accessible label.

## Plus button and code drawer
- Keep the top-right new-connection plus button anchored in its current position when the code drawer opens.
- Raise the button above the drawer and backdrop, then rotate the same icon into a close symbol while open.
- Use that transformed button to close the drawer, without adding a second competing close control or shifting the header.

## Chats and calls drawer motion
- Preserve the existing collapsing top strip on both Inbox and Calls.
- Add a small, intentional scroll range when the list is too short, so users can always drag upward once and see the strip collapse and the white drawer rise.
- Keep normal scrolling unchanged when enough chats or calls already exist, and respect reduced-motion settings.

## Validation
- Check the 1,000-character editor and viewer with short, medium, and maximum-length text.
- Check opening and closing the code drawer to confirm the plus stays fixed, remains clickable, sits above the drawer, and rotates correctly.
- Check Inbox and Calls with empty, short, and long lists to confirm the first upward motion always works without excessive blank space.
