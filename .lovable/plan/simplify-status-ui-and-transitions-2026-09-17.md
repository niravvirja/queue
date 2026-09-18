# Simplify status UI and transitions

## Changes
- Remove the layered previous/next cards, scaling, shadows, and spring-like 3D movement from the status viewer.
- Make statuses full-width and use a restrained directional fade/slide when changing.
- Tighten the status header and progress area, add a clear close control, and keep tap/swipe navigation without visible previous/next controls.
- Reduce the height and spacing of the “Live now” status row so it occupies less of the inbox.
- Preserve status timing, media playback, seen tracking, text readability, and reduced-motion behavior.

## Validation
- Check status opening, tap/swipe changes, automatic progression, closing, media/text layouts, and compact inbox spacing on a phone viewport.
