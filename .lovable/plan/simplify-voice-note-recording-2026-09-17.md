# Simplify voice-note recording

## Goal
Make recording feel calm, familiar, and effortless on mobile while keeping the requested hold-to-record and swipe-to-discard behavior.

## Changes
- Keep the composer fixed in place instead of sliding the entire recording surface or revealing a second destructive layer.
- Replace the current crowded recording UI with one compact row: a quiet recording dot, elapsed time, restrained waveform, and a short “Slide left to cancel” hint.
- Let only the hint and microphone affordance respond subtly to the finger’s horizontal movement; the timer and waveform remain stable.
- Cancel once the swipe crosses a forgiving threshold, with brief visual confirmation before returning to the normal composer.
- Release normally to send; short taps remain protected from accidental recording.
- Remove the trash panel, “Release to discard” state, scaling animation, heavy shadow, and competing motion.
- Respect reduced-motion preferences and keep the gesture usable across touch and pointer input.

## Validation
- Test hold, recording feedback, partial swipe recovery, completed discard, and release-to-send on the mobile viewport.
- Confirm microphone denial remains understandable and the composer returns cleanly after every outcome.
- Verify the project builds without errors.

## Technical notes
- Preserve the existing recording and upload pipeline; this is a focused interaction and presentation refinement.
- Follow the established hold-and-slide pattern used by mainstream chat apps, while intentionally omitting swipe-up locking and preview controls to keep this version simple.
