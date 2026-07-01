# Trash Dice Retail Dynamic Workflows Handoff

Prepared: 2026-06-30
Audience: Trash Dice Retail session
Owner: Codex as Dev Lead; Studio Ops owns public route and live truth

## Start Message

Welcome back to Trash Dice Retail. Use dynamic workflows only when they reduce real launch risk.

The current rule:

```text
scripts prove routine truth; workflows attack complex uncertainty
```

Read this with:

- `TRASH_DICE_RETAIL_AGENTIC_LOOPS_HANDOFF_2026-06-30.md`
- `TRASH_DICE_RETAIL_HANDOFF.md`
- `TRASH_DICE_RETAIL_APPROVAL_PACKET.md`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\ODG_AGENTIC_LOOPS.md`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\ODG_DYNAMIC_WORKFLOWS.md`
- `C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\TRASH_DICE_RETAIL_LIVE_OPERATIONS.md`

## Boundary

The Retail session owns source/gameplay/content and candidate evidence.

Studio Ops owns source-to-site mirror verification, route contracts, public route flips, deploy verification, live monitoring, Slack/live communication, self-heal ledgering, and final live truth.

Dynamic workflows do not change that split. They can help inspect and challenge the work, but they do not own public launch.

## When To Use A Workflow

Use a dynamic workflow for:

- launch-readiness red-team review
- telemetry promise verification
- nondeterministic bugs, races, timers, or terminal-state failures
- device/visual evidence fan-out
- large docs drift checks before handoff
- claim verification before client/public copy

Do not use one for:

- single-line fixes
- deterministic QA commands
- ordinary copy edits
- route flips
- deploys
- Slack posts
- Alpha Complete work
- expanding client analytics scope

## Recommended Retail Workflows

### 1. Retail Launch Adversarial Review

Use before public promotion if the candidate changed materially or CJ is within launch week and confidence matters.

Pattern: fan-out-and-synthesize plus adversarial verification.

Ask agents to inspect:

- source QA and terminal-state reachability
- desktop, iPhone, and iPad behavior
- route contract and mirror assumptions
- public/private surface leaks
- Alpha Complete protection assumptions
- client telemetry promise boundaries

Stop condition:

- each reviewer returns green evidence or a blocker
- blockers have owner, blast radius, and next command
- Codex accepts the final risk call

### 2. Telemetry Promise Verification

Use before touching analytics or producing the client readout.

CJ's current promise is:

```text
I'll capture a clean set of anonymous, aggregate play metrics - things like visits, plays, completions, and repeat plays - and share a simple readout after launch. Deeper analysis or marketing work can be scoped separately if it's useful later.
```

Verify only:

- visits / sessions
- game starts
- completions
- replay rate
- Big Discoveries source traffic

Do not build or report:

- per-screen drop-off
- funnel analytics
- identity tracking
- accounts
- heatmaps
- ad pixels
- checkout attribution
- marketing optimization

Known bug to guard:

- `getCompletedGameCount()` has been observed returning `0`.
- Completion reporting should rely on completion events unless that counter is fixed and QA-proven.

Stop condition:

- event names are confirmed or gaps are flagged
- report output stays inside the promise
- no richer client deliverable is accidentally created

### 3. Flaky Bug Root-Cause Workflow

Use for intermittent failures like CPU timing, watchdog recovery, stale timers, delayed roll callbacks, full-board terminal states, or non-repeatable QA errors.

Pattern: loop-until-done plus competing hypotheses.

Stop condition:

- one theory survives evidence with a reproduction or bounded proof
- or the workflow hits its budget and reports exactly what evidence is missing

### 4. Device And Visual Evidence Fan-Out

Use for changes that can look different across desktop, iPhone, and iPad.

Pattern: fan-out-and-synthesize.

Stop condition:

- each viewport has pass/fail result and evidence path
- failures include viewport, state, command, and screenshot path
- no "looks fine" claim is accepted without evidence

## Allowed Work

Workflow agents may:

- inspect files
- run allowed local QA commands
- propose fixes
- produce reproduction notes
- summarize evidence
- work in isolated worktrees when explicitly assigned

Workflow agents must not:

- push
- deploy
- post Slack
- flip routes
- edit secrets or env files
- touch Alpha Complete
- change client promise scope
- claim ODG readiness directly to CJ or a partner

## Retail Acceptance Commands

Run deterministic checks before or after workflow review as appropriate:

```powershell
cd C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice
node --check qa-ship-html5.js
node qa-ship-html5.js
node qa-retail-loop.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\sync-ship-html5.ps1 -CheckOnly
```

Then hand to Studio Ops for:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\test-trash-dice-retail-live-readiness.ps1 -Mode PreLaunch
```

The Retail session should not run the public route flip.

## Paste-Ready Workflow Prompt

Use this when a bounded workflow is justified:

```text
Use a bounded dynamic workflow for Trash Dice Retail.

Objective:
<state the exact risk or verification target>

Pattern:
<Retail Launch Adversarial Review / Telemetry Promise Verification / Flaky Bug Root-Cause / Device And Visual Evidence Fan-Out>

Repo:
C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice

Boundaries:
- Do not push.
- Do not deploy.
- Do not post Slack.
- Do not flip routes.
- Do not edit secrets/env files.
- Do not touch Alpha Complete.
- Do not expand the client analytics promise.
- Do not change files outside the explicitly owned scope.

Budget/pass cap:
<small explicit cap>

Stop condition:
<green evidence, named blocker, or no-new-findings condition>

Output:
- pattern used
- evidence inspected
- commands run
- findings by severity
- false positives rejected
- changed files, if any
- remaining risk
- exact next command for Codex or Studio Ops
- CJ action, if any
```

Default CJ action for technical work is `none`.

## Operating Reminder

Dynamic workflows exist to keep CJ safer and less interrupted, not to generate more ceremony.

Use them when they can find what one context window might miss. Otherwise, run the script, fix the thing, verify it, and keep moving.
