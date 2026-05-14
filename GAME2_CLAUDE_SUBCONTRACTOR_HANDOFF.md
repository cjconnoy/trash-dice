# Game 2 Claude Subcontractor Handoff

Status: active
Installed: 2026-05-14
Owner: Codex Game 2 chat

## One-Screen Rule

CJ works with Codex on Game 2. Codex may subcontract Claude Code for bounded background work, but CJ does not manage Claude, track worktrees, reconcile diffs, or approve routine delegation.

Codex remains the game maker, CTO/integrator, release owner, and CJ-facing source of truth.

Studio Ops also owns resource-aware support for Game 2. The Game 2 chat should spend its capacity on game feel, architecture, implementation judgment, and release risk; Studio Ops should absorb routine checks, visual QA evidence, docs drift, link verification, and Claude support packets whenever possible.

## Why This Exists

Game 2 needs CJ and Codex focused on the game: feel, pacing, mobile playability, multiplayer clarity, product judgment, and build quality. Claude Code can absorb lower-risk background labor that would otherwise slow the Game 2 session.

## Recommended Split

Codex owns:

- game feel
- feature direction
- gameplay implementation judgment
- mobile and multiplayer product judgment
- release links
- Alpha Complete protection
- final QA
- commits, pushes, deploys, and CJ-facing status

Claude may help with:

- read-only repo exploration
- stale-link or docs drift scans
- asset inventory and manifests
- test scaffolding
- narrow helper/script fixes
- second-pass code review
- focused bug reproduction notes
- non-active-file refactors explicitly assigned by Codex

Codex may proactively use Claude Code as bounded Game 2 support when it helps throughput, coverage, QA, inventories, docs drift, test scaffolding, or second-pass review. CJ has explicitly authorized this as part of the CTO autonomy mandate. CJ should receive executive-facing recaps, not AI labor coordination chores.

## Hard Boundaries

Claude must not:

- push
- deploy
- Slack
- alter public links
- alter Cloudflare, R2, DNS, or production infrastructure
- edit secrets, env files, credentials, or tokens
- touch Alpha Complete frozen files or paths
- touch `releases/alpha-complete/`
- repoint `https://playonedaygames.com/trash-dice/alpha-complete/`
- modify scheduled task cadence or Ops monitors
- claim readiness to CJ

## Alpha Complete Protection

Alpha Complete is frozen forever at approved build `dc5a995`.

The permanent evaluator link is:

`https://playonedaygames.com/trash-dice/alpha-complete/`

Beta and all future work must use new paths, new release folders, and new share URLs. Claude must treat Alpha Complete as read-only historical evidence unless Codex explicitly asks for a read-only inspection.

## Beta v1 Product Direction

Trash Dice Beta v1 is focused on nearby online two-player:

- two separate phones
- QR/code/link join flow
- no accounts
- no lobby browser
- no chat
- playing in under 10 seconds
- PWA-first polish

Do not pivot toward pass-and-play unless CJ explicitly changes product direction through Codex.

## Mobile Visual QA Update

Studio Ops installed `odg-pipeline\test-mobile-visual-qc.ps1` as the reusable mobile visual QA lane for Game 2 and future games.

The gate launches a mobile-sized browser, forces Trash Dice win/loss terminal states through the debug API, captures screenshots, writes a manifest under `.odg-studio-state\mobile-visual-qc`, and fails if debug chrome bleeds through, Play Again is missing or off-screen, runtime errors occur, or the terminal/game-over state resets before the required wait window.

Current finding from 2026-05-14:

- 5s win/loss terminal screenshots: GREEN
- 12s win/loss terminal screenshots: GREEN
- 20s win/loss terminal screenshots: RED because the game-over state auto-resets around 15s

Game 2 must not claim long-window mobile terminal stability until that 20s reset behavior is intentionally fixed or product-approved. Treat the 20s result as a Game 2 hardening target, not a CJ testing chore.

## How Codex Game 2 Can Use Claude

For read-only checks from the Studio Ops router:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\invoke-claude-worker.ps1" `
  -RepoPath "C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice" `
  -TaskName "game2-readonly-check" `
  -Objective "Read PROJECT_NOTES.md, CLAUDE.md, and GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md; confirm the worker boundaries for Game 2. Do not edit files." `
  -OwnedFiles "PROJECT_NOTES.md","CLAUDE.md","GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md" `
  -ReadOnly `
  -Run `
  -MaxTurns 6
```

For implementation work, use an isolated worktree and an explicit worker packet:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\shove\OneDrive\Desktop\OneDayGames\odg-pipeline\invoke-claude-worker.ps1" `
  -RepoPath "C:\Users\shove\OneDrive\Desktop\OneDayGames\_vibe\trash-dice" `
  -TaskName "<short-task-name>" `
  -Objective "<bounded task>" `
  -OwnedFiles "<exact files/directories>" `
  -UseWorktree `
  -Run `
  -MaxTurns 8
```

Codex must review the diff, run relevant tests, and decide whether to integrate. Claude output is not ODG truth until Codex accepts it.

## Paste To Game 2 Chat

Read `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`, `CLAUDE.md`, and `PROJECT_NOTES.md`.

Use Codex as CJ's single Game 2 front door. Codex may subcontract Claude Code for bounded background tasks using the ODG router in `odg-pipeline\invoke-claude-worker.ps1`, but CJ must not manage Claude, worktrees, diffs, or AI labor. This delegation can be proactive under the CTO autonomy mandate when it makes Game 2 or Studio Ops better. Keep Codex as game maker, CTO/integrator, release owner, and CJ-facing truth. Claude is only a bounded worker for read-only checks, docs drift, asset inventories, test scaffolding, narrow script fixes, and second-pass review. Do not let Claude push, deploy, Slack, alter public links, touch secrets, touch production infra, or touch Alpha Complete. Preserve Beta v1 direction: nearby online QR/code two-player on separate phones, PWA first, playing in under 10 seconds. Also inherit `GAME2_RESOURCE_SUPPORT_PACKET.md`: keep Game 2 chat capacity focused on game feel, architecture, implementation judgment, and release risk while Studio Ops absorbs routine checks, visual QA evidence, link verification, docs drift, and paste-ready support packets. Also inherit the new mobile visual QA gate: `test-mobile-visual-qc.ps1` is green at 5s/12s for current Trash Dice win/loss terminal states and red at 20s because game-over auto-resets around 15s; fix or explicitly product-approve that before claiming long-window terminal stability.
