# Dedicated text status editor

## Changes
- Remove the always-visible text field from the initial status picker.
- Make the Text choice open a full-screen status composer with an immediately focused typing area.
- Use the existing pastel status colors as selectable backgrounds, with the typed message centered and sized for a status preview.
- Keep Gallery and Camera in the compact picker; only show the optional caption field after media is selected.
- Add clear back and share controls, preserve the 120-character limit, submission state, and inline error message.

## Technical details
- Keep status posting through the existing status mutation and existing bottom-sheet entry point.
- Manage picker, text-editor, and media-preview modes inside the status flow without changing stored status data.
- Verify the text editor opens from Text, accepts input immediately, changes pastel backgrounds, and posts successfully; confirm media captions still work.
