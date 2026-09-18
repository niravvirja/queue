# Queue navigation and active-status refinement

## Navigation motion
- Remove the shared full-screen opacity animation from Chats, Calls, chat, notifications, and profile so switching screens never flashes or changes perceived brightness.
- Keep only local motion that communicates state: drawers, the onboarding artwork, typing dots, and small control feedback.
- Switch Chats and Calls in place without an exit-first wait or overlapping translucent screens.

## Status and active queues
- Separate the fixed inbox identity row from the collapsible status rail.
- Rebuild collapse as a reversible, scroll-linked motion: the rail smoothly compresses, fades, and moves slightly upward while the conversation area expands by the same amount.
- Remove the “new code” item from Status so Status represents people only; rename and clarify the live state treatment without adding decorative badges.
- Keep Active queues stable while scrolling, with no threshold lock, feedback loop, or layout jump.

## Connection action and drawer
- Add the plus action directly beside Notifications in the top-right action group, followed by Profile.
- Remove the duplicate plus action from the Active queues heading.
- Open the generate/redeem connection experience as a top drawer that drops from the upper edge with a matching top handle, rounded lower corners, and a restrained backdrop.
- Preserve bottom drawers for account access, attachments, calls, and profile editing.

## Queue timing
- Remove the yellow `1h 48m` and `22h` pills from conversation rows.
- Present expiry as quiet inline metadata beside the conversation timestamp, using a clock icon and compact wording so it does not compete with unread counts.
- Simplify the open-chat presence line so typing/online status and expiry do not become one long status string.

## Validation
- Verify Chats ↔ Calls switches with no flash or brightness shift.
- Verify the status rail collapses and restores smoothly while the conversation list remains anchored.
- Verify the plus action opens and closes the top drawer, and no duplicate plus remains in the list heading.
- Verify expiry metadata aligns cleanly on narrow mobile screens and does not collide with unread counts.
