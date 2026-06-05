# Trash Dice Beta v4 Handoff

Prepared: 2026-06-05

This handoff starts the next chat: `Trash Dice Beta (v4)`.

CJ is Creative. Codex is Dev Lead, tech lead, QA owner, release owner, Slack comms owner, and the source of truth for implementation continuity. The purpose of V4 is to stop CJ from having to repeat context and to keep the shipping lane moving cleanly.

## Start Here

Open the game repo:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
```

Read these first:

- `TRASH_DICE_BETA_V4_HANDOFF.md`
- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `ship-html5/README.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `CLAUDE.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`

Then check state:

```powershell
git status --short --branch
git log --oneline --decorate --max-count=12
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site status --short --branch
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site log --oneline --decorate --max-count=12
```

## Current Mission

Build and ship the HTML5 instant-play Trash Dice digital companion.

Current product direction:

- Start from Beta v3 / ship lane because it has the QoL fixes CJ wants.
- Ship game is one-player only.
- No two-player in the ship build.
- No PWA in the ship build.
- No iOS app work in this session. The iOS app has its own Codex thread and uses an isolated Alpha Complete-derived lane.
- No login, account, email capture, or PII.
- Keep anonymous session analytics as a key live-learning deliverable.
- Preserve instant-play: link opens, game starts, no download, no app store, no install ceremony.

This V4 doctrine supersedes older Beta v1/v2 direction about PWA and nearby two-player for the shipping companion. Those older docs remain historical context, not current marching orders.

## Non-Negotiable Alpha Rule

Never, ever touch Alpha Complete in place.

Do not edit, repoint, overwrite, rename, rebalance, optimize, "just copy over", or deploy over:

- `releases/alpha-complete/*`
- `play/trash-dice/alpha-complete/*`
- the live Alpha Complete route

Alpha Complete exists as a frozen reference and approved feel baseline only. If its code or art is needed, copy from it into a new lane. Do not mutate it.

Known Alpha route:

`https://playonedaygames.com/trash-dice/alpha-complete/`

As of this handoff, the live Alpha route returns `401` because it is protected. That is expected.

## Current Repos

Game repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice`

Branch:

`master`

Status at V4 handoff creation:

- `master...origin/master [ahead 5]`
- local modified:
  - `.gitignore` pre-existing, not ours
  - `qa-public-build.ps1` pre-existing, not ours
  - `ship-html5/index.html` current work
  - `ship-html5/trash-dice.html` current work
- untracked, pre-existing:
  - `docs/`
  - `mobile/`
  - `recaps/`
  - `qa-public-build_public_20260511_202810.log`
  - `qa-public-build_public_20260511_202829.log`
  - `qa-public-build_run_20260516_080057.log`
  - `qa-public-build_run_20260516_080753.log`

Recent local game commits not pushed at handoff time:

- `1d4292f Add retail loop QA harness`
- `714629e Add ship quit return flow`
- `77eece8 Add TD launcher kit`
- `6904e31 Add Trash Dice HTML5 ship lane`
- `d49af95 Add Trash Dice ambient audio asset`

Latest origin at handoff time:

- `5b12860 Update Beta WIP badge copy`

Studio site repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site`

Branch:

`main`

Status at V4 handoff creation:

- `main...origin/main [ahead 3]`
- local modified:
  - `play/trash-dice/play/index.html` current mirrored review build
  - `play/trash-dice/play/trash-dice.html` current mirrored review build
- untracked, unrelated:
  - `play/assets/games/tic-tac-toe/CAPTURE_NOTES.md`
  - `play/live/tic-tac-toe/assets/ttt-night-gameplay-thumbnail.png`

Recent local studio commits not pushed at handoff time:

- `5fbfbb6 Guard Trash Dice title quit analytics`
- `f82bbfe Add Trash Dice play quit return flow`
- `bdbee21 Add Trash Dice play route`

## Current Playable Build

Primary source:

- `ship-html5/index.html`
- `ship-html5/trash-dice.html`

Studio review mirror:

- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\index.html`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\play\trash-dice.html`

At handoff time, all four files hash-match:

`ABAB3DFAE62BAE48F2A6E00FDE66497014CE251ACFB0F2674985DB342D2DF668`

Current local review server:

- Laptop: `http://127.0.0.1:5177/trash-dice/play/`
- iPhone on same Wi-Fi: `http://192.168.86.48:5177/trash-dice/play/`
- Port: `5177`
- Current listening process at handoff time: PID `8368`

This is local same-Wi-Fi review, not a deployed public route. The IP can change if CJ changes networks. If the link dies, restart a static server rooted at:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play`

## TD Launcher Workflow

CJ should use a stable `TD` launcher instead of chasing Slack/session links for iteration review.

Canonical protected HTML5 Beta review URL:

`https://playonedaygames.com/trash-dice/play/`

Launcher doctrine:

- Desktop launcher, Start Menu launcher, and iPhone Home Screen icon should all point to the canonical protected Beta review URL above.
- Do not use temporary Cloudflare tunnel URLs, local IPs, Slack links, or build-specific preview URLs for launchers.
- Do not embed passwords in shortcut files, URLs, docs, Slack, or launcher scripts.
- Do not point this ship-lane launcher at `/trash-dice/ios-preview/` unless CJ explicitly switches the review workflow to the separate iOS thread.
- Do not touch Alpha Complete.

Windows launcher source:

- `launchers/install-td-launcher.ps1`
- `launchers/TD.ico`
- `launchers/TD_LAUNCHER_README.md`

The installer creates:

- Desktop shortcut: `TD.lnk`
- Start Menu shortcut: `TD.lnk`
- Repo backup shortcut: `launchers\TD.lnk`
- Repo fallback URL file: `launchers\TD.url`

Windows taskbar:

- Prefer pinning the Start Menu `TD` shortcut manually.
- If Windows only pins the browser app, keep the Desktop `TD` shortcut as the reliable launcher.

iPhone Home Screen:

1. Open `https://playonedaygames.com/trash-dice/play/` in Safari.
2. Authenticate if prompted.
3. Tap Share.
4. Tap Add to Home Screen.
5. Name it `TD`.
6. Turn Open as Web App OFF if iOS shows that option.
7. Tap Add.

Keeping Open as Web App OFF makes the launcher open in Safari and share Safari's auth/session. The icon can stay static; game content updates because the shortcut points to the stable protected URL.

## Live Route Reality

As of this handoff:

- `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1` returns `404`
- `https://playonedaygames.com/trash-dice/play/` returns `404`
- `https://playonedaygames.com/trash-dice/ios-preview/` returns `401`
- `https://playonedaygames.com/trash-dice/alpha-complete/` returns `401`

Important: the old Beta v2 link in V3 handoff is stale. Do not give it to CJ as a current playable link. The site worker intentionally retired `/trash-dice/beta-v2`.

First infrastructure priority for V4:

Create or confirm one stable protected review URL for the current HTML5 ship build so CJ can always play the current build without chasing Slack links, local IPs, or temporary tunnels.

Recommended review URL shape:

`https://playonedaygames.com/trash-dice/play/`

But it must be deployed and verified before being shared as live.

## Slack Comms

CJ has explicitly granted full permission for Codex to use Slack comms with CJ.

Slack channel for Trash Dice build/release notes:

- Channel name: `#builds-prototype`
- Channel ID: `C0AU29TPER4`

Recent V4 local review link post:

`https://onedaygames.slack.com/archives/C0AU29TPER4/p1780676806622359`

That Slack post contains the local same-Wi-Fi link. It is not a public deployed release link.

Slack doctrine:

- Post direct CJ review links when useful.
- Be explicit whether a link is local, protected preview, or public live.
- Do not post a "release is ready" message to the build channel unless the exact URL was verified.
- Include what changed, what was validated, and whether Alpha Complete was untouched.
- Never embed passwords in Slack, URLs, shortcuts, or docs.

## Current Implemented Ship-Lane Work

Ship lane was created from Beta v3 QoL direction:

- `ship-html5/index.html`
- `ship-html5/trash-dice.html`

Mirrored into Studio Site:

- `play/trash-dice/play/index.html`
- `play/trash-dice/play/trash-dice.html`

Recent implemented items:

- One-player ship lane exists.
- Two-player is disabled in ship lane via `TWO_PLAYER_ENABLED = false`.
- PWA is not part of ship lane.
- Quit/return flow added:
  - `DONE` attempts `window.close()`.
  - Fallback explains that closing the tab returns to the retail/product page left open behind it.
  - Events include `td_quit_click`, `td_quit_fallback`, and `td_quit_keep_playing`.
- Retail loop QA harness added:
  - `qa-retail-loop.js`
  - `qa-retail-loop-harness.html`
- Title quit analytics crash guarded.
- Dev badge currently says:
  - `BETA WIP - NOT LIVE`
- Title screen start button restored to Alpha-style treatment:
  - `TAP TO START`
  - full clickable dice-card button
  - boring Beta `PLAY` rectangle removed

Current `TAP TO START` line:

- `ship-html5/index.html:5947`
- `ship-html5/trash-dice.html:5947`
- `studio-site/play/trash-dice/play/index.html:5947`
- `studio-site/play/trash-dice/play/trash-dice.html:5947`

## Known Recent QA

Already passed before V4 handoff:

```powershell
node qa-ship-html5.js
node qa-retail-loop.js
```

Recent start-button checks:

- Ship mirror and script parse passed.
- Studio mirror and script parse passed.
- Alpha diff check returned empty.
- Browser check verified `TAP TO START` visible on desktop.
- Browser check verified `TAP TO START` visible on iPhone-size viewport `390x844`.
- No horizontal overflow at iPhone width.
- Clickable button covers the full dice-card area.

Re-run after any meaningful edit:

```powershell
node -e "const fs=require('fs'); const a='ship-html5/index.html',b='ship-html5/trash-dice.html'; const A=fs.readFileSync(a,'utf8'),B=fs.readFileSync(b,'utf8'); if(A!==B) throw new Error('ship mirror mismatch'); const m=A.match(/<script>([\s\S]*?)<\/script>/); if(!m) throw new Error('missing script'); new Function(m[1]); console.log('ship mirror/script ok');"
node qa-ship-html5.js
node qa-retail-loop.js
```

And in Studio Site:

```powershell
node -e "const fs=require('fs'); const a='play/trash-dice/play/index.html',b='play/trash-dice/play/trash-dice.html'; const A=fs.readFileSync(a,'utf8'),B=fs.readFileSync(b,'utf8'); if(A!==B) throw new Error('studio mirror mismatch'); const m=A.match(/<script>([\s\S]*?)<\/script>/); if(!m) throw new Error('missing script'); new Function(m[1]); console.log('studio mirror/script ok');"
```

Always check Alpha:

```powershell
git diff -- releases/alpha-complete play/trash-dice/alpha-complete
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site diff -- play/trash-dice/alpha-complete
```

Both must be empty.

## Official Retail Assets

CJ received approved retail/brand assets on 2026-06-05:

- `C:\Users\shove\Downloads\Trash Dice Logo.ai`
- `C:\Users\shove\Downloads\TrashDice_label_F2_2026.ai`
- `C:\Users\shove\Downloads\Big Discoveries Secondary Logo.png`

Asset observations:

- The `.ai` files are PDF-compatible Illustrator files from Adobe Illustrator.
- Local conversion tooling is limited. Prefer clean Illustrator-exported web assets from the masters if possible.
- `Big Discoveries Secondary Logo.png` is a large transparent PNG, dark one-color mark. It is best on a light/cream surface unless a reversed white version is created.
- The Illustrator metadata references placed files such as `TrashDice_Concepts-08 11.png` and `Untitled_Artwork 3.jpg`; the PDF-compatible files appear embedded, but avoid destructive Illustrator resaves until link status is verified.

## Dev Asset Inventory To Replace

The ship build still contains dev/placeholder brand art. Replace these with retail assets before public ship.

Must replace in `ship-html5/*` and mirrored Studio Site `play/trash-dice/play/*`:

1. Active gameplay Trash Dice title logo
   - `ship-html5/index.html:5595`
   - hand-built inline SVG/text logo
   - replace with official `Trash Dice Logo.ai` export

2. Start/title screen Trash Dice title logo
   - `ship-html5/index.html:5858`
   - duplicate hand-built inline SVG/text logo
   - replace with official `Trash Dice Logo.ai` export

3. Trash can label wordmark
   - `ship-html5/index.html:5762`
   - current `can-label-wordmark` is dev text
   - replace with official label/can art from `TrashDice_label_F2_2026.ai`

4. Hidden alternate can label logo
   - `ship-html5/index.html:5770`
   - `can-label-logo` exists even though hidden
   - remove or replace so no dormant placeholder remains

5. Hidden can logo overlay
   - `ship-html5/index.html:5806`
   - `can-logo-overlay` is hidden but cloned into victory can path if present
   - remove or replace

6. Victory can inheritance
   - `ship-html5/index.html:9292`
   - `ship-html5/index.html:9293`
   - victory can clones the trash can SVG and overlay
   - verify the official can/label appears correctly in win/terminal presentation

7. Big Discoveries attribution
   - not present in production ship lane yet
   - add a small "Presented by" treatment on the title screen only
   - hard recommendation: keep it quiet and not during active gameplay

Optional/not public ship critical:

- `beta/icons/*` PWA icons are generated dev icons. Since ship is no-PWA, do not prioritize unless CJ asks to maintain PWA Beta separately.
- `launchers/TD.ico` is CJ convenience tooling. Optional refresh with official art.
- `qa-retail-loop-harness.html` has fake Big Discoveries retail page text. QA-only. Do not treat as public asset.
- root `index.html` / `trash-dice.html` and old `beta/*` lanes contain historical/dev art. Do not make them ship blockers unless a route still serves them.

## Badge Doctrine

Current development badge:

`BETA WIP - NOT LIVE`

CJ wants to keep the badge during development.

For live ship:

- Remove development badge from gameplay.
- Keep only a very low-profile version ID on the title screen, lower-left area, so CJ/Codex can identify the live version.
- The version ID should look like internal debug dust, not consumer-facing copy.

## Analytics Doctrine

Analytics is a key live learning deliverable.

Hard constraints:

- Anonymous session analytics only.
- No PII.
- No login/account/email.
- No third-party install-flow SDKs.
- Preserve COPPA-safe posture and Big Discoveries/screens-off brand tone.

Recommended minimum event set:

- `td_session_start`
- `td_game_start`
- `td_roll`
- `td_lid`
- `td_trash`
- `td_round_win`
- `td_game_win`
- `td_game_loss`
- `td_quit_click`
- `td_quit_fallback`
- `td_quit_keep_playing`

Recommended dimensions:

- source parameter, for example `source=bigdiscoveries`, `source=qr`, `source=slack`, `source=local`
- device class, not exact fingerprint
- viewport bucket
- session duration
- game duration
- rounds completed
- roll count
- win/loss result
- quit timing

Do not add a dashboard in this lane unless CJ asks. First deliver anonymous event emission and verifiable payloads.

## Retail Link-Out / Quit Doctrine

The intended retail loop is:

1. User is on Big Discoveries product page.
2. User taps `PLAY FOR FREE`.
3. Game opens in a new tab.
4. Product page stays open behind it, preserving scroll/cart state.
5. Game `DONE` button tries to close the game tab.
6. If browser blocks close, fallback sheet tells user to close the tab and return to the product page.

Known standard:

- A browser page often cannot reliably close a tab unless that tab was script-opened.
- Therefore the correct cross-browser pattern is attempt close, then graceful fallback.
- The return-to-product-page part is solved by new-tab architecture.

Do not navigate the game tab back to Big Discoveries as the primary behavior unless CJ intentionally changes strategy.

## Studio Ops / Public Route Doctrine

Route/publish coordination touches public site infrastructure, so treat it as release infrastructure.

Codex can do it if the context and permissions are present, but the next session should not confuse local review with public readiness.

Immediate routing need:

- A stable protected current-build review URL for CJ.
- Prefer `/trash-dice/play/` if it is intended to become the final public route.
- If protected preview is needed before public ship, document auth behavior and noindex/no-store headers.

Before CJ or Slack receives a "current beta" public link:

- Confirm route returns 200.
- Confirm public bytes match local expected build.
- Confirm Alpha Complete still unchanged/protected.
- Confirm no retired route is being reused.
- Confirm no passwords/secrets are embedded.

## Iteration Protocol

Default to action. CJ wants hard recommendations and implementation, not passive questions.

Before edits:

- Check repo status.
- Identify unrelated dirty files and leave them alone.
- Confirm target lane is `ship-html5` plus Studio Site mirror, not Alpha Complete.

During edits:

- Keep changes scoped.
- Use existing single-file HTML/CSS/JS patterns unless a refactor clearly pays for itself.
- Keep mirrors exact.
- Do not introduce React Native, Capacitor, Cordova, Unity, or app-store work in this thread.
- Do not add PWA work to ship build.

After edits:

- Mirror source to `trash-dice.html`.
- Mirror Studio Site copy.
- Run parse/mirror checks.
- Run relevant QA scripts.
- Check Alpha diff is empty.
- Use browser/mobile visual check for UI changes.
- Give CJ the link and exact status.

If a public/shareable link is involved:

- Verify URL status and bytes after deploy.
- Post to Slack only with exact caveat: local, protected preview, or public live.

## Current Plan For V4

1. Fix review infrastructure first.
   - Create/confirm stable protected review URL for current ship build.
   - Stop relying on local IP and stale Beta v2 links.
   - Keep local server as fallback.

2. Retail asset replacement.
   - Export official Trash Dice logo and label/can art to web-safe assets.
   - Replace both title logos.
   - Replace can label/overlay system.
   - Verify victory can inheritance.
   - Add small Big Discoveries title-screen attribution.

3. Anonymous analytics.
   - Audit existing `tdTrack` behavior.
   - Add/verify source parameter handling.
   - Add minimal event payloads for live learning.
   - Keep no-PII doctrine.

4. Final ship cleanup.
   - Remove development-only badge from gameplay.
   - Add subtle version ID on title screen only.
   - Verify no two-player, PWA, install, account, or dev control surfaces leak into ship UI.

5. QA and release.
   - Run ship QA and retail loop QA.
   - Visual check iPhone, tablet, desktop.
   - Verify public route.
   - Slack release note with evidence.

## Quality Bar

CJ is locking in a shipping version, not a prototype.

The standard is:

- Playable by CJ anytime.
- Obvious first tap.
- One-player flow only.
- Mobile-first.
- No dead links.
- No stale Slack link confusion.
- No Alpha mutation.
- Retail art, not dev art.
- Anonymous analytics ready for live learning.
- Public route verified before sharing.

If anything blocks this, escalate immediately instead of patching around it.

## iOS Thread Boundary

CJ has a separate Codex thread for the Trash Dice iOS app.

That thread:

- uses Capacitor
- starts from a copied/forked Alpha Complete build
- must not touch Alpha Complete in place
- must not derail this Beta v4 HTML5 shipping work

Only share QoL fixes intentionally requested by CJ. The selected QoL fixes CJ wanted for iOS reference were:

- small iPhone roll button protection
- iPad/tablet active-game layout
- tagline visibility
- trash-can wordmark sizing
- CPU Green vs human Green fanfare behavior

Do not merge iOS work back into this ship lane unless CJ explicitly asks.

## Claude / Sidecar Rules

Codex may use Claude as bounded support for:

- read-only exploration
- docs drift
- QA scripts
- inventories
- second-pass review
- narrow helper patches

Claude must not:

- push
- deploy
- Slack
- touch secrets
- alter public links
- touch Alpha Complete
- claim release readiness

CJ should not manage Claude. Codex owns any sidecar coordination and summarizes only useful outcomes.
