# Trash Dice Retail Handoff

Prepared: 2026-06-20

2026-06-30 addendum: read `TRASH_DICE_RETAIL_AGENTIC_LOOPS_HANDOFF_2026-06-30.md` before acting on this file. The new addendum carries the current ODG loop model, the lighter client telemetry promise, and the Studio Ops versus Retail-session boundary for launch promotion.

This handoff starts the next session: `Trash Dice Retail`.

CJ is Creative/Product. Codex is Dev Lead, Studio Ops technical owner, QA owner, release owner, Slack comms owner, and continuity owner. Beta is complete. The next session should not reopen Beta polish unless CJ explicitly changes the call. The mission is to turn the accepted Beta build into the final retail/live web release.

## Fresh Session Snapshot

Production workflow state:

- Retail approval is still pending; do not flip live until CJ confirms approval is locked.
- No known under-the-hood Retail ship blockers remain after the terminal loser-copy, `TRASHED!` player-win stamp, portrait-play gate, desktop short-window scroll fallback, and deploy-plumbing audit pass.
- Current work is approval hold, final real-device smoke, and launch-flip execution.
- The canonical route stays `https://playonedaygames.com/trash-dice/play/`; it is protected review now and should become the public Phase 1 route later.
- Phase 1 is HTML/browser only for desktop, iPhone, and iPad. Do not create or revive an iOS/App Store lane.
- Alpha Complete is frozen forever and must remain untouched.

Current pushed refs:

- Latest gameplay/QA commit before this handoff refresh: `aa90d6b Allow desktop scroll for short win screens`
- Current game-code commit: `aa90d6b Allow desktop scroll for short win screens`
- Studio-site HEAD: `96a8303 Mirror Trash Dice desktop scroll fallback`
- ODG pipeline HEAD: `966c0bc Ignore normalized line endings in route drift guard`
- Ship SHA-256: `9713CE3B3FDB45C4C3F5837D512CE0B6FE24A94A396C8DDFF53AE79795B964BE`
- Protected route live SHA-256: `82A5F1AFEC6220D7438FCFEA104F10887C2081BBB26310DCACE010D332AD0D0E`

Latest verified route guard:

- Timestamp: `2026-06-20T16:02:55.5385767-07:00`
- Status: green
- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-review`
- `/trash-dice/play/`: route-source drift check green, `working tree has no Git diff against HEAD:play/trash-dice/play/index.html`
- `/trash-dice/alpha-complete/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-frozen-alpha`
- `/trash-dice/ios-preview/`: unauthenticated `401`, state `protected-preview`
- retired Trash Dice routes: `404`

Latest live protected-byte probe:

- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`
- Authenticated route hash: `82A5F1AFEC6220D7438FCFEA104F10887C2081BBB26310DCACE010D332AD0D0E`
- Authenticated route bytes contain `TRASHED!`, `trashed-stamp`, `NOT ENOUGH DICE TO COME BACK`, `mathematical_elimination`, `mathematicalEndProof`, `ROTATE TO PORTRAIT`, `Trash Dice is built for vertical play.`, `orientation-lock-screen`, `@media (hover: hover) and (pointer: fine)`, `overflow-y: auto`, and `resetDesktopScrollPosition`
- Headers remain `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`

Known unrelated dirty files to leave alone:

- Game repo: `.gitignore`, `qa-public-build.ps1`, untracked `docs/`, `mobile/`, old `qa-public-build_*.log`, `recaps/`
- Studio-site: untracked `play/assets/games/tic-tac-toe/CAPTURE_NOTES.md`, `play/live/tic-tac-toe/assets/ttt-night-gameplay-thumbnail.png`

## Start Here

Open the game repo:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
```

Read these first:

- `TRASH_DICE_RETAIL_HANDOFF.md`
- `TRASH_DICE_RETAIL_APPROVAL_PACKET.md`
- `PROJECT_NOTES.md`
- `CJ_REVIEW_WORKFLOW.md`
- `ship-html5/README.md`
- `ALPHA_COMPLETE_LINKS.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `CLAUDE.md`

Then check current state:

```powershell
git status --short --branch
git log --oneline --decorate --max-count=18
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site status --short --branch
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site log --oneline --decorate --max-count=18
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json
```

## Current Status

Trash Dice HTML5 is now **BETA COMPLETE**.

Current Retail candidate game-code commit:

- `aa90d6b Allow desktop scroll for short win screens`

Current game repo HEAD:

- See `git log --oneline -5`; the current head may be this handoff refresh commit, while the latest gameplay code commit is `aa90d6b Allow desktop scroll for short win screens`.

Current studio-site HEAD:

- `96a8303 Mirror Trash Dice desktop scroll fallback`

Current ODG pipeline HEAD:

- `966c0bc Ignore normalized line endings in route drift guard`

Current canonical route:

- `https://playonedaygames.com/trash-dice/play/`

Current route state:

- Protected review route now.
- Future live route later.
- Same URL should become public for Phase 1 retail launch.

Latest route-contract guard:

- Command: `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json`
- Timestamp: `2026-06-20T16:02:55.5385767-07:00`
- Status: `green`
- `/trash-dice/play/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-review`
- `/trash-dice/play/`: route-source drift check green, `working tree has no Git diff against HEAD:play/trash-dice/play/index.html`
- `/trash-dice/alpha-complete/`: unauthenticated `401`, authenticated `200`, hash match, state `protected-frozen-alpha`
- `/trash-dice/ios-preview/`: unauthenticated `401`, state `protected-preview`
- retired Trash Dice routes: still `404`

## Product Call

The accepted ship lane is:

- one-player HTML5 instant-play digital companion
- Phase 1 is HTML/browser only
- supported Phase 1 browser targets: desktop, iPhone, and iPad
- no two-player in this retail release
- no PWA/install ceremony in this retail release
- no iOS app or App Store shipping work in this retail release
- no login, account, email capture, cart, coupon, or PII
- anonymous play telemetry only
- Big Discoveries / Trash Dice retail presentation
- canonical live route remains `/trash-dice/play/`

iPhone and desktop are accepted as good to go. iPad browser support is in scope, with the old 9.7-inch iPad class handled through honest hardware guidance rather than more animation tuning. iPhone/iPad gameplay is now portrait-only: rotated mobile/tablet browser viewports show a `ROTATE TO PORTRAIT` blocker and do not allow play until portrait.

Legacy iPad is accepted as a hardware-limit risk, not an open Beta blocker. The specific reported device was an iPad Pro 9.7-inch on iPadOS 16.7.16. The game detects that class as `legacy-ipad` and uses the latest legacy performance profile, but real-device Safari still looked janky to CJ. Do not spend the Retail session chasing tiny animation patches unless CJ explicitly reopens the issue. The retail fix is honest hardware guidance plus a final live-readiness pass.

Retail approval is currently pending. The protected-review candidate is prepared and pushed, but the live flip must not happen until CJ confirms retail approval is locked. Use `TRASH_DICE_RETAIL_APPROVAL_PACKET.md` for the current review evidence packet.

## Non-Negotiable Alpha Rule

Never touch Alpha Complete in place.

Do not edit, repoint, overwrite, rename, rebalance, optimize, copy over, deploy over, or route over:

- `releases/alpha-complete/*`
- `play/trash-dice/alpha-complete/*`
- the live Alpha Complete route

Alpha Complete is a frozen approved feel baseline only. If code or art is needed, copy from it into a new lane. Do not mutate it.

Known Alpha route:

- `https://playonedaygames.com/trash-dice/alpha-complete/`

Expected current public posture:

- unauthenticated `401`
- authenticated `200`
- route-contract state `protected-frozen-alpha`

## Current Repos

Game repo:

- `C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice`
- branch `master`
- expected current code commit `aa90d6b`

Known unrelated dirty/untracked game repo files that must not be cleaned or reverted:

- `.gitignore`
- `qa-public-build.ps1`
- `docs/`
- `mobile/`
- `recaps/`
- `qa-public-build_public_20260511_202810.log`
- `qa-public-build_public_20260511_202829.log`
- `qa-public-build_run_20260516_080057.log`
- `qa-public-build_run_20260516_080753.log`

Studio mirror repo:

- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site`
- branch `main`
- expected current commit `96a8303`

Known unrelated untracked studio files that must not be cleaned or reverted:

- `play/assets/games/tic-tac-toe/CAPTURE_NOTES.md`
- `play/live/tic-tac-toe/assets/ttt-night-gameplay-thumbnail.png`

## Current Playable Build

Primary source:

- `ship-html5/index.html`
- `ship-html5/trash-dice.html`

Studio review mirror:

- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\index.html`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\trash-dice.html`

The `sync-ship-html5.ps1` helper copies the source lane into the studio play route, mirrors assets, verifies HTML hashes, verifies asset hashes, parses the single-file game script, and checks Alpha diffs before and after.

## Legacy iPad State

Latest legacy iPad work keeps an explicit profile for old 9.7-inch iPads while protecting newer iPads from the legacy note:

- body class: `legacy-ipad-performance`
- body dataset: `data-device-profile="legacy-ipad"`
- QA state: `deviceProfile`
- QA state: `legacyIpadPerformanceMode`
- QA lane: `ipad-pro-9-7-ios16-production-like` in `qa-ship-html5.js`
- QA lane: `ipad-9-7-ios18` confirms newer iPadOS stays standard iPad with no guidance note
- forced test URL option: `?device=legacy-ipad`
- production-like iPad path avoids `fast-preview`

Important code paths to understand if this is reopened:

- `ship-html5/index.html`
- `DEVICE_PROFILE`
- `TABLET_EFFECTS_LITE`
- `MOBILE_ROLL_SMOOTHING`
- `IPAD_GAMEPLAY_PERFORMANCE_MODE`
- `LEGACY_IPAD_PERFORMANCE_MODE`
- `startCanLurkIpadSmooth`
- `dieRollIpadFast`
- `dieRollLegacyIpad`
- `tablet-effects-lite`
- `mobile-roll-smoothing`
- `legacy-ipad-performance`

Latest QA-covered behavior:

- default production-like iPad keeps title can body motion alive
- default production-like iPad uses a visible shortened hero die roll
- legacy iPad uses 20s compositor title-can motion
- legacy iPad uses stricter roll timing: `260ms` animation, `80ms` reveal hold
- legacy iPad bypasses travel dice
- legacy iPad keeps slow glints and tiny can/lid idle motion alive in gameplay
- legacy iPad removes expensive can filters
- legacy iPad CPU roll-to-ready target is under `900ms`
- yellow/player and green/CPU round-win panel status shows roughly 2.5x `WINNER` through the fanfare window; green/CPU round event timing remains capped
- player game-win panel status uses the same roughly 2.5x `WINNER` treatment and persists through the terminal win loop until Play Again
- opening comeback guard is now deterministic after two green opening round wins: yellow is forced toward open slots and green is forced away from open slots when possible, preventing a third straight opening round loss
- later-session endurance assist is explicitly soft/contextual: neutral late play does not activate help, deficit and late low-dice pressure can activate capped probabilistic help, and CPU soft-brakes are not a global no-streak cap
- mathematical-lock endings explain themselves only on the losing player's panel with `NOT ENOUGH DICE TO COME BACK`; the `CONGRATULATIONS!` banner and winning panel stay clean
- player game wins stamp the Green/CPU losing panel with `TRASHED!`; the stamp stays out of the `CONGRATULATIONS!` banner, fits in the losing panel across desktop/iPhone/iPad QA viewports, persists through the win loop, clears after Play Again, and does not appear on CPU wins
- desktop short-window terminal screens allow vertical-only page scroll on pointer/desktop browsers when Play Again falls below the visible window; QA covers `1366x768` and `1280x720`, no horizontal overflow, reachable Play Again after scroll, and scroll reset after Play Again

CJ's real-device verdict:

- title can speed is now correct
- legacy iPad still has tiny stutter on title motion
- gameplay dice still stutter
- the specific old device should be treated as below the recommended hardware target for the final public release

Do not alter iPhone or desktop paths while dealing with legacy iPad. They are accepted.

## Retail Hardware Guidance

Hard recommendation for live:

- show a small non-blocking note only for `legacy-ipad`
- place it on the title screen under the start card or near the footer
- do not show it on iPhone, desktop, or modern iPad
- do not use error language
- do not call the user's hardware "unsupported"
- do not block play

Recommended exact copy:

```text
For the smoothest experience, play on iPhone, desktop, or a newer iPad.
```

More explicit fallback copy if CJ wants stronger transparency:

```text
This iPad can play Trash Dice, but animations may be choppy on older iPad hardware. For the smoothest experience, use iPhone, desktop, or a newer iPad.
```

Research basis from Exa-assisted review:

- Outsmarted's product page uses a device-compatibility/minimum-requirements section while still keeping the page friendly and product-forward: https://www.outsmarted.co.uk/products/outsmarted-2022
- HoYoverse support explains that performance depends on device hardware and recommends stronger specs for best experience: https://support.hoyoverse.com/hc/en-us/articles/50902294745753-How-can-I-fix-Tears-of-Themis-crashing-lagging-overheating-or-failing-to-start
- EverMerge support uses compatibility language that says performance can vary across devices and newer versions/devices are recommended: https://evermerge-jet.zendesk.com/hc/en-us/articles/41960194501777-EverMerge-Device-Compatibility
- Deadbolt Games explains browser-game requirements in terms of modern devices and browsers: https://www.deadboltgames.com/support/technical-requirements

Exa is not a native Codex MCP tool in this session. Use this helper when research is needed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\wuyb\scripts\exa-search.ps1 -Query "family browser game device compatibility wording older iPad performance" -NumResults 5 -Text
```

Never print, commit, paste, or Slack the Exa key. The helper reads `EXA_API_KEY` from the Windows User environment.

## Retail Launch Checklist

Before calling the game live:

- Confirm the legacy-iPad-only hardware guidance note still appears only on the intended legacy profile.
- Confirm the visible `BETA WIP - NOT LIVE` badge stays absent.
- Confirm `P-0`, `WIN`, and `LOSE` debug controls stay hidden outside QA/review mode while preserving QA hooks for automation.
- Verify no user-facing copy uses "TD".
- Verify the title, start card, game screen, win/loss screens, Play Again, and DONE loop are retail-appropriate.
- Verify the Big Discoveries and Trash Dice marks render from mirrored assets.
- Verify anonymous analytics still emit and contain no PII.
- Verify final route bytes exactly match committed studio-site build.
- Verify Alpha Complete remains protected and untouched.
- Verify iOS preview remains separate and protected.
- Verify retired routes remain retired.

Real-device smoke matrix before live:

- iPhone Safari: accepted path, should stay smooth.
- Desktop Chrome or Edge: accepted path, should stay smooth.
- Desktop Safari if available: smoke path if practical.
- Modern iPad Safari if available: should be playable without legacy warning.
- Legacy iPad Pro 9.7 on iPadOS 16.7.16: should show hardware guidance and remain playable, but not promised as smooth.

## Required QA

After accepted edits:

```powershell
.\qa-ship-iteration.ps1
```

This runs:

- `sync-ship-html5.ps1`
- `node qa-ship-html5.js`
- `node qa-retail-loop.js`

If route or studio-site route files change:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json
```

Manual Alpha diff checks:

```powershell
git diff -- releases/alpha-complete play/trash-dice/alpha-complete
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site diff -- play/trash-dice/alpha-complete
```

Both must be empty.

## Launch Flip Doctrine

The intended Phase 1 public route is the same evergreen URL:

- `https://playonedaygames.com/trash-dice/play/`

Do not create a new public route unless partner/legal forces it.

To launch:

- remove Basic Auth gate for `/trash-dice/play/`
- remove `/trash-dice/play/` from `robots.txt` disallow
- change protected-review/noindex/no-store posture to public/live posture
- update route contracts and monitors from `protected-review` to the intended live state
- verify unauthenticated public `200`
- verify public bytes match committed studio-site build
- verify `/trash-dice/alpha-complete/` is still protected and untouched
- verify `/trash-dice/ios-preview/` remains separate and protected
- verify retired routes remain retired

Never use these as launch truth:

- stale `/trash-dice/beta-v2/` links
- local IP links
- temporary tunnel URLs
- Slack preview links
- `/trash-dice/ios-preview/`
- retired Big Discoveries partner legacy route

If private review is needed after public launch, create a separate protected review lane such as `/trash-dice/review/`. Do not move the public live game off `/trash-dice/play/` without an explicit product/route decision.

## Slack And Comms

CJ has explicitly granted Codex permission to use Slack comms with CJ directly when it helps coordination, review, release clarity, or context preservation.

Build/release channel:

- channel name: `#builds-prototype`
- channel ID: `C0AU29TPER4`

Rules:

- Do not post "live" or "release ready" until the exact public route has been verified.
- Include what changed, what passed, and whether Alpha Complete was untouched.
- Be explicit whether a link is local, protected review, or public live.
- Never embed passwords in Slack, URLs, shortcuts, or docs.

## What Not To Reopen

Do not reopen these unless CJ explicitly asks:

- Beta two-player work
- PWA/install flow
- iOS app work
- account/login/email capture
- Alpha Complete mutation
- extended legacy-iPad animation polish beyond the retail hardware note

The Retail session is for final live-readiness and launch execution.

## Recommended First Moves For Retail

1. Keep `/trash-dice/play/` protected-review while retail approval is pending.
2. Use `TRASH_DICE_RETAIL_APPROVAL_PACKET.md` as the current approval packet.
3. Refresh `.\qa-ship-iteration.ps1` before any new approval review if code or mirrored route files change.
4. Verify Alpha diffs are empty in both repos before any new handoff or launch action.
5. Run the route-contract guard before any review handoff and capture the exact timestamp.
6. After CJ confirms approval is locked, flip `/trash-dice/play/` from protected review to public live only after final public-byte checks pass.
7. Post release comms only after public route and byte truth are verified.

## Paste This Into The New Session

```text
This is Trash Dice Retail. Beta is complete.

Start by reading:
C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice\TRASH_DICE_RETAIL_HANDOFF.md
C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice\TRASH_DICE_RETAIL_APPROVAL_PACKET.md

Then read PROJECT_NOTES.md, CJ_REVIEW_WORKFLOW.md, ship-html5/README.md, ALPHA_COMPLETE_LINKS.md, and BETA_ENTERPRISE_QUALITY_PROTOCOL.md.

CJ is Creative/Product. Codex is Dev Lead and Studio Ops technical owner. Do not make CJ re-explain Beta. The job is to ship the accepted one-player HTML5 instant-play Trash Dice build to live.

Production workflow state:
- Retail approval is still pending; do not flip live until CJ confirms approval is locked.
- No known under-the-hood Retail ship blockers remain after the terminal loser-copy, TRASHED player-win stamp, portrait-play gate, desktop short-window scroll fallback, and deploy-plumbing audit pass.
- Current work is approval hold, final real-device smoke, then launch flip.
- Route must stay protected-review until approval.

Hard rules:
- Do not touch Alpha Complete or releases/alpha-complete.
- Canonical route: https://playonedaygames.com/trash-dice/play/
- One-player HTML5 instant-play lane only.
- No "TD" in user-facing copy.
- Desktop, iPhone, and iPad browser support are in scope; do not disturb accepted desktop/iPhone paths.
- Legacy iPad Pro 9.7 / iPadOS 16 is below the smooth target; use a small legacy-iPad-only hardware guidance note instead of reopening endless animation tuning.
- After accepted edits run .\qa-ship-iteration.ps1.
- If route/site files change, run C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json.

Current expected candidate commits:
- latest gameplay/QA commit before this handoff refresh: aa90d6b Allow desktop scroll for short win screens
- game code: aa90d6b Allow desktop scroll for short win screens
- studio-site HEAD: 96a8303 Mirror Trash Dice desktop scroll fallback
- odg-pipeline HEAD: 966c0bc Ignore normalized line endings in route drift guard
- ship SHA-256: 9713CE3B3FDB45C4C3F5837D512CE0B6FE24A94A396C8DDFF53AE79795B964BE
- protected route live SHA-256: 82A5F1AFEC6220D7438FCFEA104F10887C2081BBB26310DCACE010D332AD0D0E
- latest route-contract guard: green at 2026-06-20T16:02:55.5385767-07:00
- direct protected-byte probe: authenticated /trash-dice/play/ is 200 and contains TRASHED!, trashed-stamp, NOT ENOUGH DICE TO COME BACK, mathematical_elimination, ROTATE TO PORTRAIT, orientation-lock-screen, @media (hover: hover) and (pointer: fine), overflow-y: auto, and resetDesktopScrollPosition

Known unrelated dirty files:
- Game repo: .gitignore, qa-public-build.ps1, untracked docs/, mobile/, old qa-public-build_*.log, recaps/
- Studio-site: untracked play/assets/games/tic-tac-toe/CAPTURE_NOTES.md and play/live/tic-tac-toe/assets/ttt-night-gameplay-thumbnail.png
- Leave those alone unless CJ explicitly asks.

Current Retail state:
1. Legacy-iPad-only smooth-experience copy is implemented; newer iPadOS stays on the standard iPad path with no guidance note.
2. Player-panel pool-count numerals use `Fredoka One`/tabular numeric styling so `7` reads clearly on iPhone.
3. Round-win panel `WINNER` status is roughly 2.5x larger than the base status label and persists through the fanfare window for both player and green/CPU wins without extending green/CPU event timing.
4. Player game-win panel `WINNER` status uses the same roughly 2.5x treatment and persists through the terminal win loop until Play Again.
5. Opening comeback guard prevents a fresh game from allowing green/CPU to win the first three rounds straight.
6. Later-session assist is soft, contextual, and capped: deficit or low-dice pressure can help, neutral late play does not, and there is no global CPU three-round-streak ban.
7. Mathematical-lock endings show `NOT ENOUGH DICE TO COME BACK` only on the losing player's panel, never under `CONGRATULATIONS!` or on the winning panel.
8. Player game wins stamp the Green/CPU losing panel with `TRASHED!`; it fits in the losing panel across desktop/iPhone/iPad QA viewports, clears after Play Again, and does not appear when CPU wins.
9. iPhone/iPad browser gameplay is portrait-only; landscape iPhone/iPad viewports show ROTATE TO PORTRAIT and real center taps do not start the game while blocked.
10. Desktop short-window terminal screens allow vertical-only scroll when needed; Play Again is reachable at `1366x768` and `1280x720`, horizontal overflow stays hidden, and Play Again resets scroll to top.
11. BETA WIP public badge is removed.
12. Public debug controls are hidden while QA hooks remain available.
13. Route-guard plumbing now checks for local route-source drift before trusting live-vs-HEAD hash matches, without false reds from normalized line endings.
14. QA, Alpha diffs, route contracts, and live protected bytes are green for the protected-review candidate.
15. Flip /trash-dice/play/ from protected review to public live only after retail approval and exact public bytes verify.
```
