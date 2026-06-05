# Trash Dice HTML5 Ship Lane

Source lane for the Phase 1 instant-play digital companion.

- Baseline: Beta v3, with ship-safe QoL fixes preserved.
- Target public URL: `https://playonedaygames.com/trash-dice/play/`
- Mode: one-player only.
- No PWA: no manifest, install prompt, service worker, or home-screen flow.
- No two-player: no room UI, room code flow, QR flow, or WebSocket connection.
- Analytics: anonymous Umami play telemetry only. No login, email, account, cart, coupon, or purchase tracking.
- Development badge: `BETA WIP - NOT LIVE` stays visible until final live release pass.

Required local gate:

```powershell
node qa-ship-html5.js
```

Retail loop gate:

```powershell
node qa-retail-loop.js
```
