# Queue mobile UI plan

## Direction
Build the selected **Status-first Queue** direction as a polished mobile-first chat prototype. The design will use the uploaded Queue mark as its identity, `#171717` and `#F7F7F7` as the foundation, restrained pastel yellow/blush/lilac/mint/blue accents, **Sora** headings, and **Manrope** body text.

The uploaded chat concepts are visual references only; the result will be an original Queue interface centered on anonymous, one-time connection codes.

## Experience to build

1. **Onboarding and access**
   - Animated Queue-mark opening scene with tactile abstract 2D shapes.
   - Swipeable onboarding panels introducing private code-based connections.
   - Polished sign-up, sign-in, forgot-password, and confirmation states using mock validation only.
   - Forms presented as anchored sheets rather than floating cards.

2. **Status-first inbox**
   - Black upper area with Queue identity, notification access, and horizontal status rail.
   - Large off-white conversation sheet with mock avatars, unread states, typing status, expiry labels, and call indicators.
   - As the list scrolls upward, the status area compresses and disappears at a fine threshold while the conversation sheet takes over.
   - Rounded bottom navigation for chats, calls, notifications, and profile.

3. **Anonymous connection-code flow**
   - “New connection” sheet with separate Generate and Redeem modes.
   - Generate, copy, share, revoke, expiry, used, invalid, and success states.
   - One-time alphanumeric codes represented through realistic mock state transitions.

4. **Conversation experience**
   - Chat header with avatar, online/typing status, voice call, video call, and more actions.
   - Original subtle Queue-symbol wallpaper pattern inspired by messaging apps without copying WhatsApp.
   - Incoming/outgoing pastel bubbles, delivery states, replies, reactions, timestamps, date dividers, voice-note treatment, attachments, and live mock typing.
   - Stable bottom composer with attachment sheet, microphone/send state, and keyboard-safe mobile spacing.

5. **Calls, notifications, and profile**
   - Mock incoming, active, missed, ended, audio, and video call states plus a call-history screen.
   - In-app notification center with message, code, call, expiry, and security categories, each with distinct icons and read states.
   - Browser notification opt-in UI using the native browser permission flow where supported; notification delivery remains a local demo without a server.
   - Profile editing for avatar, display name, bio, presence, privacy, chat appearance, notification preferences, blocked users, and account actions.

## Interaction and motion
- Use Motion for React for spring-based sheets, status collapse, screen transitions, message arrival, typing dots, and tactile press feedback.
- Keep motion restrained and fast, with reduced-motion support.
- All controls will work against in-memory mock data: navigation, form states, code lifecycle, message sending, typing simulation, call states, notification filtering, and profile edits.

## Technical details
- Replace the intentional runtime error currently occupying the home screen.
- Keep the work frontend-only; no database, real accounts, real-time transport, calling provider, or remote push service.
- Build reusable mobile screen, sheet, navigation, chat-row, message, notification, and form primitives using the existing design system and semantic color tokens.
- Use the uploaded Queue PNG through the project asset flow and recolor it safely with CSS masking where needed.
- Load Sora and Manrope in the document head; use Lucide icons unless a custom Queue-shaped visual is more appropriate.
- Add app-specific page metadata and verify the complete flow at common mobile widths, with no clipped text or overlapping controls.

## Validation
- Check onboarding → sign-in → inbox → code flow → conversation → calls/notifications → profile as one coherent prototype.
- Verify scroll-reactive status behavior, all sheets, mock typing/call transitions, browser-notification fallback states, keyboard spacing, reduced motion, and mobile viewport fit.
- Confirm the preview builds cleanly and has no runtime or console errors.
