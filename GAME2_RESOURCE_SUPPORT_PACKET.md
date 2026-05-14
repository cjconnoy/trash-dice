# Game 2 Resource Support Packet

Status: active
Installed: 2026-05-14
Owner: Studio Ops / Codex CTO

## Purpose

Game 2 chat capacity should be spent on the game: feel, pacing, multiplayer clarity, implementation judgment, architecture, and release risk.

Studio Ops should absorb routine technical support so CJ can keep creating and the Game 2 chat does not burn high-context time on mechanics.

## Operating Rule

CJ talks to Codex. Codex routes the work.

When a Game 2 task can be handled by Studio Ops without creative/product judgment, Studio Ops should do it or package it for the Game 2 chat.

## Studio Ops Should Absorb

- repo status and hygiene checks
- handoff/doc updates
- link and public/private-surface verification
- mobile visual QA evidence
- screenshots and manifests
- Claude Code worker packets
- docs drift checks
- asset inventories
- stale context compression
- paste-ready Game 2 support notes

## Game 2 Chat Should Preserve Capacity For

- game feel
- multiplayer UX
- mobile playability judgment
- implementation decisions that affect the actual game
- architecture/risk tradeoffs
- release readiness
- CJ creative/product direction

## Claude Code Support

Codex may proactively use Claude Code as a bounded background worker for read-only checks, inventories, docs drift, test scaffolding, narrow helper fixes, and second-pass review.

Claude does not push, deploy, Slack, alter links, touch production infrastructure, touch secrets, touch Alpha Complete, or claim readiness. Codex reviews and accepts or rejects the work.

## Current Studio-Support Truth

Studio Ops installed `odg-pipeline\test-mobile-visual-qc.ps1`.

Current Trash Dice mobile visual QA result:

- 5s win/loss terminal screenshots: GREEN
- 12s win/loss terminal screenshots: GREEN
- 20s win/loss terminal screenshots: RED because game-over auto-resets around 15s

Game 2 should fix or intentionally product-approve that 20s behavior before claiming long-window terminal stability.

## Paste To Game 2 Chat

Read `PROJECT_NOTES.md`, `GAME2_CLAUDE_SUBCONTRACTOR_HANDOFF.md`, `CLAUDE.md`, and `GAME2_RESOURCE_SUPPORT_PACKET.md`.

Keep Game 2 chat capacity focused on game feel, multiplayer UX, implementation judgment, architecture, and release readiness. Studio Ops is available to absorb routine checks, visual QA evidence, docs drift, link verification, Claude worker packets, stale context compression, and paste-ready support notes. Do not make CJ coordinate technical mechanics or AI labor.
