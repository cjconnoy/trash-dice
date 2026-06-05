# Review Notes

Local CJ review-note queue for the Trash Dice HTML5 ship lane.

Use:

```powershell
.\add-cj-review-note.ps1 -Area feel -Priority p1 -Note "Opening still feels too punishing on first play."
.\add-cj-review-note.ps1 -List
```

The generated queue file is `cj-review-queue.jsonl` and is ignored by default. Codex may promote specific notes into tracked work orders, docs, commits, or release notes when useful.
