# Simplify onboarding and account forms

## What will change
- Replace the final “Enter Queue” action with two equal, neutral buttons: **Register** and **Log in**.
- Open the account sheet directly in the selected mode, without a colored mode switcher inside it.
- Redesign the sheet as a compact, minimal form with only the selected title, username, password, one short security note, and submit action.
- Keep field-level notes in reserved space so errors never shift the layout.
- Briefly shake only the invalid field when local validation or account authentication fails; respect reduced-motion preferences.
- Preserve the existing registration, login, password visibility, and validation behavior.

## Technical details
- Store the selected account mode in the onboarding parent and pass it into the account form.
- Use Motion keyframes for a small horizontal shake keyed by validation attempts.
- Reuse the current design tokens, shared inputs, buttons, and Phosphor icons; no new packages or backend changes.
- Verify both Register and Log in flows at the current mobile viewport, including empty-field error states.
