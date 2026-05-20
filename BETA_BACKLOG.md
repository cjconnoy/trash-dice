# Trash Dice Beta Backlog

Last updated: 2026-05-19

This backlog is the active Beta spine for Trash Dice. CJ owns the creative feel; Codex owns the technical path, QA gates, public release safety, and regression capture.

## Priority Spine

### 1. Nearby Two-Player Mode

Status: ship-hardened for the current Beta v2 review flow, including public disconnect recovery at `8d6e71e`; still the top product/technical priority.

Intent: two people near each other, each on their own device, can start playing from QR/code/link with no account, lobby, chat, install, or explanation.

Current verified coverage:

- Public two-client create/join/start flow.
- First-player roll-off is explicitly labeled, resolves under the QA ceiling, and has tie/reroll handling.
- Deterministic Player 2 starts path with measured Player 2-to-Player 1 handoff readiness.
- Player 2 small-phone roll-panel clearance.
- Guest start rejection.
- Out-of-turn roll rejection.
- Duplicate-turn roll rejection.
- Player 2 disconnect/sleep returns Player 1 to a clean invite state with the gameplay scene reset/hidden and the trash can unable to persist above the room menu.
- Player 1 disconnect closes the room for Player 2.
- Browser QA now simulates Player 2 disappearing mid-game and asserts clean host recovery.

Ship-quality backlog:

- Extend browser QA from disconnect recovery into same-room rejoin and second-start behavior.
- Add full six-slot board cycle QA in nearby mode.
- Add end-of-game nearby-mode QA.
- Add copy/share fallback QA on browsers without Web Share or Clipboard API.
- Add real-device spot checks for iPhone Safari, Android Chrome, and iPad Safari after public releases.
- Decide whether partner demos need server-generated dice, deterministic room logs, or commit-reveal fairness beyond nearby social trust.

Definition of done:

- `.\qa-beta-enterprise.ps1` passes.
- Public two-client nearby QA passes on the exact public URL.
- Public room protocol QA passes against the Worker.
- Alpha Complete still byte-matches the frozen SHA.
- Any found gameplay stall or desync is converted into a regression test before the next review build.

### 2. QR / Join Reliability

Status: working in Beta v2, but still a platform risk because QR generation currently depends on `quickchart.io`.

Intent: Player 1 can show a QR code and Player 2 can join fast, even if share sheets, clipboard, or third-party services are flaky.

Current verified coverage:

- Host room code renders.
- QR is visible in the invite state.
- Share/copy controls are tappable on a 320px viewport.
- Invite URL includes the room code and preserves the current public path.
- Player 2 can join by code.

Ship-quality backlog:

- Move QR generation to first-party code or owned infrastructure.
- Add public QA that verifies the QR image resolves without third-party failure.
- Add screenshot/layout QA for invite state on iPad portrait.
- Add real-device scan test notes for iPhone camera, Android camera, and in-browser scanner behavior.
- Keep code and link fallbacks visible whenever QR fails.

Definition of done:

- QR, copy link, copy code, and manual code entry all pass automated QA.
- A QR-service failure leaves Player 1 with usable code/link fallbacks.
- No public release depends on an unverified third-party QR response.

### 3. iPad / Tablet Layout

Status: fixed and publicly verified in Beta v2 at `95fcf94`; guarded by `qa-beta-ipad-layout.js`.

Intent: active gameplay must fit inside iPad Safari's usable portrait viewport with the roll panel visible and tappable above browser chrome.

Current verified coverage:

- Public iPad active-game layout passes at 1024x980 desktop-class iPad Safari viewport.
- Public iPad Mini portrait layout passes at 768x920.
- Public iPhone active-game title/tagline layout passes at 390x664 and 320x568.
- `ROLL, WIN, AVOID THE BIN!` remains visible and clear below the title instead of hidden or covered.
- The in-game trash-can wordmark is visible and safely sized on tablet/phone; the old fragile separate overlay is hidden.
- The roll panel no longer slips below the visible viewport.
- The milestone badge does not overlap the roll panel.

Ship-quality backlog:

- Add invite/QR iPad layout coverage.
- Add landscape tablet layout coverage if CJ or partners actually use it.
- Add screenshot evidence capture for iPad states, not only geometry checks.
- Keep the iPad layout gate in the enterprise/public release path.

Definition of done:

- `node .\qa-beta-ipad-layout.js <public-beta-url>` passes.
- `.\qa-beta-public-build.ps1 -RunMultiplayerQa` includes iPad layout QA.
- Tablet fixes do not regress small-phone QA.

## Backlog Rule

If a new Beta issue touches nearby two-player, QR/join, or iPad/tablet layout, it is not a loose bug. It belongs in this backlog, gets a test or explicit product decision, and must be reflected in the next handoff before CJ is asked to review a build.
