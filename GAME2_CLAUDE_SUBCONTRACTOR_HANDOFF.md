# Game 2 Claude Subcontractor Handoff

Status: active
Installed: 2026-05-14
Owner: Codex Game 2 chat

## One-Screen Rule

CJ works with Codex on Game 2. Codex may subcontract Claude Code for bounded background work, but CJ does not manage Claude, track worktrees, reconcile diffs, or approve routine delegation.

Codex remains the game maker, CTO/integrator, release owner, and CJ-facing source of truth.

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

Use Codex as CJ's single Game 2 front door. Codex may subcontract Claude Code for bounded background tasks using the ODG router in `odg-pipeline\invoke-claude-worker.ps1`, but CJ must not manage Claude, worktrees, diffs, or AI labor. Keep Codex as game maker, CTO/integrator, release owner, and CJ-facing truth. Claude is only a bounded worker for read-only checks, docs drift, asset inventories, test scaffolding, narrow script fixes, and second-pass review. Do not let Claude push, deploy, Slack, alter public links, touch secrets, touch production infra, or touch Alpha Complete. Preserve Beta v1 direction: nearby online QR/code two-player on separate phones, PWA first, playing in under 10 seconds.

