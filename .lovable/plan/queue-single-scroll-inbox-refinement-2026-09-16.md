# Queue single-scroll inbox refinement

## Inbox scrolling
- Remove the calculated status-progress state and the separate scrollable conversation region.
- Make the inbox one continuous vertical scroll surface: the black identity/status area appears first, then the conversations sheet naturally travels upward as the page scrolls, followed by its chat list.
- Keep the bottom navigation fixed above the safe area while the single content surface moves behind it.
- Give the conversations sheet enough stable height and bottom space for all rows without introducing a nested vertical scrollbar.

## Navigation
- Add Profile as a dedicated third destination in the floating bottom pill alongside Chats and Calls.
- Remove Profile from the inbox header and keep the header focused on new connection and notifications.
- Show the same three-item bottom navigation on the Profile screen; notifications remain a top-only destination.

## Connection action
- Keep the plus action beside notifications, but refine it into a crisp fixed-size control with a subtle press/rotation response only.
- Avoid looping animation, heavy spring movement, glow, or any motion that can cause lag.

## Validation
- Confirm a single upward gesture first moves the entire conversations sheet over the status area and then continues through chats without flicker.
- Confirm there is only one vertical scroll surface in the inbox.
- Confirm Chats, Calls, and Profile are all available from the stable bottom pill.
- Confirm the plus action opens the existing top drawer smoothly and remains responsive.
