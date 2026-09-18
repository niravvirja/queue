# Status media picker and chat spacing

## Changes
- Restyle the status creation choices to match the chat attachment drawer’s compact four-item media grid and pastel circular icons.
- Keep status uploads limited to supported status media: gallery photos/videos and camera capture, while preserving text-only statuses and the existing preview/caption/share flow.
- Extract or reuse the attachment-action styling so chat and status choices remain visually consistent.
- Restore a subtle 2px vertical gap between consecutive messages from the same sender; retain the larger separation between message groups and current grouped corner shapes.

## Validation
- Verify the status sheet opens, each media choice launches the correct picker, selected photos/videos preview correctly, and text-only status posting remains available.
- Check grouped chat bubbles at the current narrow phone size and confirm they are slightly separated without losing their grouped appearance.
- Run the project checks and inspect the preview for runtime errors.
