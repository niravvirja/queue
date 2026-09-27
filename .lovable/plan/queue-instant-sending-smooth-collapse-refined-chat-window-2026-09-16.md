# Queue: instant sending, smooth collapse, refined chat window

## 1. Messages and attachments appear instantly

Today a message only shows up after encryption, upload, insert, notification insert and a full refetch all finish. That is why sending feels slow.

- Show the message in the transcript the moment Send is tapped, with a "sending" tick, then swap it for the real one when the server confirms.
- Do the same for photos, files and voice notes, using a local preview of the picked file so the bubble is visible immediately while the encrypted upload continues in the background.
- Clear the composer and scroll to the bottom instantly instead of waiting on the network.
- Move the recipient notification and push send off the critical path so the sender is never blocked by them.
- On failure, keep the bubble with a clear "Failed — tap to retry" state instead of silently dropping it.
- Refresh the list in place after confirmation, so no full-screen reload flash occurs.

## 2. Status and recent-calls collapse

On Chats the status rail fades on scroll but still occupies its full height, so the conversation sheet never moves up and the fade looks broken. On Calls the quick-call strip does not react to scroll at all.

- Make both areas genuinely collapse: height, opacity, scale and spacing animate together, driven continuously by scroll position rather than a repeated React state update.
- The conversation/call sheet rises by exactly the amount the rail shrinks, so nothing jumps or flickers at the collapse point.
- Collapse is fully reversible on scroll back, the fixed header and bottom bar stay put, and reduced-motion users get the same layout without motion.
- Apply the identical treatment to the Calls "Call again" strip so both screens behave the same.

## 3. Chat window redesign

Refine the conversation screen to a modern messaging standard while keeping Queue's black / off-white / pastel identity and Sora + Manrope type.

- Header: compact avatar, name, live presence or animated typing dots, and clean call/video/more actions with consistent touch targets.
- Bubbles: tighter asymmetric corner shapes, comfortable max width, generous but consistent vertical rhythm, and grouping of consecutive messages from the same person with one timestamp per group.
- Metadata: time and delivery ticks sit in a reserved slot inside the bubble so heights never shift; states cover sending, sent, delivered and read.
- Day dividers as quiet centered pills; smooth arrival motion for new messages only, never replayed for history.
- Media: images and videos as rounded edge-to-edge tiles with correct aspect ratio and a soft loading shimmer; files as a compact row with type, name and size; voice notes with a proper waveform-style bar, duration and play state.
- Composer: rounded pill anchored above the safe area, stable height at narrow widths, attachment and voice actions with clear pressed states, and a send button that animates in when text exists.
- Background: subtle Queue-mark pattern kept quiet enough for full text legibility in both tones.

## Validation

- Send text, photo, file and voice note on a slow connection and confirm each appears instantly with correct progression to a confirmed state, plus a visible retry on failure.
- Scroll Chats and Calls up and down and confirm smooth, reversible collapse with no jump, flicker or overlap.
- Review the chat at narrow and standard phone widths for clipping, spacing and readable media.
- Confirm no console or runtime errors after the changes.

## Technical notes

- Optimistic updates via React Query `onMutate` / `onError` / `onSettled` on the message and media mutations in the data layer, keyed per conversation.
- Replace the scroll listener plus `setState` collapse with Motion `useScroll` and `useTransform` motion values so no re-render happens per frame.
- Presentation-only changes for the chat window, reusing the existing AI Elements conversation and prompt-input foundations; encryption, realtime and calling logic stay as they are.
