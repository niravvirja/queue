# Refactor Queue into a production-style feature structure

## Goal

Break the current 5,123-line `queue-app.tsx` into focused feature modules without changing Queue’s appearance, behavior, data flow, encryption, realtime messaging, calls, or mobile-only presentation.

## Target structure

```text
src/components/queue/
  app/
    queue-app.tsx
    queue-shell.tsx
    signed-in-app.tsx
    types.ts
  shared/
    avatar.tsx
    logo.tsx
    icon-button.tsx
    empty-state.tsx
    screen-motion.tsx
    bottom-nav.tsx
    page-header.tsx
    feedback-sheets.tsx
  overlays/
    bottom-sheet.tsx
    top-sheet.tsx
  auth/
    onboarding.tsx
    account-sheet.tsx
    unlock-screen.tsx
  inbox/
    inbox-screen.tsx
    chat-row.tsx
    chat-actions-sheet.tsx
    chat-lock-sheet.tsx
  connections/
    connect-sheet.tsx
  status/
    status-item.tsx
    status-viewer.tsx
    status-sheet.tsx
  chat/
    chat-screen.tsx
    message-list.tsx
    message-bubble.tsx
    swipeable-message.tsx
    message-actions.tsx
    pinned-bar.tsx
    chat-composer.tsx
    attachment-actions.tsx
    media-bubble.tsx
    location-bubble.tsx
    voice-note-player.tsx
    video-note-player.tsx
  calls/
    calls-screen.tsx
    call-overlay.tsx
  notifications/
    notifications-sheet.tsx
    push-status-action.tsx
  profile/
    profile-screen.tsx
    edit-profile-sheet.tsx
  settings/
    settings-shell.tsx
    privacy-security-screen.tsx
    notification-settings-screen.tsx
    media-storage-screen.tsx
    privacy-policy-screen.tsx
  hooks/
    use-local-pref.ts
  utils/
    formatting.ts
    message-formatting.ts
  constants.ts
```

The existing `src/components/queue-app.tsx` will remain as a tiny compatibility entry that exports `QueueApp`, so the home route and public API stay stable.

## Implementation

1. **Create the dependency foundation**
   - Move shared screen/sheet types, transitions, constants, formatting helpers, message parsing helpers, and the local-preference hook into dependency-free files.
   - Keep shared modules independent of feature modules to prevent circular imports.
   - Preserve all current named exports from the existing account, data, presence, and calling libraries.

2. **Extract reusable presentation pieces**
   - Move Queue-specific primitives such as the logo, avatar, icon button, empty state, page header, navigation, motion wrapper, and sheets into `shared` and `overlays`.
   - Keep the existing design tokens, typography, dimensions, animation behavior, accessibility labels, and reduced-motion handling unchanged.

3. **Extract independent features**
   - Separate onboarding/account access, connection codes, statuses, calls, notifications, profile, and settings into their own folders.
   - Keep each feature responsible for its own local state and existing data hooks.
   - Avoid barrel files that hide circular dependencies; use explicit imports between layers.

4. **Split inbox and chat carefully**
   - Extract inbox search, status rail, chat rows, chat actions, lock/unlock, and confirmation flows.
   - Break the oversized chat screen into orchestration, message list/bubbles, selection/actions, composer, attachments, recording, and media renderers.
   - Preserve refs and state at the nearest shared owner so replies, edits, selection, pinning, retries, recording, scrolling, grouping, and typing continue to coordinate exactly as they do now.

5. **Reduce the app shell to composition**
   - Keep `QueueApp` limited to providers.
   - Keep `QueueShell` limited to loading, onboarding, signed-in, and unlock decisions.
   - Keep `SignedInApp` as the single coordinator for active screen, active conversation, global sheets, push state, realtime presence, and call overlay.
   - Do not introduce new URLs or alter the current internal mobile navigation model.

6. **Clean the supporting data organization conservatively**
   - Group the large Queue data implementation by messages/media, conversations, codes, notifications/statuses, realtime, and privacy settings behind the existing `queue-data.ts` export surface.
   - Do not remove currently exported helpers or types during this refactor, even when presently unused.
   - Keep account, presence, calling, crypto, Supabase, and push boundaries intact.

## Architecture rules

```text
route -> QueueApp entry -> app coordinators -> feature screens
                                      |-> shared UI
feature screens -> Queue data/account/presence/call APIs
shared UI and utilities -> no feature or app imports
```

- No feature module imports an app coordinator.
- Shared UI contains no Queue data fetching.
- Data hooks remain outside presentation files.
- Files should normally contain one main component, with tiny private helpers only when they are inseparable.
- This is a structural refactor only: no visual redesign, copy changes, schema changes, or new product behavior.

## Validation

- Confirm the generated route still resolves `/` through the unchanged `QueueApp` export.
- Run lint and the project’s automated compile/build checks after extraction.
- Check for import cycles, unresolved imports, duplicate declarations, and stale exports.
- Exercise onboarding/sign-in, inbox search and chat actions, connection codes, statuses, message sending/reply/edit/delete/pin, attachments and recording, calls, notifications, profile, and settings.
- Verify narrow and standard phone widths, sheet stacking, scrolling, fixed navigation/composer controls, reduced motion, browser console output, and key network requests.
