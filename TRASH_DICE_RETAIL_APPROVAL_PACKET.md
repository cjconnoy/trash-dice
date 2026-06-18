# Trash Dice Retail Approval Packet

Prepared: 2026-06-18T16:50:54-07:00

Status: approval pending. Do not flip live until CJ confirms retail approval is locked.

## Candidate

- Canonical route: `https://playonedaygames.com/trash-dice/play/`
- Current route state: protected review
- Game repo commit: `e4591e198ae9500e9c8f6d6960fe5962fc09efaf`
- Studio-site commit: `10ef2f034406095b905ab984cbf4e578faa5b235`
- Ship lane hash from latest sync: `D7579DAD50EFBA4225EF76EEEAE071168055CA2E04D50D4DF4922BE668A09437`

## Retail Scope Locked

- One-player HTML5 instant-play digital companion.
- No two-player retail release.
- No PWA/install ceremony.
- No iOS app work.
- No login, account, email capture, cart, coupon, purchase tracking, or PII.
- Anonymous Umami play telemetry only.
- Big Discoveries / Trash Dice retail presentation.
- Public launch route remains `/trash-dice/play/` after approval.

## Under-The-Hood Work Completed

- Added legacy-iPad-only title-screen hardware guidance:
  `For the smoothest experience, play on iPhone, desktop, or a newer iPad.`
- Removed the visible `BETA WIP - NOT LIVE` badge from the ship build and studio mirror.
- Hid `P-0`, `WIN`, and `LOSE` debug controls outside QA/review mode while preserving QA hooks.
- Updated ship QA to enforce the Retail surface:
  - beta badge absent
  - debug chrome hidden in production-like public mode
  - QA hooks absent unless explicitly requested
  - legacy iPad guidance visible only for the legacy profile
- Synced source build to:
  - `ship-html5/trash-dice.html`
  - `studio-site/play/trash-dice/play/index.html`
  - `studio-site/play/trash-dice/play/trash-dice.html`

## Latest Verification

Command:

```powershell
.\qa-ship-iteration.ps1
```

Result:

- `SHIP ITERATION QA: GREEN`
- `GREEN: sync ship mirrors`
- `GREEN: ship html5 qa`
- `GREEN: retail loop qa`

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json
```

Result timestamp: `2026-06-18T16:50:41.4717100-07:00`

- Overall status: green
- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-review`
- `/trash-dice/alpha-complete/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-frozen-alpha`
- `/trash-dice/ios-preview/`: unauthenticated `401`, state `protected-preview`
- Retired Trash Dice routes: `404`

Manual Alpha diff checks:

```powershell
git diff -- releases/alpha-complete play/trash-dice/alpha-complete
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site diff -- play/trash-dice/alpha-complete
```

Result: both empty.

Retail surface scan:

- No `BETA WIP`, `NOT LIVE`, `TD`, `TD launcher`, `beta-v2`, `2 PLAYER`, or `two-player` text in the shipped play HTML.
- Dormant disabled PWA/QR/room strings remain in non-visible legacy code paths, but QA verifies no visible PWA/two-player UI, no room panel, no manifest/service worker, no beta websocket, and no forbidden network requests.

## Approval Review Notes

- iPhone and desktop paths are accepted from Beta.
- Legacy iPad Pro 9.7 on iPadOS 16.7.16 is treated as below the smooth hardware target.
- The legacy iPad path remains playable and now gives honest non-blocking hardware guidance.
- Do not reopen legacy iPad animation tuning unless CJ explicitly reopens it.

## Still Pending Before Public Live

- CJ/retail approval must be locked.
- Final real-device smoke on the approved candidate:
  - iPhone Safari
  - desktop Chrome or Edge
  - modern iPad Safari if available
  - legacy iPad Pro 9.7 / iPadOS 16.7.16 guidance-note check
- Final public launch flip must not happen until approval is final.

## Launch Flip When Approval Lands

Do not run this before approval.

- Remove Basic Auth gate for `/trash-dice/play/`.
- Remove `/trash-dice/play/` from robots disallow/noindex/no-store posture.
- Update route contracts and monitors from `protected-review` to public/live state.
- Verify unauthenticated public `200`.
- Verify public bytes match committed studio-site build.
- Verify Alpha Complete remains protected and untouched.
- Verify iOS preview remains separate and protected.
- Verify retired routes remain retired.

## Rollback If Needed

- Restore `/trash-dice/play/` to protected review.
- Re-run route-contract guard and confirm unauthenticated `/trash-dice/play/` is back to `401`.
- Do not modify Alpha Complete during rollback.
- Keep this candidate commit intact unless CJ explicitly rejects it.

## Slack Rule

No `live`, `release ready`, or public-build announcement until the exact public route has been verified after the launch flip.
