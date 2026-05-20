# Trash Dice Project Notes

## Standing Handoff And Development Rule

ALPHA COMPLETE is frozen forever at approved build `dc5a995`.

Do not edit, overwrite, rebalance, patch, rename, repurpose, or replace the Alpha Complete build files. Future development must happen under a new build name, new release folder, and new share URL.

The current working Alpha Complete evaluator link is:

- Desktop full: https://playonedaygames.com/trash-dice/alpha-complete/
- Mobile full: https://playonedaygames.com/trash-dice/alpha-complete/

The old already-shared quick-tunnel link is retired after its local `trycloudflare.com` tunnel died on 2026-05-14:

- Desktop full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995
- Mobile full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995

Do not try to reuse or revive that quick-tunnel hostname as the source of truth. The custom-domain copy is byte-locked to the frozen Alpha Complete build and must not be reused for Beta.

Future handoffs must explicitly include this rule and point to:

- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `releases/alpha-complete/README.md`
- `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`
- `GAME2_RESOURCE_SUPPORT_PACKET.md`
- `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`
- `BETA_BACKLOG.md`
- `CLAUDE.md`

For Trash Dice Beta and all later work, never reuse the Alpha Complete link. Create a new named release path or public URL for every new build.

## AI Worker Routing

Game 2 uses Codex as CJ's single front door, game maker, CTO/integrator, release owner, and CJ-facing source of truth. Codex may subcontract Claude Code for bounded background work using `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md` and `CLAUDE.md`, but CJ does not manage Claude, worktrees, diffs, or AI labor handoffs.

Claude Code can help with read-only exploration, docs drift, asset manifests, tests, narrow helper fixes, and second-pass review. Claude must not push, deploy, Slack, alter public links, touch secrets, touch production infrastructure, touch Alpha Complete, or claim readiness.

Codex may proactively use Claude Code as bounded Game 2 support when it helps throughput, coverage, QA, inventories, docs drift, test scaffolding, or second-pass review. CJ has explicitly authorized this as part of the CTO autonomy mandate; CJ should receive executive-facing recaps, not AI labor coordination chores.

## Resource-Aware Game 2 Support

Game 2 chat capacity should be treated as scarce high-context creative/product time. Studio Ops should absorb routine checks, visual QA evidence, link verification, docs drift, Claude worker packets, stale context compression, and paste-ready support packets whenever possible.

Use `GAME2_RESOURCE_SUPPORT_PACKET.md` as the short operating packet for how Ops supports Game 2 without making CJ spend game-chat capacity on technical mechanics.

## Enterprise Beta Quality Bar

Trash Dice Beta v2 is now partner-facing commercial infrastructure. Treat Big Discoveries interest as a real platform-quality escalation: Codex owns release readiness, QA evidence, public-link safety, Worker health, docs drift, and regression capture so CJ can stay creative.

The active Beta backlog spine is `BETA_BACKLOG.md`: nearby two-player mode, QR/join reliability, and iPad/tablet layout. Treat those as priority product infrastructure, not optional polish.

The canonical protocol is `BETA_ENTERPRISE_QUALITY_PROTOCOL.md`. Before any partner-facing Beta release or Slack announcement, run the enterprise gate:

```powershell
.\qa-beta-enterprise.ps1
```

During implementation, use the local gate:

```powershell
.\qa-beta-enterprise.ps1 -SkipPublic
```

Auto-fixes are allowed only when bounded and validated. The current safe auto-fix is Beta mirror repair through `.\qa-beta-enterprise.ps1 -AutoFix`; future auto-fixes must not touch Alpha Complete, secrets, DNS, Slack, partner links, or game-rule logic without explicit validation.

## Mobile Visual QA Gate

Studio Ops installed `odg-pipeline\test-mobile-visual-qc.ps1` as the reusable mobile visual QA lane for Game 2 and future games.

The gate launches a mobile-sized browser, forces Trash Dice win/loss terminal states through the debug API, captures screenshots, writes a manifest under `.odg-studio-state\mobile-visual-qc`, and fails if debug chrome bleeds through, Play Again is missing or off-screen, runtime errors occur, or the terminal/game-over state resets before the required wait window.

Current Game 2 finding from 2026-05-14:

- 5s win/loss terminal screenshots: GREEN
- 12s win/loss terminal screenshots: GREEN
- 20s win/loss terminal screenshots: RED because the game-over state auto-resets around 15s

Game 2 must not claim long-window mobile terminal stability until that 20s reset behavior is intentionally fixed or product-approved. The next Game 2 technical focus should include making terminal/game-over persistence match the review and release promise.

## Trash Dice Beta v1 Direction

Current Beta v2 review path as of 2026-05-19:

- Desktop full: https://playonedaygames.com/trash-dice/beta-v2/?v=cb1dda6
- Mobile full: https://playonedaygames.com/trash-dice/beta-v2/?v=cb1dda6

The stable custom-domain path serves the actual Beta game bytes, not the generic One Day Games shell. The public room backend is the Cloudflare Worker `trash-dice-beta-room` at `wss://trash-dice-beta-room.play-onedaygames.workers.dev/beta-ws`. Public two-client QA passed on 2026-05-19, including host invite controls on a 320px viewport, create/join/start, deterministic Player 2 first turn, Player 2-to-Player 1 handoff readiness, gameplay rolls, Player 2 small-phone roll-panel clearance, public active-game layout at 1024x980, 768x920, 390x664, and 320x568 viewports, title/tagline visibility without overlap, CPU-to-player handoff timing across lid and trash outcomes, and protocol checks for guest starts, out-of-turn rolls, and duplicate-turn rolls. The production CPU-to-player handoff is 250ms as of `a1b0045`; public QA on `cb1dda6` measured Green-to-Yellow nearby readiness at 274ms, CPU lid handoff at 273ms, and CPU trash handoff at 265ms. Do not share a future Beta build until `qa-beta-public-build.ps1 -RunMultiplayerQa` passes for the exact public URL and Alpha Complete still byte-matches its frozen SHA.

Beta v1 should focus on a very simple nearby two-player online mode plus PWA polish. Nearby online QR/code two-player is the primary Beta multiplayer target, not pass-and-play.

The guiding multiplayer target is: someone says "scan this," and both players are playing in under 10 seconds.

This is a hard Beta requirement, not a preference: Trash Dice two-player must be easy to understand, easy to access, and playable from a shared link on normal phones. Every Beta multiplayer, PWA, layout, hosting, or onboarding change must protect the path from "tap link" to "playing with someone." A player should not need an explanation from CJ, an app install, an account, a desktop browser, or prior knowledge of the prototype.

Acceptance expectations for the easy-access requirement:

- On iPhone Safari, including small devices such as iPhone SE, the full game state and primary action must remain visible and tappable.
- The `2 PLAYER` entry point must be obvious from the first screen.
- Player 1 must be able to create a room and immediately show a QR code, room code, or share link.
- Player 2 must be able to join by scanning/opening the room link or by entering the room code into an obvious visible input.
- The interface must clearly communicate whose turn it is, what to tap next, and whether the other player is connected.
- The `ROLL!` action panel must never be hidden beneath mobile browser chrome or blocked by badges/debug UI.
- QA for reviewable Beta builds must include a two-client multiplayer pass and a small-phone mobile layout pass for the join flow and in-game roll state.

Beta v1 multiplayer should be strictly two players on two separate phones, no spectators, no accounts, no lobby browser, no chat, and no server-generated dice rolls. The flow should be:

- Player 1 taps `2 PLAYER`, then `Create Game`.
- Player 1 sees a large QR code, a short room code, and a share link.
- Player 2 taps `2 PLAYER`, then `Join Game`, and scans the QR code or enters the short code.
- Once both seats are filled, play starts quickly.

The server should sync the shared room state and reject impossible moves/desyncs. For Beta v1, the active player's device may generate the roll result because this mode is designed for nearby social-trust play, not ranked or stranger matchmaking.

Do not pivot Beta v1 toward local same-device pass-and-play unless CJ explicitly changes direction. The intended table flow is each player using their own phone.

The app direction for Beta v1 is PWA first: install-to-home-screen polish, app icon, standalone display, and mobile-friendly launch behavior. Players must not need to install the app to play; the share link should work immediately in a browser, with installation as an optional convenience.

