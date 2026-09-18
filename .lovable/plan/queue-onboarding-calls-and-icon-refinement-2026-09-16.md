# Queue onboarding, calls, and icon refinement

## Onboarding and access
- Rework the three onboarding steps into one consistent, quieter composition using the existing Queue mark, pastel identity shapes, dark canvas, Sora/Manrope typography, and restrained vertical motion.
- Keep the copy brief: one clear title, one short supporting line, progress, and one primary action.
- Redesign the Enter Queue bottom drawer to feel integrated with the final onboarding screen, with a cleaner heading, aligned controls, consistent input height/radius, embedded password visibility action, and one strong submit action.
- Keep the existing mocked onboarding and entry behavior unchanged.

## Calls screen
- Match the inbox structure: fixed dark identity header, rounded light conversation-style drawer, stable floating bottom navigation, and call rows inside the drawer.
- Remove the separate promotional call block so Calls feels like a true sibling of Chats rather than a generic standalone page.
- Keep recent-call identity, direction, type, time, and missed states clear and compact.

## Active call states
- Keep one end-call control throughout ringing, connected, and ended states; remove the separate “Cancel call” text action.
- Give mute, speaker, camera, camera-switch, and end-call controls icon-only treatments with clear selected/disabled visuals and accessible labels.
- Make ringing, connected, muted, speaker-on, camera-off, and ended states visually distinct while preserving the rounded Queue drawer language.

## Icon system
- Add Phosphor Icons and replace Queue’s user-facing Lucide icons with their Phosphor equivalents across onboarding, chat, calls, status, navigation, notifications, profile, and sheets.
- Preserve accessible names and stable 44px touch targets for icon-only controls.
- Remove the direct Lucide dependency from the Queue screen; leave third-party/generated primitives untouched unless their icons surface in Queue’s active experience, where they will also use Phosphor.

## Validation
- Verify onboarding through Enter Queue, Chats ↔ Calls navigation, opening a recent call, automatic connection, all call control state changes, ending the call, and the chat composer.
- Check standard and narrow phone widths for clipping, overlap, consistent rounded drawers, and touch targets.
- Confirm no console errors and no visible Lucide icons remain in the Queue experience.
