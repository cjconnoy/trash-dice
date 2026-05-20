# Trash Dice Beta v2 Handoff

Prepared: 2026-05-17

This handoff starts the new chat `Trash Dice Beta (v2)`. It inherits the canonized project notes and operating protocols from:

- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `releases/alpha-complete/README.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `BETA_BACKLOG.md`
- `CLAUDE.md`

## Current Repo State

Repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice`

Branch:

`master`

Current HEAD at handoff:

`4b3abd9 Add Trash Dice Beta v2 handoff`

Current pushed HEAD after Beta v2 public-link work:

`f04ef4a Record Beta v2 Slack post`

Current pushed HEAD after nearby two-player ship-quality hardening:

`b778d64 Record nearby two-player ship hardening`

Current pushed HEAD after iPad active-game layout fix:

`28aba0e Fix Beta iPad active-game layout`

Nearby two-player ship-quality hardening commit:

`db988dc Harden nearby two-player ship flow`

Origin:

`https://github.com/cjconnoy/trash-dice.git`

Origin `master` matches local HEAD as of this handoff.

The latest committed Beta gameplay/layout code change is:

`28aba0e Fix Beta iPad active-game layout`

There may be later documentation/protocol commits after `28aba0e`; do not assume `HEAD` means a new Beta gameplay build. The gameplay files still reflect the `28aba0e` Beta state until the next Beta code change.

Current dirty worktree items at handoff:

- `qa-public-build.ps1` is modified. This appears to be Ops/script hardening around port checks. Do not revert without inspecting intent.
- Untracked QA log files exist:
  - `qa-public-build_public_20260511_202810.log`
  - `qa-public-build_public_20260511_202829.log`
  - `qa-public-build_run_20260516_080057.log`
  - `qa-public-build_run_20260516_080753.log`

Treat those as existing user/Ops artifacts unless CJ asks to clean them.

## Alpha Complete Is Frozen Forever

Alpha Complete is locked at:

`dc5a995 Make inventory dice more dimensional`

Frozen SHA-256:

`b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f`

Canonical Alpha Complete evaluator link:

Desktop full:

`https://playonedaygames.com/trash-dice/alpha-complete/`

Mobile full:

`https://playonedaygames.com/trash-dice/alpha-complete/`

The old quick-tunnel Alpha links are retired and must not be revived as source of truth:

`https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995`

The canonical Alpha custom-domain link was verified on 2026-05-17 as HTTP 200 and byte-matching the frozen local file.

Never edit, overwrite, rebalance, patch, rename, repurpose, or replace:

- `releases/alpha-complete/index.html`
- `releases/alpha-complete/trash-dice.html`
- the canonical Alpha public path

All Beta and later work must use new paths, release folders, and share URLs.

## Public Link Truth

Alpha:

`https://playonedaygames.com/trash-dice/alpha-complete/` is working and byte-verified.

Beta v2:

`https://playonedaygames.com/trash-dice/beta-v2/` is now the current reviewable Beta v2 custom-domain path.

Verified build URL:

`https://playonedaygames.com/trash-dice/beta-v2/?v=28aba0e`

Desktop full:

`https://playonedaygames.com/trash-dice/beta-v2/?v=28aba0e`

Mobile full:

`https://playonedaygames.com/trash-dice/beta-v2/?v=28aba0e`

Public Beta v2 bytes were verified on 2026-05-19 against the committed Beta build artifact:

`9d66923cd18b4b4c7249a7d594830bd261f3df13cab9ce21189207b4c02dda4c`

The public room backend is the Cloudflare Worker:

`https://trash-dice-beta-room.play-onedaygames.workers.dev`

Browser clients connect to:

`wss://trash-dice-beta-room.play-onedaygames.workers.dev/beta-ws`

The Worker uses a Durable Object room hub and rejects out-of-turn gameplay rolls. The client still uses the same-origin local `/beta-ws` endpoint on localhost/LAN previews.

Beta game/room-backend implementation commit:

`3db7bdd Add Beta v2 public room backend`

Verified Beta v2 link-readiness commit:

`f6b1626 Record Beta v2 public link readiness`

Final Slack-continuity commit:

`f04ef4a Record Beta v2 Slack post`

Latest public Slack post:

`https://onedaygames.slack.com/archives/C0AU29TPER4/p1779033726867529`

That Slack thread/message was updated after the nearby two-player hardening pass.

Enterprise Beta quality protocol:

`BETA_ENTERPRISE_QUALITY_PROTOCOL.md`

Active Beta backlog spine:

`BETA_BACKLOG.md`

The previous Beta review links were:

Desktop full:

`https://tel-sight-rice-extent.trycloudflare.com/beta/?v=b2414fb`

Mobile full:

`https://tel-sight-rice-extent.trycloudflare.com/beta/?v=b2414fb`

Those old `trycloudflare.com` Beta links no longer resolve as of 2026-05-17. Do not share them.

The following paths returned HTTP 200 on 2026-05-17 but served the generic `One Day Games Play` shell, not the Trash Dice Beta game bytes:

- `https://playonedaygames.com/trash-dice/beta/`
- `https://playonedaygames.com/trash-dice/beta/?v=b2414fb`
- `https://playonedaygames.com/trash-dice/beta-v1/`
- `https://playonedaygames.com/trash-dice/beta-v2/`

Stable Beta v2 public hosting/link creation is no longer open, but future reviewable builds must still rerun byte verification and public two-client QA before sharing.

## Product Direction For Beta v2

The Beta direction remains:

Nearby online QR/code two-player on two separate phones, plus PWA-first app polish.

The active Beta backlog spine is:

- Nearby two-player mode
- QR / join reliability
- iPad / tablet layout

See `BETA_BACKLOG.md` for status and definition-of-done.

CJ explicitly does not want pass-and-play as the primary Beta flow. Assume each player has their own phone.

The emotional target is:

Someone says "scan this," and both players are playing in under 10 seconds.

Hard requirements:

- Strictly two players.
- No spectators.
- No accounts.
- No lobby browser.
- No chat.
- No app install required to play.
- Install-to-home-screen PWA polish is optional convenience, not a gate to play.
- Player 1 can create a room and show QR/code/link.
- Player 2 can join through QR/link or an obvious room-code input.
- Both players clearly know whose turn it is, what to tap next, and whether the other player is connected.
- iPhone Safari and small devices such as iPhone SE are first-class QA targets.
- The `ROLL!` action panel must not be hidden by mobile browser chrome or badges/debug UI.

Dice rolls are client-generated for now because this is nearby social-trust play, not ranked or stranger matchmaking. The server should still sync state and reject impossible/desynced moves.

## Current Beta Implementation

Main Beta app:

- `beta/index.html`
- mirror: `beta/trash-dice.html`

The mirror must always exactly match `beta/index.html` after completed Beta changes.

Server / room support:

- `tmp/codex-static-server.js`

Current room behavior:

- Player 1 taps `2 PLAYER`, then creates a room.
- Player 1 gets a room code, QR code, and share link.
- Player 1 also gets explicit `Share Link`, `Copy Link`, and `Copy Code` controls.
- Player 2 taps `2 PLAYER`, uses an obvious `Player 2: Enter Code` flow, and can auto-join when the 4th digit is entered.
- Host `Start Game` appears only after Player 2 is connected.
- When the room starts, both phones auto-roll one die to determine who goes first.
- High roll starts.
- Ties auto-reroll.
- Gameplay does not unlock until both phones agree on the resolved starter.
- The active player's device generates gameplay roll values and sends them through the room.
- The server rejects gameplay rolls before the room is actually started.
- The room backend rejects guest starts, out-of-turn rolls, and duplicate-turn rolls.
- If Player 2 disconnects, Player 1 is returned to the room panel and can invite again.
- If Player 1 disconnects, the room closes for Player 2.

Latest nearby two-player hardening commit:

`db988dc Harden nearby two-player ship flow`

Original Beta first-player gameplay commit:

`b2414fb Add Beta first-player roll`

That commit also updated:

- `qa-beta-multiplayer.js`
- `tmp/codex-static-server.js`

Previous public Slack post for `b2414fb`:

`https://onedaygames.slack.com/archives/C0AU29TPER4/p1778732962897089`

Important: that Slack post contains the now-dead old quick-tunnel Beta link. Do not reuse it as a current share link.

## Current Beta QA Status

Verified locally and publicly through 2026-05-19:

- `beta/index.html` and `beta/trash-dice.html` scripts parse.
- Beta mirror matches.
- `qa-beta-multiplayer.js` parses.
- `tmp/codex-static-server.js` parses.
- Local two-client Beta QA passes on `127.0.0.1:5175`.
- Public custom-domain two-client Beta QA passes on `https://playonedaygames.com/trash-dice/beta-v2/`.
- Public room protocol QA passes against `wss://trash-dice-beta-room.play-onedaygames.workers.dev/beta-ws`.
- Host invite controls pass small-phone QA: QR present, share/copy controls tappable, and invite URL includes the room code.
- iPad active-game layout QA passes publicly on 2026-05-19 at `28aba0e`, covering 1024x980 desktop-class iPad Safari and 768x920 iPad Mini portrait viewports so the roll panel cannot slip below tablet Safari's usable viewport.
- The public QA pass on 2026-05-17 naturally hit a first-roll tie, auto-rerolled to round 2, and correctly started Green after the reroll.
- Public Beta bytes match the committed Beta artifact hash `9d66923cd18b4b4c7249a7d594830bd261f3df13cab9ce21189207b4c02dda4c`.
- Alpha Complete still byte-matches frozen SHA `b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f`.
- Canonical mobile visual QC remains GREEN at 5s/12s and RED at 20s because of the known 15s auto-reset behavior; this was reconfirmed on 2026-05-17 and is not a new two-player regression.

Previously, at the `b2414fb` build, local and public two-client QA passed. The public QA then used the old quick-tunnel URL, which is now dead, so the next reviewable Beta v2 build needs a fresh public verification.

The public two-client QA run for `b2414fb` notably hit a tie in the opening first-player roll, auto-rerolled, and correctly started Green after winning the reroll. That is good coverage, but it must be rerun on the next valid public Beta URL.

## Required Beta Preflight Before Reviewable Builds

After Beta code changes:

1. Mirror:

```powershell
Copy-Item -LiteralPath .\beta\index.html -Destination .\beta\trash-dice.html -Force
```

2. Parse scripts and assert mirror:

```powershell
node -e "const fs=require('fs'); for (const f of ['beta/index.html','beta/trash-dice.html']) { const m=fs.readFileSync(f,'utf8').match(/<script>([\s\S]*?)<\/script>/); if(!m) throw new Error('missing script '+f); new Function(m[1]); } const a=fs.readFileSync('beta/index.html','utf8'); const b=fs.readFileSync('beta/trash-dice.html','utf8'); if(a!==b) throw new Error('beta mirror mismatch'); console.log('beta scripts and mirror ok')"
```

3. Check server and QA scripts:

```powershell
node --check .\tmp\codex-static-server.js
node --check .\qa-beta-multiplayer.js
node --check .\qa-beta-ipad-layout.js
```

4. Run:

```powershell
git diff --check
.\test-game-readiness.ps1 -DryRun
```

5. Start or confirm local origin on `127.0.0.1:5175` when testing room/server behavior.

6. Confirm no local preview server on `4173`.

7. Run local two-client Beta QA:

```powershell
node .\qa-beta-multiplayer.js http://127.0.0.1:5175
node .\qa-beta-ipad-layout.js http://127.0.0.1:5175/beta/
```

8. Run mobile visual QA when the change affects mobile, terminal states, or reviewability:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-mobile-visual-qc.ps1" -RepoPath "C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice"
```

9. Commit and push.

10. Verify exact public Beta URL returns the game, not a generic shell.

11. Compare public bytes/hash to local Beta file for the exact build.

12. Run public two-client Beta QA against the exact public URL.

Current helper:

```powershell
.\qa-beta-public-build.ps1 -PublicUrl "https://playonedaygames.com/trash-dice/beta-v2/" -RunMultiplayerQa
```

Enterprise release gate:

```powershell
.\qa-beta-enterprise.ps1
```

Local enterprise gate while iterating:

```powershell
.\qa-beta-enterprise.ps1 -SkipPublic
```

13. Verify Alpha Complete still works and byte-matches the frozen SHA.

14. Only then provide Desktop full and Mobile full links here and in Slack.

## Browser And Preview Protocol

Do not use the Codex in-app browser preview for CJ/game review links.

CJ wants full external browser links for playtesting and sharing. The in-app preview previously caused lingering preview audio and is not the review path.

Use headless/browser automation scripts for QA, and share only full Desktop/Mobile URLs for reviewable builds.

Every reviewable iteration must provide:

- Desktop full
- Mobile full

## Slack Protocol

Slack channel:

`#builds-prototype`

Channel ID:

`C0AU29TPER4`

Do not Slack WIP.

Only post Slack builds after:

- commit
- push
- public fetch returns 200
- public bytes/hash match local
- targeted QA passes
- Alpha lock check passes
- no 4173 preview server
- origin/server status is understood

Use consistent labels:

- Desktop full
- Mobile full

## Mobile Visual QA Gate

Canonical mobile visual QA is now:

`odg-pipeline\test-mobile-visual-qc.ps1`

Current known finding from 2026-05-14:

- 5s win/loss terminal screenshots: GREEN
- 12s win/loss terminal screenshots: GREEN
- 20s win/loss terminal screenshots: RED because game-over auto-resets around 15s

Do not claim long-window terminal/game-over mobile stability until the 20s behavior is fixed or explicitly product-approved.

This is a hardening target, not a CJ manual-testing chore.

## AI Worker / Studio Ops Protocol

CJ talks to Codex. Codex routes the work.

Codex remains:

- game maker
- CTO/integrator
- release owner
- final QA owner
- CJ-facing source of truth

Codex may proactively use Claude Code or Studio Ops for bounded support when it helps throughput, coverage, docs drift, visual QA evidence, link verification, stale context compression, test scaffolding, or second-pass review.

Claude must not:

- push
- deploy
- Slack
- alter public links
- alter Cloudflare/R2/DNS/production infrastructure
- touch secrets/env/credentials
- touch Alpha Complete
- claim readiness

Codex must review, accept/reject, test, commit, push, and communicate.

## Claude Speed-Lane For Beta Iteration

CJ is creative. Codex is the aggressive, proactive Tech Lead. Codex owns implementation, architecture, QA, review links, commits, docs drift, release risk, and continuity. CJ should not have to manage routine technical mechanics or AI labor.

Claude/Claude Code should be used heavily as a sidecar to keep iteration fast, but not as the main driver. Codex should keep moving locally while Claude handles bounded parallel tasks.

Use Claude for work that can run in parallel without blocking Codex's next action:

- codebase reconnaissance
- bug reproduction notes
- CSS/layout audits
- rules-engine sanity checks
- test gap discovery
- copy/docs/handoff drafting
- alternate implementation sketches
- QA checklists
- risk review before commits
- "what did we miss?" passes

Do not wait on Claude for immediate blocking work unless the task is genuinely independent and likely to return fast. Codex should not delegate the next critical-path edit and sit idle.

Every Claude task should be concrete and bounded:

```text
You are a sidecar engineer on Trash Dice Beta. CJ is creative; Codex is Tech Lead.

Task:
[one specific outcome]

Scope:
[files/modules Claude may inspect or edit]

Do:
- [specific checks or edits]
- [specific output needed]

Do not:
- rewrite unrelated systems
- revert user/Codex changes
- change files outside scope
- invent product direction

Return:
- summary
- files changed, if any
- commands/tests run
- risks or open questions
```

Best Claude task lanes:

1. Explorer lane: use when Codex needs quick context. Example: inspect the Beta repo and identify gameplay state flow, UI entry points, scoring/rules modules, and tests. Do not edit. Return a concise map with file paths and high-risk coupling.

2. QA lane: use after visible UI or rules changes. Example: review the latest Beta build for desktop/mobile risks, layout clipping, unreadable labels, tap targets, game-state stalls, and confusing player feedback. Do not edit. Return prioritized findings.

3. Rules/test lane: use when scoring or turn logic changes. Example: audit dice scoring and turn progression tests. Identify missing edge cases for busts, banking, rerolls, end-of-round, and game-over conditions. Add focused tests only if the existing test style is clear.

4. UI sidecar lane: use for narrow CSS/component improvements. Example: improve mobile readability for the dice/action panel only. Own only the relevant CSS/component files. Preserve gameplay behavior. Return changed files and screenshots/checks if available.

5. Docs/continuity lane: use whenever decisions are made quickly. Example: update the Beta handoff/project notes with today's locked decisions, current build links, known risks, and next priorities. Keep it concise and canonical.

Integration rule: Codex must review Claude output before accepting it. Claude can suggest or patch, but Codex owns final judgment, testing, commits, and Slack/review messaging.

Speed rule: while Claude works, Codex should keep moving on non-overlapping work. Ideal pattern:

1. Codex starts implementation.
2. Claude audits related risk or tests in parallel.
3. Codex builds and browser-checks.
4. Codex integrates only useful Claude findings.
5. Codex commits, posts review link, and keeps CJ moving.

Main risk: over-delegation. Claude slows things down when tasks are vague, overlapping, or blocking. Keep each Claude ask small, specific, and disposable.

Second risk: split-brain product direction. CJ's live creative direction wins. Claude should never reinterpret the game vision; it should support the direction Codex and CJ are actively shaping.

## Core Game Rules To Preserve

Trash dice are gone forever. Dice that enter the trash can must never be awarded later.

Only dice physically sitting in the lid at round completion pay out to the round winner.

Round payout fanfare must visually come from the lid/board to the winner inventory, not from the can.

Trash can may react when dice enter it, but must not visually become a stored payout source.

No visible stacked trash dice on the can.

Winner pool increases exactly by lid dice count only.

Total dice in game decreases by the number of trashed dice.

Mathematical certainty end should use reachability logic, not naive low-dice count. A player with fewer dice can still be alive if current lid/open-slot state allows a possible round win.

Player/CPU assist buffs remain as-is unless CJ explicitly asks for balancing. If later testing feels too favorable to Yellow, the first tuning knob is CPU brake chance, not player hit/clutch help.

## Alpha Behavior To Preserve When Working From Main Game Logic

Inline game ending only, no terminal overlay.

`GAME WIN` / `GAME OVER` banner stays on normal game screen.

Large `PLAY AGAIN` button.

15s auto-reset remains product behavior unless CJ changes it, but note the mobile visual QA 20s gate conflict.

Manual Play Again works.

Win whistling/music continues through ending window until reset/manual new game.

P-0 stops at inline ending.

Round payout dice visibly travel from lid positions into winner inventory.

Lid numbers stay light/readable in round 1, later rounds, and payout fanfare.

Inventory dice remain larger/more dimensional from the Alpha Complete lock.

CJ liked the existing timing cadence. CPU should not begin instantly; preserve the readable lull before CPU roll unless explicitly asked to change timing.

## Recommended First Moves In Beta v2

1. Establish a stable public Beta v2 share path that serves the actual Beta game bytes, not the generic One Day Games shell. The old quick tunnel is dead.

2. Add or update a Beta public-build QA script that checks:
   - public URL is 200
   - public bytes match local `beta/index.html`
   - `beta/trash-dice.html` mirror is served or intentionally absent
   - WebSocket room flow works publicly
   - Alpha Complete still byte-matches frozen build

3. Run two-phone flow QA against the new public URL:
   - Player 1 create
   - Player 2 join by code/link/QR
   - auto roll-for-first
   - tie reroll if naturally hit or through a deterministic hook later
   - first real turn goes to winner
   - Player 2 small-phone roll panel remains visible

4. Begin PWA app polish after the public Beta link is stable:
   - manifest
   - icons
   - standalone display
   - mobile launch behavior
   - install-to-home-screen QA

5. Address the mobile terminal 20s visual QA finding or explicitly get product approval for the 15s auto-reset expectation.

## Handoff Reminder For The New Chat

Before coding, read:

- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`
- `CLAUDE.md`
- this file

Then inspect current `git status` before edits. Do not revert dirty files you did not create.

Most important v2 truth:

Alpha Complete is safe and permanent at the custom domain.

Beta v2 has a verified public game link and public room backend. The next clean Beta v2 move is PWA/mobile polish or the mobile terminal 20s hardening target, with the usual public byte/QA/Alpha-lock gates before any new Slack build.
