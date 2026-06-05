# CJ Review Workflow

Purpose: make Trash Dice HTML5 Beta iteration feel like dropping notes into a lane, not re-prompting the whole project.

## Canonical Review URL

Use the stable protected review URL:

`https://playonedaygames.com/trash-dice/play/`

Do not use Slack links, local IPs, tunnels, one-off previews, or `/trash-dice/ios-preview/` for this HTML5 ship lane.

## How CJ Can Give Notes

CJ can paste rough notes in chat, for example:

```text
TD notes:
- title feels too busy on phone
- opening is too punishing
- can label still feels placeholder
```

Codex owns turning those notes into:

- a scoped ship-lane work order
- risk/decision flags
- implementation tasks
- QA commands
- verified review status

## Local Queue

Use this helper when notes should persist outside chat:

```powershell
.\add-cj-review-note.ps1 -Area feel -Priority p1 -Note "Opening still feels too punishing on first play."
.\add-cj-review-note.ps1 -List
```

Notes are stored locally at:

`review-notes\cj-review-queue.jsonl`

The queue is intentionally local by default so rough creative notes do not become public project history unless Codex intentionally promotes them into commits, docs, or release notes.

## Status Vocabulary

- `new`: CJ note captured, not yet triaged
- `accepted`: Codex agrees it belongs in the HTML5 ship lane
- `needs-cj-call`: product/creative decision needed before implementation
- `implemented`: code or asset change made
- `verified`: QA and review evidence captured
- `deferred`: good note, not for this shipping pass
- `rejected`: conflicts with doctrine or belongs to another lane

## Boundaries

Always preserve these constraints:

- Do not touch Alpha Complete.
- Do not do iOS app work in this lane.
- Do not add PWA, install ceremony, login, account, email capture, or PII.
- Do not use `/trash-dice/ios-preview/` as the HTML5 ship review target.
- Do not embed passwords in files, URLs, Slack, shortcuts, or notes.
- Keep ship mirrors exact with `.\sync-ship-html5.ps1`.

## Default Codex Loop

1. Capture rough CJ notes.
2. Classify each note as `feel`, `visual`, `copy`, `bug`, `analytics`, `launcher`, `qa`, or `other`.
3. Split notes into small ship-lane work orders.
4. Identify any `needs-cj-call` decisions.
5. Implement accepted low-risk changes.
6. Run `.\qa-ship-iteration.ps1`.
7. Verify Alpha diffs remain empty.
8. Report the stable review URL, what changed, what passed, and what remains.
