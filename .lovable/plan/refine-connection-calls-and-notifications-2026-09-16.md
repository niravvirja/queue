# Refine connection, calls, and notifications

## Connection codes
- Tighten the Generate/Redeem panel spacing so it fits comfortably on mobile.
- Replace the oversized segmented pills and code input with compact, consistent controls.
- Remove unnecessary hairline borders and keep clear selected, disabled, loading, success, and error states.
- Keep the existing code generation, copy, share, revoke, and redeem behavior unchanged.

## Calls drawer
- Open call selection in the same top-drawer pattern used by the Queue connection panel.
- Use one consistent contact picker with clearly visible voice and video actions.
- Constrain its height and scrolling so it never overflows the phone viewport.
- Keep recent calls and call history behavior unchanged.

## Notifications
- Show only important activity: connection-code events and call events; hide ordinary chat-message notifications from the notification centre and unread count.
- Stop creating in-app notification rows for new messages while preserving the chat unread count.
- Remove message, status, and message-preview settings; keep only call and security/code-related alert controls.
- Show the browser action only when it is usable: Enable when permission can be requested, Open in tab when required, instructions when blocked, unsupported status when unavailable, and a simple enabled state when active.
- Update all notification wording and empty states to match the important-only policy.

## Verification
- Check the compact mobile viewport for clipped text, overflow, and control consistency.
- Confirm the app compiles cleanly and resolve the duplicate-key warning if it comes from these lists.
