# Queue mobile performance and visual reset

## Goal
Make Queue feel fast and stable on phones, replace the pastel system with the requested charcoal-and-green identity, simplify permissions, and refine shared media without changing messaging, encryption, calling, or account behavior.

## 1. Stable phone-height layout
- Rebuild the conversation screen as three explicit rows: fixed contact bar, one independently scrolling message area, and a composer fixed inside the visible safe area.
- Use the visual viewport and keyboard-safe sizing so the composer remains visible when the browser toolbar or keyboard changes the available height.
- Reserve the exact composer and safe-area space inside the transcript; messages will never scroll underneath or push the composer beyond the bottom edge.
- Check compact and tall phone sizes, multiline messages, reply/edit mode, recording mode, and the attachment drawer.

## 2. Lighter motion and rendering
- Remove backdrop blur from the composer, recording bar, sheets, media labels, map attribution, and other mobile overlays.
- Replace broad page-level Motion wrappers and layered enter/exit effects with direct rendering or short opacity/translate transitions where motion communicates navigation.
- Keep Motion only for interactions that need gesture values, such as status swiping and voice-note cancellation; simplify repeated animations and avoid continuous React updates where CSS or a transform can do the same work.
- Remove unnecessary `will-change`, scale, spring, and infinite decorative effects; preserve reduced-motion behavior.

## 3. Two-color Queue theme
- Convert the design tokens to **#252525** for the main background/ink and **#99BA5C** for the accent.
- Remove pastel yellow, blue, mint, lilac, and blush roles throughout onboarding, inbox, calls, chat, status, profile, settings, sheets, navigation, avatars, and loading states.
- Use only charcoal, green, and accessibility neutrals derived from them for surfaces, borders, muted text, disabled states, and contrast. Keep semantic red only for destructive actions and errors.
- Preserve Sora and Manrope, while tightening contrast and using the green accent selectively for active controls, presence, progress, and primary actions.

## 4. Minimal permission experience
- Replace the current four-card permissions screen and “Allow all” workflow with one compact, calm prompt explaining that notifications, microphone, camera, location, and file access improve calls and sharing.
- Give it one navbar-height **Allow** action and a quiet **Not now** action.
- After **Allow**, request only real browser permissions through their native prompts, in a controlled sequence, and show a concise final result instead of keeping every permission card visible.
- Keep browser limitations accurate: file/photo access remains a picker rather than a standing permission, and embedded-preview notification restrictions remain clearly handled.

## 5. Crisp Queue identity and loading
- Import the attached 768×768 Queue logo through the project asset flow and use it consistently in onboarding, signed-out loading, permission prompt, and compact brand placements.
- Replace the rough oversized loading treatment with a crisp, fixed-size logo and a lightweight green progress cue that does not blur or continuously transform the full image.
- Update the real favicon from the supplied artwork so browser chrome and installed shortcuts use the same identity.

## 6. Real status camera capture
- Separate the status camera and gallery into dedicated file inputs instead of mutating one shared input immediately before click.
- Give the camera input `accept="image/*"` and `capture="environment"`; keep gallery as `accept="image/*,video/*"` without capture.
- Reset each input after selection so repeated captures work, and retain a clear fallback for mobile browsers that choose to show a source picker.

## 7. Chat media and location redesign
- Redesign photo and video messages as clean, stable-ratio media tiles using the new two-color styling.
- Place a centered circular download button over both photos and videos; download through an explicit app action with a useful filename rather than relying on the browser’s default media controls or opening behavior.
- Keep play/pause separate and visually clear for video, with no blurred overlay.
- Replace the current OpenStreetMap image treatment with a compact Google Maps preview, a clear Queue-green location marker, coordinates/address treatment, and an obvious tap target to open the location in Maps.
- Keep file messages compact with a consistent download control and preserve encrypted media loading/error states.

## 8. Validation and cleanup
- Confirm the previously planted test-error files are absent and clear any stale route/build failure before judging the result.
- Test at narrow and standard phone widths with the top bar visible, keyboard open, long messages, reply/edit mode, voice recording, attachments, and safe-area insets.
- Test notification, microphone, camera, location, gallery, and file flows on supported mobile browsers, including denial and retry states.
- Verify photo/video downloads, map opening, status camera capture, loading/logo sharpness, reduced motion, and no overlap or off-screen composer.
- Finish with clean typecheck/build, lint, console, runtime, and network checks.

## Technical notes
- Keep the existing AI Elements conversation, message, and prompt-input foundations.
- Prefer CSS transitions and fixed grid/flex sizing; retain Motion only where gesture-driven interaction requires it.
- Use semantic theme tokens rather than hardcoded colors in components.
- Google Maps calls and rendering will use the supported Google Maps connection; no public unrestricted proxy will be introduced.
- No database schema changes are planned.