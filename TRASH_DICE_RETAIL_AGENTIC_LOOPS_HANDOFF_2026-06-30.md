# Trash Dice Retail Agentic Loops Handoff

Prepared: 2026-06-30
Audience: Trash Dice Retail session
Owner: Codex as Dev Lead, with Studio Ops owning public launch mechanics

## Start Message

Welcome back to Trash Dice Retail. Use the ODG loop model for this session:

```text
detect -> act -> verify -> record -> report only if useful
```

The mission is not to add process. The mission is to finish the Retail candidate with explicit stop conditions so CJ does not have to judge technical readiness by vibes.

## Read First

- `TRASH_DICE_RETAIL_HANDOFF.md`
- `TRASH_DICE_RETAIL_APPROVAL_PACKET.md`
- `ship-html5/README.md`
- `CJ_REVIEW_WORKFLOW.md`
- `CLAUDE.md`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\ODG_AGENTIC_LOOPS.md`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\TRASH_DICE_RETAIL_LIVE_OPERATIONS.md`

## Session Boundary

The Retail session owns:

- source/gameplay/content fixes
- creative/product polish
- QA coverage in `qa-ship-html5.js` and `qa-retail-loop.js`
- candidate evidence for CJ approval
- handoff notes about known risks

Studio Ops owns:

- source-to-site mirror verification
- route contract truth
- public route flip
- deploy verification
- live monitoring
- Slack/live-status communication
- self-heal ledgering
- final live truth

CJ should not manually route incidents between sessions. If the Retail session finds a launch or live-route issue, write the precise fix/evidence packet and hand it to Studio Ops.

## Active Loop: Release Candidate Loop

Use this loop whenever the Retail session believes a candidate is ready.

Stop only when:

- the intended source is `ship-html5/index.html`
- `ship-html5/trash-dice.html` is synced intentionally
- `node --check qa-ship-html5.js` passes
- `node qa-ship-html5.js` passes
- `node qa-retail-loop.js` passes when retail-loop behavior is touched
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\sync-ship-html5.ps1 -CheckOnly` passes
- the approval packet/handoff has no stale commit, hash, route timestamp, or old version-id claim
- any changed event names, source attribution, version label, device behavior, or completion/replay behavior has a QA assertion

Then hand off to Studio Ops for:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-trash-dice-retail-live-readiness.ps1 -Mode PreLaunch
```

The Retail session should not flip `trash-dice-play-evergreen` public.

## Active Loop: Client Metrics Loop

CJ's current client promise is:

```text
I'll capture a clean set of anonymous, aggregate play metrics - things like visits, plays, completions, and repeat plays - and share a simple readout after launch. Deeper analysis or marketing work can be scoped separately if it's useful later.
```

This is deliberately lighter than earlier drafts.

Deliver only:

- visitors / sessions
- game starts
- completions
- replay rate
- Big Discoveries source traffic

Do not build or promise:

- screen-level drop-off/funnel analytics
- identity tracking
- accounts
- heatmaps
- ad pixels
- marketing optimization
- partner checkout attribution

Existing richer hooks may stay in the game for diagnostics, but the client readout must stay inside the agreement.

Known telemetry audit item:

- `completed_games` exists in the analytics payload.
- `getCompletedGameCount()` has recently been observed returning `0`.
- Completion reporting should rely on completion events (`td_game_complete`, `td_game_win`, `td_game_loss`) unless the local counter is fixed and verified.

If the Retail session touches telemetry, verify at minimum:

- `td_session_start` fires for visits
- `td_game_start` fires for plays
- `td_game_complete` fires for completions
- `td_play_again` fires for repeat plays
- `source=bigdiscoveries` is preserved in analytics source attribution

## Latest-Technique Application

Use the smallest loop that safely finishes the job:

- Turn-based loop for questions or small scoped fixes.
- Goal-based loop for release candidate readiness.
- Time-based loop only when the input changes on a schedule.
- Proactive loop only for well-defined repair/support streams.

Prefer deterministic checks over reasoning:

- local script output beats a chat conclusion
- route-contract output beats memory
- QA event assertions beat "I saw it work"
- source/mirror hashes beat visual assumption

Use Claude/Codex sidecar work only with bounded packets:

- good: audit telemetry event map, inspect stale docs, propose narrow report script, second-pass review
- bad: decide launch readiness, flip routes, post Slack, change agreement scope, add richer analytics than promised

## Current Startup Commands

Run these before changing anything:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
git status --short --branch
git log --oneline --decorate --max-count=8
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site status --short --branch
git -C C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline status --short --branch
```

If a handoff depends on route truth, also run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-route-contracts.ps1 -Json
```

## Operating Reminder

Under-promise, over-deliver.

Trash Dice Retail Phase 1 is a browser/HTML launch for desktop, iPhone, and iPad. Do not turn it into native app shipping, partner checkout, store analytics, or a broad marketing-funnel product unless CJ explicitly scopes that work.

