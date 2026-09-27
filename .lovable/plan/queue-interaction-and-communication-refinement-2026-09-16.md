# Queue interaction and communication refinement

## Preserve the existing design
- Keep the current Queue palette, Sora/Manrope typography, logo, pastel assignments, and mobile layout language.
- Refine spacing, sizing, hierarchy, icon treatment, and motion without introducing a new visual direction.

## Two-stage inbox scroll
- Rebuild the inbox as one continuous scroll experience with a Motion-powered, scroll-linked sequence.
- Stage one: the status area compresses, fades, and lifts away while the conversations drawer rises from its slightly lowered resting position into its normal anchored position.
- Stage two: once the drawer reaches that position, the conversation rows continue scrolling naturally.
- Couple both movements to the same scroll progress so there is no threshold jump, flicker, nested scrolling, or static-feeling transition.
- Keep the fixed identity row and bottom navigation stable, preserve safe-area spacing, and support reduced motion.

## Status viewing
- Make each status avatar open a focused viewer rather than acting as a decorative item.
- Add clear progress, person identity, time/presence context, previous/next navigation, pause/resume behavior, close action, and automatic progression through the mock statuses.
- Use the existing pastel identity colors and restrained local transitions so the viewer feels native to Queue.

## Chat refinement
- Preserve the existing chat structure while making the header, message rhythm, voice note, typing state, composer, delivery state, and action icons more deliberate and consistent.
- Keep assistant/incoming and outgoing message treatments highly readable, with local message motion only and no full-screen transitions.
- Ensure attachment, audio call, video call, send, and voice-note controls have clear icon states and stable touch targets.

## Calling refinement
- Replace the generic call sheet presentation with a purpose-built calling experience using the same Queue visual system.
- Distinguish outgoing, incoming, connected, muted, speaker-on, camera-off, and ended states.
- During an active call, use icon-only controls with accessible labels and visible selected states for mute, speaker, camera, camera switch, and end call.
- Keep answer/decline actions unmistakable before connection, then transition cleanly into the active controls and timer.

## Reliability and consistency
- Add the missing tooltip provider at the app root so icon tooltips no longer trigger the current runtime error.
- Normalize icon sizes, circular button dimensions, pressed/selected states, sheet behavior, and reduced-motion handling across chat, calls, and status viewing.
- Keep all behavior mocked and frontend-only; no account, calling, messaging, or storage service will be added.

## Technical notes
- Use Motion scroll values and transforms for the two-stage inbox behavior, avoiding React state updates on every scroll frame.
- Use AI Elements foundations for the chat transcript and composer where compatible, while retaining Queue’s current visual styling and interaction model.
- Keep status and call state machines local and deterministic for reliable preview testing.

## Validation
- Verify the full mobile flow: inbox scroll stage one → drawer anchored → chat list scroll → status viewer navigation → chat interactions → incoming/outgoing call → connected call controls → end state.
- Confirm there are no layout jumps, nested scrollbars, overlapping fixed controls, sideways transitions, tooltip errors, or console/runtime errors.
- Check narrow and standard phone widths plus reduced-motion behavior.
