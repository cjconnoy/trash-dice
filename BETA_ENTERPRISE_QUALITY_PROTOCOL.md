# Trash Dice Beta Enterprise Quality Protocol

Prepared: 2026-05-17

Trash Dice Beta v2 is now partner-facing commercial infrastructure. Big Discoveries interest means the operating bar is no longer "prototype that works"; it is "reviewable build with evidence, rollback awareness, platform ownership, and defects converted into tests."

CJ owns the creative direction. Codex owns the technical path, release readiness, QA evidence, platform risk, and partner-safe communication.

## Non-Negotiables

- Alpha Complete remains frozen forever at `dc5a995` with SHA-256 `b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f`.
- Beta v2 must use its own public path: `https://playonedaygames.com/trash-dice/beta-v2/`.
- No reviewable Beta link may be shared until the exact public bytes match the committed Beta artifact.
- No reviewable Beta link may be shared until public two-client nearby-mode QA passes.
- No reviewable Beta link may be shared until room protocol QA passes against the public Worker.
- No reviewable Beta link may be shared until Alpha Complete still byte-matches the frozen SHA.
- No reviewable Beta link may be shared while the forbidden local preview port `4173` is listening.
- No WIP Slack. Slack updates happen only after commit, push, public byte verification, targeted QA, and Alpha lock check.
- Every serious bug becomes either an automated regression test, an explicit product decision, or a documented platform risk.

## Enterprise Gate

Use the enterprise QA entrypoint before partner-facing Beta releases:

```powershell
.\qa-beta-enterprise.ps1
```

For a local-only gate while iterating:

```powershell
.\qa-beta-enterprise.ps1 -SkipPublic
```

For changes that affect terminal states, mobile layout, or reviewability, add the canonical visual lane:

```powershell
.\qa-beta-enterprise.ps1 -RunMobileVisualQc
```

The enterprise gate wraps the existing focused checks instead of replacing them. It verifies the Beta mirror, script parsing, QA script syntax, room server syntax, Worker syntax, git whitespace health, readiness dry run, forbidden preview port, local two-client multiplayer QA, nearby Player 2-to-Player 1 handoff readiness, local CPU-to-player handoff QA across both lid and trash outcomes, local tablet/phone active-game layout QA, local room protocol QA, Worker deploy dry run, optional mobile visual QC, and public byte/protocol/multiplayer/CPU-handoff/tablet/phone layout QA when not skipped.

## Auto-Fix Doctrine

Auto-fixing is encouraged only when it is bounded, reversible, and validated by a gate. The first safe auto-fix class is mechanical Beta mirror repair: `beta/trash-dice.html` may be overwritten from `beta/index.html` when `-AutoFix` is passed to the enterprise gate.

Safe future auto-fix candidates:

- Re-copy the Beta public artifact into the publishing repo when public bytes are stale, then rerun public byte QA before any communication.
- Redeploy the Worker when protocol QA fails because the deployed Worker is stale and the local Worker dry run passes.
- Retry public fetches across Pages propagation delays before declaring a release failure.
- Generate an incident note and regression-test stub after a reproducible failure.

Unsafe auto-fix classes:

- Never auto-edit Alpha Complete.
- Never auto-change DNS, domains, secrets, Cloudflare credentials, or Slack partner-facing links without validation.
- Never silently rewrite game rules or dice outcomes to satisfy a test.
- Never post Slack or partner updates as an auto-fix side effect.

Auto-fix is not a substitute for judgment. It is a way to remove known mechanical failure modes so creative iteration is not dragged into plumbing.

## Current Technical Concerns

The nearby two-player Beta is now ship-hardened for the current public review flow, but these concerns matter before treating it as enterprise-grade product infrastructure:

- Dice rolls are still client-generated. This is acceptable for nearby social-trust Beta, but partner/commercial deployments should consider server-generated rolls, deterministic room logs, or a commit-reveal scheme.
- Reconnect and resume are limited. A short disconnect can recover through current room state only in narrow cases; durable player tokens, resume windows, and explicit host migration are not yet implemented.
- QR generation depends on `quickchart.io`. That is a third-party runtime dependency in the join flow; enterprise reliability should move QR generation in-app or to owned infrastructure.
- Observability is thin. The Worker needs uptime checks, protocol smoke checks, error-rate visibility, and release annotations before paid/partner demos become routine.
- Abuse controls are minimal. Room creation and socket traffic need rate limiting, quota posture, and basic bot resistance before broad public sharing.
- Browser matrix is not yet enterprise complete. Headless QA is strong, but real iPhone Safari and Android Chrome spot checks should become recurring release evidence.
- Visual regression evidence is not yet automated for every nearby-mode state. Current QA checks layout geometry; screenshot diffing should cover invite, joined, starter roll, active turn, peer-left, and room-closed states.
- Long-window terminal-state mobile QC is still red at 20s because the game auto-resets around 15s. This is not a two-player regression, but it must be fixed or explicitly product-approved before claiming long-window terminal stability.
- The full six-slot board cycle, end-of-game, same-room rejoin after disconnect, and copy/share fallback paths need deeper automated coverage. Basic public peer-left visual recovery is now covered as of `8d6e71e`.
- Platform ownership is not yet procurement-clean. Access, deploy keys, Cloudflare ownership, rollback steps, privacy/analytics posture, and partner licensing assumptions need an owner-visible inventory.

## QA Evidence Standard

For every partner-facing Beta build, capture or record:

- Commit SHA and public cache-busted URL.
- Public Beta SHA-256 and committed Beta artifact SHA-256.
- Frozen Alpha SHA-256 verification.
- Local nearby two-client QA result.
- Public nearby two-client QA result.
- Opening roll-off clarity and timing result.
- Nearby peer-left/room-closed visual recovery result.
- CPU-to-player handoff QA result for both lid and trash outcomes.
- Room protocol QA result against public Worker.
- Tablet/phone active-game layout QA result, including title/tagline visibility.
- Worker deploy dry-run result.
- Mobile visual QC status, including whether the known 20s terminal reset remains red.
- Any manual real-device spot checks and device/browser names.
- Slack message link when a build is announced.

## Release Communication

CJ should receive the simplest useful summary: what changed, what passed, what remains risky, and the exact Desktop/Mobile links. Technical details belong in commits, QA logs, and this protocol unless they affect creative decisions or partner promises.

Slack stays release-only. If a build is not verified, it is not announced.
