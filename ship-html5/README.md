# Trash Dice HTML5 Ship Lane

Source lane for the Phase 1 instant-play digital companion.

- Status: Beta Complete as of 2026-06-18. Use `..\TRASH_DICE_RETAIL_HANDOFF.md` for the current live-shipping checklist.
- Baseline: Beta v3, with ship-safe QoL fixes preserved.
- Target public URL: `https://playonedaygames.com/trash-dice/play/`
- Mode: one-player only.
- No PWA: no manifest, install prompt, service worker, or home-screen flow.
- No two-player: no room UI, room code flow, QR flow, or WebSocket connection.
- Analytics: anonymous Umami play telemetry only. No login, email, account, cart, coupon, or purchase tracking.
- Public cleanup: Retail hides debug controls outside QA/review mode and no longer shows the `BETA WIP - NOT LIVE` badge.

Required local gate:

```powershell
node qa-ship-html5.js
```

Retail loop gate:

```powershell
node qa-retail-loop.js
```

Fast iteration helpers:

```powershell
.\sync-ship-html5.ps1
.\qa-ship-iteration.ps1
```

`sync-ship-html5.ps1` copies `ship-html5/index.html` to the ship mirror and Studio Site play mirrors, parses scripts, checks matching hashes, and verifies Alpha Complete diffs are empty before and after. `qa-ship-iteration.ps1` runs sync first, then runs the ship and retail-loop browser QA jobs in parallel by default.
