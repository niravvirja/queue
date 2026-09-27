# Voice notes and Inbox parity refinement

## Goal
Make Queue’s voice messages feel as polished and familiar as WhatsApp or Telegram, keep recording perfectly stable, and make every Inbox surface follow the same sizing and spacing system as Calls.

## 1. Hybrid voice-note redesign
- Remove the added card-like border, background, and outer padding from voice notes so the player sits naturally inside the existing message bubble.
- Use a compact circular play/pause control, a clean tappable waveform, a visible progress position, and one restrained metadata row for duration and playback speed.
- Keep Queue’s charcoal and green identity while borrowing WhatsApp’s immediate readability and Telegram’s compact waveform layout.
- Preserve playback, seeking, decoded waveform peaks, speed cycling, keyboard controls, and accessible labels.

## 2. Recording composer parity
- Give recording mode the exact same outer grid, width, 48px control height, border, corner radius, and microphone position as the normal message composer.
- Replace the current crowded recording contents with a stable recording dot, elapsed time, lightweight live waveform, and slide-to-cancel instruction.
- Ensure switching between typing and recording does not change the composer row height, bottom safe-area space, or surrounding message viewport.
- Keep hold-to-record, release-to-send, slide-to-cancel, and reduced-motion behavior unchanged.

## 3. Inbox and Calls visual parity
- Make the Inbox top strip use the exact Calls measurements: section height, title spacing, avatar size, item width, horizontal gap, and label baseline.
- Keep segmented status rings inside the same fixed 56px footprint as call avatars so status lines never shrink the visible avatar or change alignment.
- Align Inbox conversation rows with call-history rows for avatar size, row height, horizontal spacing, text baselines, action placement, and corner treatment while retaining chat-specific unread, typing, pin, lock, time, and delivery content.
- Align the chat action drawer with the call drawer’s opening height, close area, inner spacing, action-row height, and mobile safe-area behavior.

## 4. Final polish and validation
- Remove leftover pastel reply/highlight classes encountered on these surfaces and use only the existing semantic charcoal, green, neutral, and destructive tokens.
- Check the live app at 394×686 and a taller phone size for voice-note playback, waveform seeking, recording start/cancel/send, long contact names, multiple statuses, empty states, and drawer actions.
- Verify no vertical jump, clipped controls, horizontal overflow, runtime errors, or new build errors.

## Technical notes
- Changes are limited to chat presentation, recording presentation, Inbox/status presentation, and the shared drawer styling used by these flows.
- No messaging, encryption, calling, status, or storage logic will change.
- Existing intentional pipeline-error fixtures remain untouched.
