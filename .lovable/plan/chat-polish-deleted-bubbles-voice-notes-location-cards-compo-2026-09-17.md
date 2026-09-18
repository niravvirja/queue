# Chat polish: deleted bubbles, voice notes, location cards, composer

Refines only the chat screen's look and feel. Same palette, Sora/Manrope type, bubble shapes, grouping and encryption.

## Deleted messages

- A deleted message keeps the exact bubble colour of a normal message (black for yours, yellow for theirs) instead of turning grey.
- Inside it: a small blocked icon plus "You deleted this message" / "This message was deleted", set in the bubble's own muted tone at reduced opacity, with the normal time and tick row underneath.
- Grouped corners, spacing and reply links stay identical, so a deleted bubble no longer breaks the rhythm of a run.

## Voice notes

Modelled on how WhatsApp and Telegram present them.

- Real waveform: the audio is decoded once and its loudness sampled into evenly spaced bars, so every note looks like itself instead of a fixed pattern. A short shimmer stands in while it decodes, and a plain bar pattern is used if decoding isn't supported.
- Played part of the waveform fills solidly; the unplayed part stays faded. A round knob sits on the play position and can be dragged to scrub; tapping anywhere on the waveform jumps there.
- Bars grow slightly and settle as the playhead passes them — the smooth, springy feel of the reference apps, done with transforms only so nothing stutters.
- Round play/pause button with a crisp icon swap, live elapsed time counting up and the total when idle, a 1x / 1.5x / 2x speed pill, and a small dot marking an unplayed note.
- Recording state gets the same care: a breathing red dot, a live waveform of your own voice, the timer, and clear cancel and send actions with "slide to cancel" wording on touch.
- Reduced-motion settings turn the growth and pulse animations off.

## Shared location

- Replace the fake drawn map with a real map image of the shared point, loaded from OpenStreetMap tiles (no API key or account needed), with a pin marker pinned over the exact spot.
- Card layout follows the reference apps: map on top with rounded corners, then a compact row with "Shared location", the coordinates, and an "Open in Maps" action that still opens Google Maps.
- Faded placeholder while the tile loads, and a graceful fallback card if it can't load; both bubble colours supported.

## Composer

- The message pill holds only the attachment button and the text area — the send and voice buttons move outside it, sitting to the right as one dedicated round control.
- That control swaps between microphone and send with a quick crossfade/scale as you start and stop typing, and shows a check while editing.
- The button stays vertically aligned to the bottom of the pill at every height, keeps its touch target on small phones, and the reply/edit strip stays attached to the pill.

## Overall refinement

- Consistent icon weights and sizes, single press-feedback style, tightened bubble padding and time-row alignment, no hover-only affordances on touch, and no horizontal overflow at 320px.

## Technical notes

- All work in `src/components/queue-app.tsx` (`VoiceNotePlayer`, `LocationBubble`, deleted-bubble branch, composer area) plus small tokens in `src/styles.css` if needed. No schema or data-layer changes.
- Waveform peaks come from `AudioContext.decodeAudioData` on the fetched blob, downsampled to ~40 buckets and cached per message id; playback progress is driven by `requestAnimationFrame` rather than React state per frame.
- Map still images use `https://staticmap.openstreetmap.de/staticmap.php` style tiles with attribution; no secret required.
- Verification on the running preview: deleted bubble in both directions, voice note record → play → scrub → speed, location card load and fallback, composer swap while typing/editing, plus a console and overflow check.
