# Refine recording, status transitions, and unlock screen

## Changes

### Message recording
- Keep one composer shell mounted in both normal and recording states so its width, height, border, spacing, and microphone position remain identical.
- Replace only the composer’s inner content while recording: show the timer, live waveform, and a compact left-side “Slide to cancel” cue without shifting the outer row.
- Preserve press-and-hold to record, release to send, swipe left to cancel, and the microphone under the holding finger.

### Status transitions
- Transition the status background/media and text as one keyed content layer instead of crossfading them independently.
- Keep the progress hairline, identity row, close control, tap zones, and hold-to-pause fixed and uninterrupted.
- Use a very short, low-distance directional dissolve with no scaling, spring, stacked cards, or 3D effect; remove visible overlap during next/previous changes.
- Preserve image timing, real video progress, swipe navigation, automatic advance, and reduced-motion behavior.

### Unlock screen
- Redesign the screen as a centered, balanced single-column layout using the existing Sora/Manrope fonts and current semantic colors only.
- Use a clear lock emblem, concise centered title and welcome text, a polished password field with visibility control, and one strong unlock action.
- Place the alternate-account action below as a restrained text action, keep errors close to the password field, and preserve the current authentication behavior.
- Use no gradients, decorative blobs, nested cards, or new colors.

## Validation
- Compare normal and recording composer bounds at the same phone viewport and confirm no size or position jump.
- Test hold, release-to-send, swipe-to-cancel, and cancellation threshold behavior.
- Test previous, next, swipe, automatic status advance, hold-to-pause, media statuses, and reduced motion.
- Check the unlock screen with empty, filled, visible-password, busy, and error states on a phone viewport.
- Confirm the project still builds cleanly.
