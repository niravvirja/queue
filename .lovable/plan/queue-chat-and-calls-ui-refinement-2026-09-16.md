# Queue chat and calls UI refinement

## Console warning
- Fix the preview session bridge so it posts only to the verified parent editor origin instead of attempting multiple fallback origins.
- Preserve shared preview login behavior while eliminating the mismatched-target `postMessage` warning.

## Chat window
- Keep Queue’s black, off-white, and pastel design with Sora/Manrope typography.
- Reduce the transcript’s side padding and let message bubbles use more of the phone width without touching the screen edges.
- Refine incoming and outgoing bubbles into consistent rounded shapes with distinct Queue colors and compact vertical rhythm.
- Anchor message time and delivery ticks in a reserved bottom-right position inside each bubble, so metadata never adds an unnecessary extra row or changes bubble height unpredictably.
- Give text, images, files, and voice notes consistent spacing, corner treatment, and readable maximum widths.
- Keep the composer fixed above the safe area with stable icon sizes and enough text space at narrow phone widths.

## Typing indicators
- Replace plain “typing…” text with a compact animated three-dot indicator and the contact’s name where space allows.
- Use the same visual language in the inbox preview, chat header, and live transcript indicator.
- Keep motion subtle, prevent surrounding content from shifting, and respect reduced-motion settings.

## Attachment drawer
- Make the paperclip open a rounded bottom action drawer instead of opening the file picker immediately.
- Offer clear actions for Photo, Camera, File, and Voice note, using the existing Queue sheet motion and pastel icon treatments.
- Route Photo and File into the existing encrypted upload flow; Camera opens the device capture picker; Voice note starts the existing recorder.
- Preserve upload progress, errors, retry behavior, encryption, and the current file-size limit.

## Recent calls
- Redesign the quick-call row to match the circular status language: rounded avatars, short labels, and compact audio/video actions in a horizontal strip.
- Keep a permanent “New call” item in the first slot, matching the dashed “Status” action, so the strip retains its structure when there is no call history.
- When contacts exist, the new-call action opens a compact contact picker; when none exist, it directs users to create a connection.
- Keep the call-history empty message below the occupied quick-call strip, with no fake calls or placeholder people.

## Validation
- Verify the warning is absent in the embedded preview and shared login still works.
- Test attachment drawer opening, dismissal, Photo/File/Camera selection, and voice recording.
- Check typing states, short and long messages, media messages, timestamps, and delivery ticks at narrow and standard phone widths.
- Check calls with no contacts, contacts but no history, and populated history; confirm fixed controls never overlap content.
- Run the project checks and inspect browser console output after the changes.

## Technical notes
- Continue using the installed AI Elements conversation, message, and prompt-input foundations.
- Keep all existing real-data, realtime, encrypted messaging, calling, and empty-state behavior intact; this work changes presentation and interaction only.
