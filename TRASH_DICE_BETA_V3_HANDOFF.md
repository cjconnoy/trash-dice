# Trash Dice Beta v3 Handoff

Prepared: 2026-05-20

This handoff starts the next chat, `Trash Dice Beta (v3)`. It is meant to be enough context that CJ does not have to re-explain the project, the recent bugs, the release links, or the operating model.

## Start Here

Change to the game repo first:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
```

Then read these files before coding:

- `TRASH_DICE_BETA_V3_HANDOFF.md`
- `PROJECT_NOTES.md`
- `BETA_BACKLOG.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `ALPHA_COMPLETE_LINKS.md`
- `releases/alpha-complete/README.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`
- `CLAUDE.md`

Run:

```powershell
git status --short
git log --oneline -12
```

Expected dirty items at this handoff are pre-existing and must not be reverted unless CJ explicitly asks:

- ` M qa-public-build.ps1`
- `?? qa-public-build_public_20260511_202810.log`
- `?? qa-public-build_public_20260511_202829.log`
- `?? qa-public-build_run_20260516_080057.log`
- `?? qa-public-build_run_20260516_080753.log`

## Operating Model

CJ is the creative. Codex is the CTO, integrator, release owner, QA owner, and CJ-facing source of truth. CJ has explicitly authorized proactive technical judgment, Slack communication, bounded auto-fixes, and use of Claude/sidecar support when it improves throughput or coverage.

The active priority for v3 is:

**Get the nearby two-player local mode to ship quality.**

The Beta backlog spine remains:

- Nearby two-player mode
- QR / join reliability
- iPad / tablet layout

Treat Big Discoveries interest as a real commercial-quality escalation. The standard is no longer "prototype that works"; it is partner-facing Beta infrastructure with evidence, regression capture, public-byte verification, rollback awareness, and platform-risk ownership.

Do not make CJ coordinate mechanics. Codex should preserve CJ's creative energy by handling repo hygiene, QA, release links, Slack, docs drift, platform risks, and "what did we miss?" passes.

## Alpha Complete Is Frozen

Alpha Complete is permanent and must not be touched.

Approved Alpha build:

`dc5a995 Make inventory dice more dimensional`

Frozen Alpha SHA-256:

`b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f`

Canonical Alpha link:

`https://playonedaygames.com/trash-dice/alpha-complete/`

Never edit, overwrite, rebalance, patch, rename, repurpose, or replace:

- `releases/alpha-complete/index.html`
- `releases/alpha-complete/trash-dice.html`
- `releases/alpha-complete/README.md`
- the canonical Alpha public path

All Beta and later work must use Beta paths, Beta release folders, and Beta share URLs.

## Current Repos And Links

Game repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice`

Origin:

`https://github.com/cjconnoy/trash-dice.git`

Branch:

`master`

Current pushed HEAD before this v3 handoff file:

`02af5b1 Record Beta full nearby round win release`

Latest actual Beta gameplay code commit:

`042a9d1 Give nearby players full round win event`

Studio/publish repo:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site`

Latest studio publish commit:

`3f97b10 Publish Trash Dice Beta full nearby round wins`

Current reviewable Beta v2 links:

- Desktop full: `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1`
- Mobile full: `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1`

Public Beta SHA-256 at `042a9d1`:

`d4e328a2502d4c67056374e374316eddb822b572275e1f6afa146a1e47edc4d7`

Room backend:

`trash-dice-beta-room`

Public WebSocket:

`wss://trash-dice-beta-room.play-onedaygames.workers.dev/beta-ws`

Slack channel:

`#builds-prototype`

Slack channel ID:

`C0AU29TPER4`

Latest Slack release post:

`https://onedaygames.slack.com/archives/C0AU29TPER4/p1779246902600699`

Important Slack note: the URL contains `/archives/` because that is Slack's URL format. The channel is not named `archives`; it is `#builds-prototype`.

## Current Beta Implementation

Main Beta app:

- `beta/index.html`
- mirror: `beta/trash-dice.html`

The mirror must exactly match `beta/index.html` after any Beta app edit.

Room/server support:

- `tmp/codex-static-server.js`
- `worker/`

Current nearby flow:

- Player 1 taps `2 PLAYER` and creates a room.
- Player 1 gets a room code, QR code, share link, `Share Link`, `Copy Link`, and `Copy Code`.
- Player 2 joins by QR/link or by entering the room code.
- Host start control appears only after Player 2 is connected.
- Host button says `Roll For First`.
- Both clients auto-roll one die to determine who starts.
- High roll starts; ties auto-reroll.
- Gameplay remains locked until both clients agree on the starter.
- Active player's device generates gameplay roll values for now.
- Worker rejects gameplay rolls before start, guest starts, out-of-turn rolls, and duplicate-turn rolls.
- If Player 2 sleeps/disconnects, Player 1 returns to a clean room panel that can invite again.
- If Player 1 disconnects, Player 2 is returned to a clean room-closed state.

Current round-win behavior:

- Nearby two-player treats both Yellow/Player 1 and Green/Player 2 as human winners.
- Green/Player 2 receives the full round-win event in nearby mode.
- One-player CPU/Green remains eligible for the shorter CPU-style event.

Current timing:

- Production CPU-to-player handoff is 250ms.
- Public QA measured nearby Green-to-Yellow readiness at 274ms.
- Public QA measured CPU lid handoff at 260ms and CPU trash handoff at 268ms.
- Opening roll-off public QA resolved at 2634ms with a 3500ms ceiling.

## Recent CJ Issue Trail And Status

CJ reported the iPad layout was broken. Fixed in:

- `28aba0e Fix Beta iPad active-game layout`
- `c15f127 Record Beta iPad layout release`
- Studio `aa9c190 Publish Trash Dice Beta iPad layout fix`

CJ asked for the fresh desktop/mobile links and Slack link. Current truth:

- Desktop full: `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1`
- Mobile full: `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1`
- Slack: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779246902600699`

CJ said the player wants access to the roll button faster after CPU turn completion. Fixed in:

- `a1b0045 Tune Beta player handoff timing`
- `5015a36 Record Beta handoff tune release`
- Studio `782b300 Publish Trash Dice Beta handoff tune`

CJ said `ROLL, WIN, AVOID THE BIN!` was visible on desktop, partly covered on iPad, and invisible on iPhone. Fixed in:

- `cb1dda6 Fix Beta tagline visibility on tablet and phone`
- `a7bf048 Record Beta tagline layout release`
- Studio `218b598 Publish Trash Dice Beta tagline layout fix`

CJ said the two-player new game showed random dice rolls for 3-5 seconds after start. This was the opening roll-off being unclear. It was clarified and shortened in:

- `5fd4fec Clarify Beta two-player opening roll-off`
- `af90184 Record Beta opening roll-off release`
- Studio `16cea68 Publish Trash Dice Beta opening roll-off clarity`

CJ said the iPad went to sleep while the iPhone stayed awake, then the create/join menu returned with the trash can permanently on screen. Fixed in:

- `8d6e71e Fix Beta nearby disconnect recovery`
- `3ea20ae Record Beta disconnect recovery release`
- Studio `752d375 Publish Trash Dice Beta disconnect recovery fix`

CJ said the trash can logo in the iPad in-game `TRASH DICE` logo was half missing. Fixed in:

- `95fcf94 Fix Beta trash can wordmark on iPad`
- `57916d5 Record Beta can wordmark release`
- Studio `b26ef63 Publish Trash Dice Beta can wordmark fix`

CJ said nearby two-player should not use the abbreviated one-player CPU round-win event; both players should get the full round-win event. Fixed in:

- `042a9d1 Give nearby players full round win event`
- `02af5b1 Record Beta full nearby round win release`
- Studio `3f97b10 Publish Trash Dice Beta full nearby round wins`

## Latest QA Evidence

The latest full public enterprise gate for `042a9d1` was green.

Evidence from the public gate:

- Public URL: `https://playonedaygames.com/trash-dice/beta-v2/?v=042a9d1`
- Public SHA-256: `d4e328a2502d4c67056374e374316eddb822b572275e1f6afa146a1e47edc4d7`
- Alpha frozen SHA still matched: `b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f`
- Public two-client nearby QA passed.
- Public room protocol QA passed.
- Worker dry-run passed.
- Beta mirror and script parse checks passed.
- Local and public CPU handoff QA passed across lid and trash outcomes.
- iPad/iPhone active-game layout QA passed at 1024x980, 768x920, 390x664, and 320x568.
- Title/tagline visibility passed with no title/tagline, tagline/panel, board/yellow, or roll-panel overlap.
- Trash-can wordmark visibility/sizing passed on tablet and phone.
- Nearby peer-left visual recovery passed after closing Player 2 mid-game.
- Nearby Green/Player 2 round-win full-event proof passed on both clients.

Round-win proof details from public QA:

- Winner: `p2`
- `multiplayerActive=true`
- `fullEvent=true`
- spill duration: `4420ms`
- CPU cap reference: `2800ms`
- message: `GREEN WINS THE ROUND!`
- title fanfare active
- lid dance active
- can dance active
- payout panel/inventory/status active
- status: `PAYDAY!`
- payout comets: `6`

Known mobile visual QA caveat:

- Terminal win/loss screenshots are green at 5s and 12s.
- Terminal win/loss screenshots are red at 20s because the game auto-resets around 15s.
- Do not claim long-window terminal stability until fixed or product-approved.

## Open Ship-Quality Work

Nearby two-player remains the top lane. The current review flow is ship-hardened, but not finished as enterprise product infrastructure.

Next nearby-mode hardening targets:

- Extend browser QA from disconnect recovery into same-room rejoin and second-start behavior.
- Add full six-slot board cycle QA in nearby mode.
- Add nearby end-of-game QA.
- Add copy/share fallback QA for browsers without Web Share or Clipboard API.
- Add real-device spot checks after public releases: iPhone Safari, Android Chrome, iPad Safari.
- Decide whether partner demos need server-generated dice, deterministic room logs, or commit-reveal fairness beyond nearby social trust.

QR/join risks:

- QR generation currently depends on `quickchart.io`.
- Move QR generation to first-party code or owned infrastructure.
- Verify QR image resolution in public QA.
- Add invite/QR screenshot QA for iPad portrait and small phones.
- Keep manual code and share/copy fallbacks visible if QR fails.

iPad/tablet risks:

- Active-game layout is fixed and guarded.
- Invite/QR iPad layout still needs coverage.
- Landscape tablet layout should be tested if CJ or partners use it.
- Screenshot evidence would be better than geometry-only assertions for demo readiness.

Platform concerns before calling this enterprise-complete:

- Worker observability is thin: add uptime/protocol smoke checks, error visibility, and release annotations.
- Abuse controls are minimal: room creation/socket traffic need rate-limit posture before broad sharing.
- Rollback/deploy ownership should be documented cleanly for Cloudflare/studio-site.
- Access/secrets/ownership inventory needs partner-ready posture.
- Public release communication should include evidence, not hope.

## Release Protocol

Do not Slack WIP.

Only post Slack builds after:

- commit
- push
- public fetch returns 200
- public bytes/hash match local committed Beta artifact
- local targeted QA passes
- public nearby two-client QA passes
- public room protocol QA passes
- tablet/phone layout QA passes if UI/layout changed
- Alpha Complete byte lock passes
- forbidden local preview port `4173` is not listening

Use the enterprise gate before partner-facing Beta releases:

```powershell
.\qa-beta-enterprise.ps1
```

Use the local gate while iterating:

```powershell
.\qa-beta-enterprise.ps1 -SkipPublic
```

If a Beta app edit happens, mirror before release:

```powershell
Copy-Item -LiteralPath .\beta\index.html -Destination .\beta\trash-dice.html -Force
```

Focused checks:

```powershell
node -e "const fs=require('fs'); for (const f of ['beta/index.html','beta/trash-dice.html']) { const m=fs.readFileSync(f,'utf8').match(/<script>([\s\S]*?)<\/script>/); if(!m) throw new Error('missing script '+f); new Function(m[1]); } const a=fs.readFileSync('beta/index.html','utf8'); const b=fs.readFileSync('beta/trash-dice.html','utf8'); if(a!==b) throw new Error('beta mirror mismatch'); console.log('beta scripts and mirror ok')"
node --check .\tmp\codex-static-server.js
node --check .\qa-beta-multiplayer.js
node --check .\qa-beta-ipad-layout.js
node --check .\qa-beta-cpu-handoff.js
git diff --check
.\test-game-readiness.ps1 -DryRun
node .\qa-beta-multiplayer.js http://127.0.0.1:5175
node .\qa-beta-ipad-layout.js http://127.0.0.1:5175/beta/
```

Public build check:

```powershell
.\qa-beta-public-build.ps1 -PublicUrl "https://playonedaygames.com/trash-dice/beta-v2/" -RunMultiplayerQa
```

Mobile visual QC when terminal states, mobile layout, or reviewability change:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-mobile-visual-qc.ps1" -RepoPath "C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice"
```

Publish repo for the public custom-domain build:

`C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site\play\trash-dice\beta-v2`

## Slack Protocol

CJ has explicitly authorized Slack comms.

Channel:

`#builds-prototype`

Channel ID:

`C0AU29TPER4`

Use release-only Slack updates. Include:

- what changed
- what passed
- any important remaining risk
- Desktop full link
- Mobile full link

Recent Slack release links:

- Handoff tune: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779242250720249`
- Tagline fix: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779242907652409`
- Opening roll-off clarity: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779243550114319`
- Disconnect recovery: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779245035757509`
- Can wordmark: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779245805778129`
- Full nearby round-win: `https://onedaygames.slack.com/archives/C0AU29TPER4/p1779246902600699`

## Claude Sidecar Rules

Use Claude as a bounded sidecar for parallel reconnaissance, QA/risk review, tests, docs, and "what did we miss?" passes.

Codex stays on the critical path for:

- implementation judgment
- architecture
- integration
- final QA
- commits
- pushes
- public links
- Slack
- release readiness
- CJ-facing truth

Claude may help with:

- read-only codebase reconnaissance
- bug reproduction notes
- CSS/layout audits
- rules-engine sanity checks
- test gap discovery
- QA checklists
- docs drift and handoff drafting
- second-pass risk review

Claude must not:

- push
- deploy
- Slack
- alter public links
- touch Cloudflare/R2/DNS/production infrastructure
- touch secrets/env/credentials
- touch Alpha Complete
- claim readiness

Good Claude task template:

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

Use Claude in parallel when Codex can keep moving on non-overlapping work.

## Game Rules To Preserve

Trash dice are gone forever.

Only dice physically sitting in the lid at round completion pay out to the round winner.

Round payout fanfare must visually come from the lid/board to the winner inventory, not from the trash can.

Trash can may react when dice enter it, but must not become a stored payout source.

No visible stacked trash dice on the can.

Winner pool increases exactly by lid dice count only.

Total dice in game decreases by the number of trashed dice.

Mathematical certainty end should use reachability logic, not naive low-dice count.

Do not rebalance player/CPU assist buffs unless CJ explicitly asks. If later testing feels too favorable to Yellow, the first tuning knob is CPU brake chance, not player hit/clutch help.

## First Move For V3

After reading this handoff and confirming repo status, continue from the Beta backlog with nearby two-player ship quality.

Recommended first technical target:

Add or strengthen automated coverage for same-room rejoin / second-start behavior after disconnect, because it is the natural next risk after the iPad sleep/disconnect fix. Keep QR/join and iPad invite layout close behind it.

Do not touch Alpha Complete. Do not ask CJ to re-explain. Keep the creative lane open.
