# Trash Dice Beta v5 Handoff

Prepared: 2026-06-06

This handoff starts the next chat: `Trash Dice Beta (v5)`.

CJ is Creative. Codex is Dev Lead, tech lead, QA owner, release owner, Slack comms owner, workflow improver, and the source of truth for implementation continuity. The job of V5 is to keep CJ in creative review mode and keep shipping momentum clean: interpret rough notes, make hard recommendations, implement scoped fixes, verify them, and surface the stable review URL with exact status.

V5 should be more proactive than V4. Do not wait for CJ to restate doctrine, repo paths, QA commands, route policy, or the last taste-level concern. Use this handoff as the working memory, then improve the iteration lane as you go.

## Start Here

Open the game repo:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
```

Read these first:

- `TRASH_DICE_BETA_V5_HANDOFF.md`
- `PROJECT_NOTES.md`
- `CJ_REVIEW_WORKFLOW.md`
- `ship-html5/README.md`
- `ALPHA_COMPLETE_LINKS.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `CLAUDE.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`

Then check current state:

```powershell
git status --short --branch
git log --oneline --decorate --max-count=18
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site status --short --branch
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site log --oneline --decorate --max-count=18
```

## Current Mission

Ship the one-player HTML5 instant-play Trash Dice digital companion.

Current product direction:

- One-player HTML5 ship lane only.
- No two-player in the ship build.
- No PWA in the ship build.
- No iOS app work in this session. The iOS lane is separate and currently on hold.
- No login, account, email capture, or PII.
- Preserve instant-play: link opens, game starts, no download, app store, or install ceremony.
- Keep anonymous session analytics as a live-learning deliverable.
- CJ reviews via the stable protected URL and `TD` launchers, not stale Slack/local/tunnel links.

Older Beta v1/v2 directions about PWA and nearby two-player are historical context for this ship lane, not current marching orders.

## Non-Negotiable Alpha Rule

Never touch Alpha Complete in place.

Do not edit, repoint, overwrite, rename, rebalance, optimize, "just copy over", deploy over, or route over:

- `releases/alpha-complete/*`
- `play/trash-dice/alpha-complete/*`
- the live Alpha Complete route

Alpha Complete is a frozen approved feel baseline only. If code or art is needed, copy from it into a new lane. Do not mutate it.

Known Alpha route:

`https://playonedaygames.com/trash-dice/alpha-complete/`

As of this handoff, unauthenticated Alpha returns `401`, which is expected.

## Canonical Review Route

Current evergreen HTML5 Beta review URL:

`https://playonedaygames.com/trash-dice/play/`

Current state:

- Protected review route.
- Unauthenticated request returns `401`.
- Intended to use noindex/no-store protected-preview posture.
- This same URL is intended to become the Phase 1 public launch route later.

Phase 1 launch flip doctrine:

- Same URL: `https://playonedaygames.com/trash-dice/play/`
- Remove Basic Auth gate for `/trash-dice/play/`.
- Remove `/trash-dice/play/` from `robots.txt` disallow.
- Change protected-preview headers to public headers.
- Update monitors to expect public `200`.
- Verify public live bytes match committed studio-site build.
- Verify `/trash-dice/alpha-complete/` is still protected and untouched.
- Verify `/trash-dice/ios-preview/` remains separate and protected.

If private review is needed after public launch, create `/trash-dice/review/` as the protected lane. Do not create a separate public route unless partner/legal forces it.

Do not use:

- stale `/trash-dice/beta-v2/` links
- local IP links as source of truth
- Slack preview links as launcher targets
- temporary tunnel URLs
- `/trash-dice/ios-preview/` for this HTML5 lane

Route checks at V5 handoff creation:

- `https://playonedaygames.com/trash-dice/play/` -> `401`
- `https://playonedaygames.com/trash-dice/alpha-complete/` -> `401`
- `https://playonedaygames.com/trash-dice/ios-preview/` -> `401`
- `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1` -> `404`

## Current Repos

Game repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice`

Branch:

`master`

Status at V5 handoff creation:

- `master...origin/master`
- modified, pre-existing and not ours:
  - `.gitignore`
  - `qa-public-build.ps1`
- untracked, pre-existing:
  - `docs/`
  - `mobile/`
  - `recaps/`
  - `qa-public-build_public_20260511_202810.log`
  - `qa-public-build_public_20260511_202829.log`
  - `qa-public-build_run_20260516_080057.log`
  - `qa-public-build_run_20260516_080753.log`

Recent game commits on `origin/master`:

- `51831b2 Tune tablet title layout`
- `250a860 Make ship quit button prominent`
- `df5d164 Speed up Trash Dice title logo load`
- `965225b Add player win fanfare loop`
- `dc39a64 Tighten mobile title layout`
- `a32ee7d Reposition desktop title logo`
- `db4fd5a Add ship win lose debug controls`
- `e081baf Add P-0 ship debug toggle`
- `1f1cb8f Brand title can with Trash Dice logo`
- `77acca3 Scale Big Discoveries presenter logo`
- `96aecf9 Add retail ship branding assets`
- `27d39c2 Add CJ review notes workflow`
- `bc8fc35 Add fast HTML5 iteration helpers`
- `8838ff9 Update TD launcher workflow`
- `ffd5414 Add Beta v4 ship handoff`

Studio site repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site`

Branch:

`main`

Status at V5 handoff creation:

- `main...origin/main`
- tracked files clean
- untracked, unrelated:
  - `play/assets/games/tic-tac-toe/CAPTURE_NOTES.md`
  - `play/live/tic-tac-toe/assets/ttt-night-gameplay-thumbnail.png`

Recent studio commits on `origin/main`:

- `8579e74 Tune Trash Dice tablet title layout`
- `7fae043 Make Trash Dice play quit button prominent`
- `1f6c7d1 Speed up Trash Dice play title logo load`
- `a3d4e6d Add Trash Dice player win fanfare loop`
- `47b3b5a Tighten Trash Dice mobile title layout`
- `0b65889 Reposition Trash Dice desktop title logo`
- `b82961e Add Trash Dice win lose debug controls`
- `2b454c9 Add Trash Dice P-0 play toggle`
- `2f4827a Brand Trash Dice title can`
- `072f00a Scale Trash Dice play presenter logo`
- `2d9cd29 Add Trash Dice retail branding to play route`
- `d97e2d7 Protect Trash Dice play review route`

## Current Playable Build

Primary source:

- `ship-html5/index.html`
- `ship-html5/trash-dice.html`

Studio review mirror:

- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\index.html`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\trash-dice.html`

At V5 handoff creation, all four HTML files hash-match:

`E5A0FD6FCE94525C421CBA0A0CB3584DE119F2E705BBAAFE59055952EBE126C5`

Current retail/brand assets in the ship lane:

- `ship-html5/assets/brand/big-discoveries-secondary-logo.png`
- `ship-html5/assets/brand/trash-dice-logo.png`
- `ship-html5/assets/brand/trash-dice-logo-title.webp`
- `ship-html5/assets/brand/trash-dice-logo-can.png`
- `ship-html5/assets/brand/trash-dice-label.png`
- `ship-html5/assets/brand/README.md`

The `sync-ship-html5.ps1` helper mirrors web assets into the studio play route and verifies asset hashes.

## Implemented Since V4

Workflow and review infrastructure:

- Canonical `/trash-dice/play/` protected review route confirmed and protected in studio site.
- `TD` launcher workflow added.
- CJ review workflow documented in `CJ_REVIEW_WORKFLOW.md`.
- Fast iteration helpers added:
  - `sync-ship-html5.ps1`
  - `qa-ship-iteration.ps1`
  - `add-cj-review-note.ps1`

Retail branding and title presentation:

- Official Trash Dice logo/label and Big Discoveries assets ingested into the ship lane.
- Gameplay/title Trash Dice logos replaced with retail art.
- Can label and title can updated with Trash Dice logo art.
- Big Discoveries presenter treatment added on title screen.
- Copyright/legal text added on title screen.
- Title logo load improved with eager/high-priority title WebP.
- Mobile title layout tightened so BD logo is smaller, bottom tagline/legal no longer collide, and DONE is reachable.
- Desktop title logo repositioned.
- iPad/tablet portrait breakpoint added so the title screen reads as a centered poster rather than a tall phone layout with extra air.

Debug/review controls:

- P-0 CPU-vs-CPU debug toggle added for game screen.
- `WIN` and `LOSE` debug outcome buttons added for game screen.
- Debug controls hide on title screen and are covered by QA.

Quit/retail loop:

- DONE button made larger and more conspicuous on desktop and mobile.
- Mobile DONE is lower-right for thumb reach.
- DONE still attempts `window.close()` first, then shows graceful fallback if blocked.
- Retail loop QA verifies quit analytics and return-flow behavior.

Player win wrap-up:

- Player game win wrap-up now reuses the title/round-win fanfare behavior.
- Winner panel uses the payout fanfare with label `WINNER`.
- Winning dice celebration loop persists until Play Again starts a new game.
- QA verifies the fanfare starts, persists, and clears after Play Again.

Tablet title pass:

- Latest visual QA screenshot:
  - `C:\Users\shove\Documents\Codex\2026-06-05\trash-dice-beta-v4-handoff-prepared\td-ipad-title-breakpoint-final.png`
- Latest measured iPad portrait layout:
  - presenter-to-title gap: `42px`
  - title-to-card gap: `44px`
  - can tucked into card edge: about `23px`
  - card-to-tagline gap: `13px`
  - tagline-to-legal gap: `156px`

## Current Open Creative Notes

These are live CJ concerns from the V4 thread. Treat them as the first creative runway for V5 unless CJ redirects:

1. Win event SFX:
   - CJ said the whistle SFX is annoying when it loops.
   - Hard recommendation: replace the looped whistle with a short non-looping flourish plus a softer looping bed, or remove looping tonal whistle entirely and use a light dice/rattle sparkle loop that is less fatiguing.
   - Do not make it feel like a casino jackpot. Keep Trash Dice toy-like, celebratory, and family-safe.

2. Congratulations banner color ownership:
   - CJ asked whether the `CONGRATULATIONS!` UI feels too green, like it belongs to Green Player.
   - Hard recommendation: make the headline/banner more neutral Trash Dice brand yellow/orange/red, while letting the winner panel and dice own player color.
   - Avoid making player-win praise look Green-owned when Yellow/player wins.

3. Title can readability:
   - CJ asked how the trash can's Trash Dice logo looks.
   - Current state: it is decorative and improved, but small title-screen can labels should not be judged as full readable packaging. Keep it scene-prop readable, not full-logo inspectable.

4. On-device visual review:
   - CJ uses desktop, phone, and iPad screenshots.
   - Continue capturing exact viewport evidence after visual changes.
   - For any iPad/phone change, run QA and provide the stable review URL plus what to look at.

## QA And Verification

Primary after any meaningful edit:

```powershell
.\qa-ship-iteration.ps1
```

This runs:

- `sync-ship-html5.ps1`
- `node qa-ship-html5.js`
- `node qa-retail-loop.js`

The sync step:

- copies `ship-html5/index.html` to `ship-html5/trash-dice.html`
- mirrors both studio route files
- mirrors ship web assets into the studio route
- asserts all four HTML hashes match
- asserts mirrored asset hashes match
- parses the single-file game script
- checks Alpha diffs before and after

Manual Alpha checks:

```powershell
git diff -- releases/alpha-complete play/trash-dice/alpha-complete
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site diff -- play/trash-dice/alpha-complete
```

Both must be empty.

Latest QA at V5 handoff creation:

```powershell
node qa-ship-html5.js
.\qa-ship-iteration.ps1
```

Both passed. `.\qa-ship-iteration.ps1` reported:

- `GREEN: sync ship mirrors`
- `GREEN: ship html5 qa`
- `GREEN: retail loop qa`

Unauthenticated route check confirmed `/trash-dice/play/` is still protected with `401`. Authenticated live bytes were not re-verified from this handoff because no password/session should be embedded or requested in docs.

## Analytics Doctrine

Analytics is a key live-learning deliverable.

Hard constraints:

- Anonymous session analytics only.
- No PII.
- No login/account/email.
- No third-party install-flow SDKs.
- Preserve COPPA-safe posture and Big Discoveries/screens-off brand tone.

Current analytics/debug surface:

- `window.TrashDiceAnalyticsDebug`
- source parameter support
- `td_session_start`
- `td_return_visit`
- `td_game_start`
- `td_first_roll`
- `td_game_complete`
- `td_play_again`
- `td_quit_click`
- `td_quit_fallback`
- `td_quit_keep_playing`
- `td_exit_checkpoint`
- `td_round_complete`

Next analytics work should audit event naming against the desired minimum set and decide whether to alias/rename `td_game_complete` and `td_round_complete` into ship-facing `td_game_win`, `td_game_loss`, and `td_round_win` events. Keep payloads anonymous and verifiable.

Do not build a dashboard unless CJ asks.

## TD Launcher Workflow

CJ should use dedicated `TD` launchers instead of chasing links.

Stable target:

`https://playonedaygames.com/trash-dice/play/`

Launcher docs/source:

- `launchers/install-td-launcher.ps1`
- `launchers/TD.ico`
- `launchers/TD_LAUNCHER_README.md`

Created locally:

- Desktop shortcut: `C:\Users\shove\OneDrive\Desktop\TD.lnk`
- Start Menu shortcut: `C:\Users\shove\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\TD.lnk`
- repo backup shortcut: `launchers\TD.lnk`
- repo fallback URL: `launchers\TD.url`

Rules:

- Do not embed passwords in shortcut files or URLs.
- Do not use Slack links, tunnels, local IPs, or iteration-specific previews.
- iPhone Home Screen setup must be from Safari, with Open as Web App OFF if that option appears, so Safari auth/session is shared.

## Slack Comms

CJ has explicitly granted Codex permission to use Slack comms with CJ.

Build/release channel:

- Channel name: `#builds-prototype`
- Channel ID: `C0AU29TPER4`

Slack doctrine:

- Use Slack when it helps CJ review, release clarity, or context preservation.
- Be explicit whether a link is local, protected preview, or public live.
- Do not post "release ready" unless the exact URL was verified.
- Include what changed, what was validated, and whether Alpha Complete was untouched.
- Never embed passwords in Slack, URLs, shortcuts, or docs.

## Iteration Workflow Doctrine

Default to action. CJ wants hard recommendations and implementation, not passive questions.

When CJ gives rough notes:

1. Translate them into concrete ship-lane tasks.
2. Identify any true creative decisions that need CJ.
3. Implement low-risk changes without making CJ re-prompt.
4. Run `.\qa-ship-iteration.ps1`.
5. Capture viewport evidence for visual changes.
6. Verify Alpha diffs are empty.
7. Report stable URL, exact status, and what to check.

Be creative and proactive:

- Suggest better alternatives when CJ identifies a symptom.
- If repeated patches make a surface brittle, recommend and execute a bounded refactor.
- Add QA assertions for visual/behavioral bugs that CJ already noticed.
- Keep screenshots and measured geometry for device-specific layout work.
- Reduce CJ review friction whenever a small tool, shortcut, screenshot, or workflow doc would help.
- Keep CJ in creative mode; Codex owns technical wrangling.

Before edits:

- Check repo status.
- Identify unrelated dirty files and leave them alone.
- Confirm target lane is `ship-html5` plus Studio Site mirror.
- Confirm no Alpha Complete edits.

During edits:

- Use existing single-file HTML/CSS/JS patterns unless a refactor clearly pays for itself.
- Keep mirrors exact through `sync-ship-html5.ps1`.
- Keep changes scoped.
- Do not introduce React Native, Capacitor, Cordova, Unity, app-store work, PWA work, login, account, email capture, or PII.

After edits:

- Run `.\qa-ship-iteration.ps1`.
- Run additional visual checks when UI changes.
- Check Alpha diff in both repos.
- Commit scoped changes in game repo and studio mirror repo.
- Push when the iteration is meant to reach the protected review URL.
- Tell CJ whether the route is local, protected preview, or public live.

## Release/Public Route Doctrine

Current `/trash-dice/play/` is protected preview.

Before any public/partner-facing claim:

- Confirm route returns expected status.
- Confirm public bytes match committed studio-site build.
- Confirm Alpha Complete is still protected and untouched.
- Confirm iOS preview remains separate and protected.
- Confirm no stale route is reused.
- Confirm no secrets/passwords are embedded.
- Confirm no dev-only debug controls/badges remain if public launch.

For live ship:

- Remove development badge from gameplay.
- Keep only a very low-profile internal version ID on title screen if needed.
- Decide whether debug buttons are removed, hidden behind a review flag, or disabled for public.
- Verify anonymous analytics payloads.
- Verify DONE/retail loop with David's eventual button URL.

## iOS Boundary

The iOS app thread is separate and currently on hold.

Do not:

- do Capacitor/iOS app work in this lane
- merge app-store work into the HTML5 ship lane
- use `/trash-dice/ios-preview/` as the HTML5 review URL
- touch Alpha Complete for iOS or HTML5

QoL ideas from the iOS thread can be selectively copied into HTML5 only when they match this ship lane. The accepted QoL direction already brought in title/layout/flow improvements without doing iOS app work.

## Claude / Sidecar Status

CJ briefly asked about using Claude Code, then canceled the immediate Claude handoff. No Claude handoff is active at V5 start.

Codex may still use Claude as bounded support only when it helps throughput or QA, and Codex must own the result. Claude must not:

- push
- deploy
- Slack
- touch secrets
- alter public links
- touch Alpha Complete
- claim release readiness

CJ should not manage Claude. Codex summarizes only useful outcomes.

## Recommended First Moves For V5

1. Confirm current protected review route after any deploy finishes.
   - Keep `/trash-dice/play/` as canonical.
   - Do not ask CJ for passwords in chat.

2. Address the open win-wrap taste notes.
   - Replace or soften the looping whistle SFX.
   - Make `CONGRATULATIONS!` feel Trash Dice-owned, not Green-owned.
   - Preserve the player winner fanfare loop behavior CJ asked for.

3. Audit analytics event naming.
   - Decide whether to emit explicit `td_game_win`, `td_game_loss`, `td_round_win`.
   - Keep `TrashDiceAnalyticsDebug` useful for QA.

4. Continue device visual polish.
   - Desktop, iPhone Safari, and iPad portrait are the key review surfaces.
   - Add QA geometry checks for any layout problem CJ notices twice.

5. Keep improving iteration speed.
   - Convert repeated manual checks into scripts.
   - Capture screenshots automatically when visual QA changes.
   - Maintain paste-ready status summaries for CJ and Studio Ops.

## Paste This Into The New Session

```text
This is Trash Dice Beta (v5). Start by reading:
C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice\TRASH_DICE_BETA_V5_HANDOFF.md

Then read PROJECT_NOTES.md and CJ_REVIEW_WORKFLOW.md. Continue as Dev Lead for the one-player HTML5 instant-play shipping lane. CJ is Creative; Codex owns tech lead, QA, release, Slack comms, implementation continuity, and workflow improvements.

Do not touch Alpha Complete. Use /trash-dice/play/ as the canonical protected review route. Be proactive and creative: translate CJ's rough notes into scoped tasks, make hard recommendations, implement low-risk improvements, run QA, capture visual evidence, and keep iterations fast and accurate.
```
