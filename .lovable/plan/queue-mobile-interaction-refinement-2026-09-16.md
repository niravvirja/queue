# Queue mobile interaction refinement

## Onboarding and account access
- Remove the **Skip** action entirely.
- Keep the user on the final onboarding composition after **Enter Queue** is tapped.
- Open the compact sign-in/sign-up form as a true bottom drawer over that final screen instead of navigating to a separate account screen.
- Coordinate the drawer with the onboarding artwork: the central Queue design will smoothly reduce and settle upward while the sheet rises, with the title/progress/CTA yielding cleanly rather than disappearing sideways.
- Preserve the single mixed form with only **Display name** and **Password**, plus text links for “Create account” and “Sign in.” Submitting continues to the inbox mock.

## Navigation structure
- Remove Notifications and Profile from the bottom navigation.
- Add two matching circular actions in the inbox header: **Notifications on the left, Profile on the right** within the right-side action group, including the notification unread indicator.
- Redesign the bottom navigation as a stable, fully rounded floating pill containing only **Chats** and **Calls**. Use one consistent height, icon size, label alignment, active capsule, and touch target across both destinations.
- Keep Notifications and Profile as dedicated screens with clear back navigation instead of showing the bottom bar there.

## Motion system
- Remove horizontal full-screen entrance and exit transforms throughout onboarding, inbox, calls, notifications, profile, and chat.
- Use restrained opacity, vertical lift, and small scale changes only where they explain hierarchy; opening a conversation will feel continuous rather than like a carousel slide.
- Keep bottom drawers moving vertically from their physical origin, with a coordinated backdrop fade and spring timing.
- Retain reduced-motion behavior.

## Status and chat refinement
- Replace the current threshold-based status jump with a smooth scroll-linked collapse.
- Continuously interpolate the black header height, status opacity, scale, and vertical spacing as the conversation list scrolls; prevent flicker around the collapse point.
- Keep the conversation sheet anchored while the status area compresses so the layout feels connected and no content jumps.
- Refine message entrance and typing indicators to use short local motion only; existing messages will not replay dramatic entrances whenever a chat opens.

## Consistency pass
- Establish shared dimensions for circular icon buttons, compact inputs, primary buttons, pills, avatars, and sheet handles.
- Normalize corner radii, icon stroke sizing, gaps, labels, and fixed header/footer heights across all mobile screens.
- Ensure content areas reserve exact space for fixed controls, avoid overlap, and remain scrollbar-free visually.

## Technical notes
- Consolidate account access into the existing sheet state and remove the standalone auth-screen transition.
- Simplify tab types and navigation handlers to Chats/Calls only; route top actions directly to Notifications/Profile views.
- Use Motion layout/shared-layout animation for the onboarding-to-drawer composition and motion values for scroll-linked status collapse.
- Keep all data and account behavior mocked; no backend work is included.

## Validation
- Check the full flow at the current phone viewport: all onboarding steps → Enter Queue drawer → submit → inbox → status collapse → chat → back → calls/notifications/profile.
- Confirm no sideways transitions, no layout jumps, no overlapping fixed controls, no visible desktop scrollbar, and clean reduced-motion behavior.
