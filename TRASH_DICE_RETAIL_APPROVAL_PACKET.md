# Trash Dice Retail Approval Packet

Prepared: 2026-06-19T22:00:43-07:00

Status: approval pending. Do not flip live until CJ confirms retail approval is locked.

## Candidate

- Canonical route: `https://playonedaygames.com/trash-dice/play/`
- Current route state: protected review
- Game repo code commit: `6eb6a9ab7a96ffa8d80fc279f1d187d449ed6aca`
- Studio-site commit: `08ad9febb37785b78d3fa81d9619cf02ed2ffc3e`
- Route guard commit: `966c0bcd891d1a21a1c682893899c8ab35b1faed`
- Ship lane hash from latest sync: `3ED8B4CC2074DF852658163AB046FB4D3C18A04B7637323AE4ABF3A5BAB01F9D`
- Protected route live hash: `429660CF3571BD727C0EE5A2459A91F4F62C72567AEEA63DAB99E8AB07F4386A`

## Retail Scope Locked

- One-player HTML5 instant-play digital companion.
- Phase 1 ships as HTML/browser only.
- Supported Phase 1 browser targets: desktop, iPhone, and iPad.
- No two-player retail release.
- No PWA/install ceremony.
- No iOS app or App Store shipping work.
- No login, account, email capture, cart, coupon, purchase tracking, or PII.
- Anonymous Umami play telemetry only.
- Big Discoveries / Trash Dice retail presentation.
- Public launch route remains `/trash-dice/play/` after approval.

## Under-The-Hood Work Completed

- Added legacy-iPad-only title-screen hardware guidance:
  `For the smoothest experience, play on iPhone, desktop, or a newer iPad.`
- Tightened the legacy-iPad gate so the note appears for the forced legacy QA override or old 9.7-inch iPad/iPadOS 16-and-below profile, while newer iPadOS profiles stay on the standard iPad path.
- Improved in-game player-panel pool-count numeral readability by moving those count badges off the stylized `Bangers` face and onto `Fredoka One` with tabular numeric styling.
- Kept the in-panel `WINNER` round-win status visible through the fanfare/resolution window for both yellow/player and green/CPU wins, made it roughly 2.5x larger than the base status label, and left green/CPU round event timing unchanged.
- Applied that same roughly 2.5x larger `WINNER` status treatment to the player's game-win panel state and verified it persists through the terminal win loop until Play Again.
- Hardened the opening comeback guard so a fresh game can no longer allow green/CPU to take a third straight opening round after yellow/player has lost the first two rounds.
- Scoped later-session endurance assist to contextual player-help signals only: active only after the game is late enough and yellow is in a dice/round deficit or late low-dice pressure state; neutral late play stays unassisted, and CPU soft-brakes remain probabilistic rather than a global no-streak cap.
- Added mathematical-lock end-state copy only to the losing player's panel: `NOT ENOUGH DICE TO COME BACK`. It does not appear under the `CONGRATULATIONS!` banner or on the winning panel.
- Removed the visible `BETA WIP - NOT LIVE` badge from the ship build and studio mirror.
- Hid `P-0`, `WIN`, and `LOSE` debug controls outside QA/review mode while preserving QA hooks.
- Updated ship QA to enforce the Retail surface:
  - beta badge absent
  - debug chrome hidden in production-like public mode
  - QA hooks absent unless explicitly requested
  - legacy iPad guidance visible only for the legacy profile
  - iPadOS 18 / 9.7-inch-class QA profile remains standard iPad with no legacy guidance
  - player-panel pool-count numerals use the legible count-badge font in active gameplay
  - yellow/player and green/CPU round-win probes keep enlarged `WINNER` status visible through the fanfare window, while the green/CPU timing cap remains unchanged
  - player game-win probe keeps enlarged `WINNER` status visible through the terminal win loop and clears it after Play Again
  - opening sweep guard probe verifies that, after two green opening round wins, yellow rolls only open slots and green avoids open slots when possible
  - later-assist probes verify neutral late play does not activate help, deficit play activates soft contextual help, late low-dice pressure activates soft contextual help, and CPU soft-brakes are not hard no-streak caps
  - mathematical-lock probes verify both Green/CPU and Yellow/human loser states receive `NOT ENOUGH DICE TO COME BACK`, while the win/loss banners and winning panels stay clean
- Synced source build to:
  - `ship-html5/trash-dice.html`
  - `studio-site/play/trash-dice/play/index.html`
  - `studio-site/play/trash-dice/play/trash-dice.html`

## Latest Verification

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\qa-ship-iteration.ps1 -Sequential -Json
```

Result:

- Timestamp: `2026-06-19T21:58:47.2394493-07:00`
- `SHIP ITERATION QA: GREEN`
- `GREEN: sync ship mirrors`
- `GREEN: ship html5 qa`
- `GREEN: retail loop qa`
- Ship mirror hash: `3ED8B4CC2074DF852658163AB046FB4D3C18A04B7637323AE4ABF3A5BAB01F9D`

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json
```

Result timestamp: `2026-06-19T22:00:43.7622522-07:00`

- Overall status: green
- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-review`
- `/trash-dice/play/`: authenticated hash source green, `working tree has no Git diff against HEAD:play/trash-dice/play/index.html`
- `/trash-dice/alpha-complete/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-frozen-alpha`
- `/trash-dice/ios-preview/`: unauthenticated `401`, state `protected-preview`
- Retired Trash Dice routes: `404`

Direct protected-route byte probe:

- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`
- Authenticated canonical hash: `429660CF3571BD727C0EE5A2459A91F4F62C72567AEEA63DAB99E8AB07F4386A`
- Authenticated canonical bytes include `NOT ENOUGH DICE TO COME BACK`, `mathematical_elimination`, and `mathematicalEndProof`
- Authenticated canonical headers include `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`
- `/trash-dice/play/index.html` redirects `308` to `/trash-dice/play/`
- `/trash-dice/play/trash-dice.html` redirects `308` to `/trash-dice/play/trash-dice`, which serves the same authenticated hash and mathematical-lock copy

Manual Alpha diff checks:

```powershell
git diff -- releases/alpha-complete play/trash-dice/alpha-complete
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site diff -- play/trash-dice/alpha-complete
```

Result: both empty.

Plumbing audit result:

- Fixed the route-guard blind spot where live bytes could match `studio-site` HEAD while uncommitted local route-source edits were not deployed yet.
- Added and pushed route-source drift detection in `odg-pipeline`, then refined it to use `git diff --quiet` so normalized line endings do not create false reds.
- Scoped diffs are empty for Retail ship files, studio play mirrors, route-guard files, and Alpha Complete paths.

Retail surface scan:

- No `BETA WIP`, `NOT LIVE`, `TD`, `TD launcher`, `beta-v2`, `2 PLAYER`, or `two-player` text in the shipped play HTML.
- Dormant disabled PWA/QR/room strings remain in non-visible legacy code paths, but QA verifies no visible PWA/two-player UI, no room panel, no manifest/service worker, no beta websocket, and no forbidden network requests.

## Approval Review Notes

- iPhone and desktop paths are accepted from Beta.
- iPad browser support is in scope for Phase 1; only the old 9.7-inch iPad class is treated as below the smooth hardware target.
- Legacy iPad Pro 9.7 on iPadOS 16.7.16 is treated as below the smooth hardware target.
- The legacy iPad path remains playable and now gives honest non-blocking hardware guidance.
- Do not reopen legacy iPad animation tuning unless CJ explicitly reopens it.
- Gameplay assist doctrine is now explicit: hard opening anti-sweep only for the fresh-game danger window; normal CPU streaks are allowed after that; later-session help is soft, capped, invisible, and based on player deficit or pressure signals.

## Gameplay Assist Research Refresh

Refreshed: 2026-06-19

Useful findings:

- GameAnalytics FTUE guidance emphasizes quick first-session success, reduced friction, and positive reinforcement during onboarding: https://www.gameanalytics.com/blog/tips-for-a-great-first-time-user-experience-ftue-in-f2p-games
- Game Developer / deltaDNA first-session analysis ties longer first sessions to stronger Day 1 retention and treats early churn as a critical product risk: https://www.gamedeveloper.com/business/how-first-session-length-impacts-game-performance
- Dynamic-difficulty research supports adapting difficulty to player state and performance rather than using blunt static difficulty rules: https://www.intechopen.com/chapters/1228576 and https://www.mdpi.com/2076-3417/15/10/5610
- Game Developer DDA design guidance warns that successful DDA should feel invisible, which argues against obvious global rubber-banding caps: https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment

Conclusion:

- Keep the hard guard only for the fresh-game/onboarding danger window.
- Do not add a global "CPU cannot win three rounds in a row" rule.
- Keep later-session assist softer, capped, and contextual.

## Legacy Hardware Research Refresh

Refreshed: 2026-06-18

Exa query:

```text
family browser game device compatibility older iPad performance wording older hardware recommended newer device
```

Useful findings:

- GameMaker's iOS HTML5 guidance says desktop browser performance does not guarantee iOS performance, because iOS applies resource limits that should be considered when designing browser games for that OS: https://gamemaker.io/en/help/articles/html5-resource-limits-for-browser-games-on-ios
- Outsmarted, a family board-game companion product, publishes friendly device compatibility and minimum requirement language instead of treating all devices as equally smooth: https://www.outsmarted.co.uk/pages/device-compatibility
- The Outsmarted App Store listing requires iOS/iPadOS 16 or later, showing that companion apps commonly set explicit Apple-device compatibility baselines: https://apps.apple.com/us/app/outsmarted-companion-app/id1541321303
- Deadbolt Games frames browser/device guidance around "best experience," current browsers, older browser limitations, and a device checker rather than blaming the player or blocking by default: https://www.deadboltgames.com/support/technical-requirements
- Merge EDU publishes a device-age and minimum-spec compatibility baseline, including "devices that are 4 years old or newer," current Apple software, and minimum RAM: https://support.mergeedu.com/hc/en-us/articles/115002899692-Is-my-device-compatible

Conclusion:

- The current Trash Dice copy matches the researched pattern: friendly, non-blocking, and framed as best-experience guidance.
- Keep the current copy unless CJ/legal wants a stronger warning:
  `For the smoothest experience, play on iPhone, desktop, or a newer iPad.`
- Do not use "unsupported" language for the legacy iPad unless the product decision changes.

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
