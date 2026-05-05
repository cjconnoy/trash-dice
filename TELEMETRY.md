# TRASH DICE — Game 2 Production Telemetry
One Day Games | Game 2 | Full development cycle tracking

---

## 🟡 CLOCK STATUS: PAUSED

| Field | Value |
|---|---|
| Game | Trash Dice |
| Studio | One Day Games |
| Game # | 2 |
| Dev clock start | 2026-04-27 13:47:09 PDT |
| Dev clock stop | — |
| Total elapsed | — |
| Status | Blockout complete; 1st Playable next |

---

## SESSION LOG

| # | Date | Start | Stop | Elapsed | Phase | Notes |
|---|---|---|---|---|---|---|
| 1 | 2026-04-27 | 13:47:09 PDT | 14:13:47 PDT | 26 min | Kickoff → v0.1 playable | Clock started, rules locked, v0.1 built, CPU added, dual-die layout |

---

## PHASE TRACKER

| Phase | Status | Started | Completed | Notes |
|---|---|---|---|---|
| 0 — Rules intake & design doc | Complete for blockout | 2026-04-27 | 2026-05-02 | Core rules implemented and playable; fidelity details continue into 1st Playable |
| 1 — Blockout (HTML vibe build) | Complete | 2026-04-27 | 2026-05-02 | Private research/blockout build backed up at commit `3c0d9ba`; proves loop, CPU, die travel, trash can, lid payout, and win beats |
| 2 — 1st Playable | In Progress | 2026-05-02 | — | Next deliverable: make the game feel fully playable and reviewable, with mobile readiness and stronger toy-object fidelity |
| 3 — Vertical Slice | Not started | — | — | Starts after 1st Playable is accepted |
| 4 — Scaffold (new-game.ps1) | Not started | — | — | Needs CJ greenlight; do not scaffold during vibe/blockout/1st-playable work |
| 5 — QA sweep | Not started | — | — | |
| 6 — Ship | Not started | — | — | |

---

## FILE LOG

| File | Created | Last Modified | Lines | Notes |
|---|---|---|---|---|
| TELEMETRY.md | 2026-04-27 | 2026-04-27 | — | This file |
| trash-dice.html | 2026-04-27 | 2026-04-27 | ~500 | v0.2 — SVG lid, graffiti title, blob mat, attract screen, CPU, 2x board/dice |

---

## DECISION LOG

| # | Date | Decision | Rationale |
|---|---|---|---|
| 1 | 2026-04-27 | Game 2 = Trash Dice | CJ confirmed |
| 2 | 2026-04-27 | Vibe-first, no scaffold until greenlight | Per ODG process |
| 3 | 2026-04-27 | Map Room concept retired — Trash Dice is Game 2 | CJ confirmed; Map Room archived to `_archive\map-room\` |
| 4 | 2026-05-02 | Current build classified as Blockout Complete | CJ corrected milestone language; next deliverable is 1st Playable, not Vertical Slice |

---

## TOKEN / COST TRACKING
*Claude cannot read its own token counts mid-session. Log manually or pull from Anthropic console after each session.*

| Session | Turns (approx) | Input tokens | Output tokens | Cost (est.) | Notes |
|---|---|---|---|---|---|
| 1 | — | — | — | — | Check console post-session |

**Running total:** TBD — check [Anthropic Console](https://console.anthropic.com) after each session for exact usage.

---

## MILESTONE LOG

| Milestone | Date | Time | Notes |
|---|---|---|---|
| Dev clock started | 2026-04-27 | 13:47:09 PDT | |
| v0.1 shipped | 2026-04-27 | ~14:00 PDT | Fully playable hot-seat build |
| CPU added | 2026-04-27 | ~14:10 PDT | You vs CPU, dual-die layout |
| Clock paused | 2026-04-27 | 14:13:47 PDT | Session 1 end |
| Clock resumed | 2026-04-27 | 14:42:27 PDT | Session 2 start — 28 min pause |
| Clock paused  | 2026-04-27 | 16:33:58 PDT | Session 2 end — ~1hr 51min active |
| v0.3 shipped | 2026-04-27 | ~15:30 PDT | SVG lid, graffiti title (Bangers), blob 3x/static, CPU top/You bottom, mini dice pool, 1.5s roll, audio engine, fanfares |
| v0.4 shipped | 2026-04-27 | ~16:20 PDT | 2.5D dice (perspective tilt + 3D roll animation), lime mat (#c5d400), Tap to Start overlay, dice-fly animation, pip inventory, trash fanfare, turn tags, CPU bug fixed |
| Physical feel pass | 2026-05-01 | ~23:10 PDT | Roll-in-place die motion, die travel to lid/can, hero trash can, duration-scaled spill payout, roll/clink/crash synthesized SFX |
| Blockout Complete | 2026-05-02 | 15:16 PDT | Current HTML build classified as Blockout Complete; online backup commit `3c0d9ba`; next lane opened as 1st Playable |

---

## 2026-05-01 FEEL PASS ADDENDUM

Event ID: `trash-dice-feel-pass-20260501`

Approximate active elapsed: ~45 minutes from implementation verification through browser smoke, excluding earlier research/context work.

Major phases:
- Implemented physical roll feel: the active die now stays in its player panel, rattles in place with fast pip shuffling, reveals the final face, holds briefly, then travels to the lid or trash can.
- Added data-driven round payout timing: `spillDuration = clamp(900 + diceWon * 170, 1200, 3600)`, with individual dice staggered across the full spill duration.
- Retuned audio identity with synthesized `rollLoop`, `placeClink`, and `trashCrash` SFX while keeping the musical win/fanfare language.
- Preserved fairness: roll results still use `Math.floor(Math.random() * 6) + 1`; pip shuffling is cosmetic.

Verification:
- In-app browser preview reloaded at `http://127.0.0.1:5174/index.html`.
- Normal smoke passed: start, human roll, visible `.rolling` die class, successful lid placement, trash can present, no browser console errors.
- Looped local playthrough passed: observed successful placement, trash outcome, completed-lid round win, six-die spill payout, and clean return to player control.
- Static regression check: no `R1` hub label path remains; `index.html` and `trash-dice.html` hashes match.

Reusable lesson:
- Physical board-game feel work is not just visual polish. It creates cross-system timing dependencies between animation, input lockout, pool accounting, SFX duration, and CPU handoff. Future ODG board-game recreations should budget this as an interaction-systems pass, not a pure art pass.

*Updated by Game 2 chat. Clock runs until CJ says stop or pause.*

---

## 2026-05-02 VICTORY / TRASH CAN REACTION PASS

Event ID: `trash-dice-victory-trash-reaction-20260502`

Approximate active elapsed: ~30 minutes for implementation, mirroring, and local verification setup.

Major phases:
- Separated failed-roll trash-can reaction from round-win payout. Failed rolls now scale the can pulse, glow, duration, and crash/fanfare intensity from the actual accumulated trash load.
- Preserved round-win identity as lid-first celebration, then a longer can-pour payout into the winner inventory using `lidDice.length + totalTrashedDice()` as the visual spill load.
- Added full-game player victory tier: dice cannon from the can, board spin fanfare, victory overlay punch, and a larger synthesized win fanfare.

Reusable lesson:
- Trash Dice needs three distinct celebration tiers: valid placement, round completion, and full-game win. Reusing the same trash-can hunger beat for all of them muddies the product fantasy; the can should eat on failure, pour on round reward, and erupt on final victory.

---

## 2026-05-02 BLOCKOUT COMPLETE / 1ST PLAYABLE OPEN

Milestone classification: Blockout Complete.

Online backup: game files backed up to `https://github.com/cjconnoy/trash-dice.git` at commit `3c0d9ba` (`Complete Trash Dice vibe prototype`).

Next deliverable: 1st Playable.

Milestone quality definitions:
- Blockout: gameplay code and architecture should be treated as potentially shippable and not intentionally throwaway. Art, audio, animation, and UI are temporary/placeholder unless explicitly promoted.
- 1st Playable: first pass where both code and assets are expected to be shippable quality. For assets, "shippable quality" means matching the physical board game 1:1 whenever an HTML equivalent exists, unless CJ explicitly directs an intentional adaptation. Remaining work after 1st Playable should be director notes, final polish, final performance/memory pass, QA hardening, and production-readiness work.

1st Playable target:
- Preserve the current complete rules loop, CPU opponent, fair dice RNG, and three-tier celebration structure.
- Replace placeholder art/audio/animation/UI with first-pass shippable assets: authentic toy-object lid, physical dice, straight-sided can, readable label treatment, intentional SFX, and coherent game UI that match the board game 1:1 wherever applicable.
- Keep implementation code production-minded: maintainable state flow, deterministic QA hooks, no debug-only shortcuts in the player path, and clear separation between game rules, presentation, and review utilities.
- Tighten mobile ergonomics and reviewability without entering production scaffold.
- Add enough test hooks or deterministic QA routes to quickly verify trash, round-win payout, game-win victory, and reclaim/control states.
- End state should feel like a shippable-quality private research build CJ can review repeatedly, not yet a public vertical slice.

---

## 2026-05-02 1ST PLAYABLE PASS 1 - ASSET FIDELITY

Event ID: `trash-dice-first-playable-asset-pass-20260502`

Approximate active elapsed: ~55 minutes including source-truth reread, official product reference pass, implementation, mirroring, and preview smoke.

Reference sources:
- Official Big Discoveries Trash Dice product page and media: can, open top with dice, removable lid/gameboard, 40 dice, two-player product details.

Major changes:
- Moved the visible art direction from Blockout placeholder toward 1st Playable object fidelity: orange/green/yellow Trash Dice title language, glossy rounded yellow/green dice, molded gray lid, straight-sided gray can, open rim with visible dice, horizontal can grooves, and a label treatment closer to the physical product.
- Rebuilt the lid presentation around molded plastic tabs, ring grooves, raised dividers, readable numbered pockets, and shippable-looking dice placement.
- Tightened panel die sizing so active dice no longer trample player labels.
- Added gated QA hooks behind `?qa` / `#qa` for deterministic roll queues, trash-load reaction checks, round-win payout checks, game-win celebration checks, and state inspection.

Verification:
- `index.html` and `trash-dice.html` mirrored with matching SHA256 hash.
- Inline script syntax check passed.
- In-app browser preview reloaded at `http://127.0.0.1:5174/index.html`.
- Start/gameplay smoke passed; player roll observed; no browser console errors.

Status:
- This is the first local 1st Playable pass, not the final 1st Playable acceptance point.
- Not shipped, not scaffolded, not pushed. Private vibe-stage work remains local until CJ asks for backup/review publishing.

---

## 2026-05-02 1ST PLAYABLE PASS 2 - AUTOPLAY AND RETAIL FIDELITY

Event ID: `trash-dice-first-playable-autoplay-retail-fidelity-20260502`

Approximate active elapsed: ~45 minutes for CJ-directed fidelity response, implementation, P-0 autoplay debug mode, and browser smoke.

Major changes:
- Added P-0 autoplay debug mode so the build can play itself through the normal roll path. It can be started with `?p0`, `#p0`, or by typing `p0` in the page. This is a debug/watch mode, not a rules shortcut.
- Reworked the Trash Dice wordmark treatment away from generic arcade text and toward the retail label: rounded product-logo typography, yellow/orange face, coral offset, dark green outline, and matching header/start/can-label usage.
- Improved the trash can top to read closer to the public retail reference: larger glossy dice protrude above the open rim, softer physical pips, less cartoon-outline treatment, and better rim layering.
- Adjusted ready dice toward physical player dice material rather than placeholder black cubes while keeping the die-as-roll-control interaction.
- Removed emoji-style UI text from trash and win messages so first-playable presentation stays less placeholder-like.

Verification:
- Inline script syntax check passed.
- In-app browser preview ran `http://127.0.0.1:5174/index.html?p0` with P-0 autoplay active.
- 20-second P-0 smoke passed with repeated player and CPU turns, placements, trash-can reaction, debug badge, and no browser console errors.

Remaining first-playable fidelity risks:
- The wordmark is now materially closer, but still an authored SVG/text approximation rather than the exact retail logo art.
- The lid and dice are first-pass vector recreations from public references; they are not yet exact traced production assets.
- The UI panels remain game UI adaptations, not physical product elements, and should stay visually quiet unless CJ wants a full retail tabletop presentation.

---

## 2026-05-02 1ST PLAYABLE CANDIDATE REVIEW PASS

Event ID: `trash-dice-first-playable-candidate-review-pass-20260502`

Approximate active elapsed: ~25 minutes for candidate judgment, tabletop presentation pass, P-0 smoke, and mirroring.

Candidate stance:
- The prior pass was not submitted as the 1st Playable candidate because it still read too much like a dark arcade UI with retail-inspired pieces.
- This pass moves the build to a local 1st Playable review candidate: not accepted, not shipped, not pushed, but ready for CJ review as a potentially shippable first-playable direction.

Major changes:
- Shifted the primary scene from dark arcade staging to a light neutral tabletop presentation closer to the public retail product photos.
- Quieted UI panels into translucent review/game affordances so the physical can, lid, and dice carry the scene.
- Kept the retail-style Trash Dice wordmark treatment, can label, open can dice, molded lid, physical dice colors, and P-0 autoplay debug mode.
- Ensured inactive player dice stay physical yellow/green dice instead of reverting to placeholder black cubes.

Verification:
- P-0 autoplay preview active at `http://127.0.0.1:5174/index.html?p0`.
- In-app browser smoke showed repeated fair-path autoplay with placements and no console errors.

Known review risks:
- The wordmark and label remain recreated approximations from public references, not official source logo art.
- The board lid is a faithful vector interpretation, not a traced CAD/photo-perfect lid.
- This is still vibe-stage local work; production scaffold, live publish, public comms, and mobile Slack review are not triggered.

---

## 2026-05-02 1ST PLAYABLE CANDIDATE ISSUE RESPONSE

Event ID: `trash-dice-first-playable-candidate-issue-response-20260502`

Approximate active elapsed: ~35 minutes for CJ review-note response, implementation, P-0 observation, syntax check, and mirroring.

CJ issues addressed:
- Added a visible `1ST PLAYABLE WORK IN PROGRESS` badge for review clarity.
- Added progressive can-fill state. Trashed dice are now tracked as actual dice objects, rendered visibly in the can during the round, and stacked upward as the can load increases.
- Increased inventory/pool dice fidelity with larger dice, stronger material shading, larger pips, and more physical pile layout.
- Added a successful-placement lid pulse/ring so valid placement has physical impact beyond the clink SFX.
- Reworked round-win payout dice from glowing/rainbow squares into real dice using the same mini-die renderer. The claim badge now emphasizes `WINNER`, and payout dice travel from can to winner inventory as dice.
- Added spacing around active rolling dice so they sit less tightly against the inventory piles.

Behavioral note:
- Because the can now contains actual dice objects, round completion now awards both lid dice and current can dice to the round winner. This matches CJ's previous direction that the can empties into the winner's inventory, but it is a meaningful game-economy behavior and should be specifically reviewed.

Verification:
- Inline script syntax check passed.
- P-0 autoplay preview observed at `http://127.0.0.1:5174/index.html?p0`.
- Observed progressive can-fill with multiple dice, pool-count changes after a round payout, continued autoplay, and no page console errors.

---

## 2026-05-02 1ST PLAYABLE WIP REVIEW FIX PASS

Event ID: `trash-dice-first-playable-wip-review-fix-pass-20260502`

Approximate active elapsed: ~30 minutes for CJ review-note response, implementation, browser observation, syntax check, and file mirroring.

CJ issues addressed:
- Replaced the round-win bottom message that exposed debug-style color ratios with retail-facing winner copy.
- Added a trash-can impact pulse ring on failed rolls so the can reaction has visible physical weight in addition to the compounding crash SFX.
- Changed successful lid placement pulse color to match the placing player: yellow for player dice, green for CPU dice.
- Preserved actual rolled values on dice objects as they move from roll result to board placement, can fill, and can payout. Can-fill dice now use the same value that was rolled.
- Compressed panel turn labels to `TURN` so they no longer spill outside the player UI boxes.
- Reworked the game-over overlay z-order, sizing, and copy so `YOU WIN!` centers cleanly and reads more like a first-playable celebration.

Verification:
- Inline script syntax check passed for `index.html` and mirrored `trash-dice.html`.
- In-app browser P-0 autoplay ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Observed successful placements, progressive can fill, at least one round payout, continued P-0 autoplay, and a centered `YOU WIN!` game-over overlay.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.

---

## 2026-05-02 1ST PLAYABLE FIDELITY AND FANFARE PASS

Event ID: `trash-dice-first-playable-fidelity-fanfare-pass-20260502`

Approximate active elapsed: ~35 minutes for retail-copy check, SVG/game-feel changes, P-0 browser smoke, syntax check, and mirroring.

CJ issues addressed:
- Confirmed the public Big Discoveries Trash Dice page uses the copy `Roll. Collect. Avoid the trash.` and a product section titled `Roll. Win. Avoid the Bin`; the visible retail can label uses `ROLL, WIN, AVOID THE BIN!`.
- Updated the main title/tagline treatment so the tagline matches the can-label punctuation and the win overlay uses the official product-page phrase `Roll. Collect. Avoid the trash.`
- Improved the authored SVG wordmark silhouette with stacked, chunkier Trash/Dice forms and green backing shapes. This is closer to retail references but remains blocked from true 1:1 without official source logo/label art or a flat scan.
- Increased positive lid-placement fanfare with a slot-local burst, stronger board pulse, and a short celebratory audio sting keyed to player color.
- Expanded the player game-win celebration with a full-screen spinning lid backdrop and persistent dice-confetti that remains until a new game starts.
- Adjusted board/can scene offsets so the trash can no longer hugs the right edge of the player/CPU panel boundary.
- Fixed game-end timing after valid placements: if a non-round-winning placement leaves the roller with zero dice, the game ends from that move instead of waiting for the next player turn.

Verification:
- Inline script syntax check passed.
- In-app browser P-0 autoplay ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Observed updated title/tagline, improved board/can composition, successful placement flow, and continued autoplay.
- A direct `javascript:` QA shortcut for forcing game-win was blocked by Browser Use security policy, so the new persistent win-confetti path was code-reviewed and syntax-verified but not shortcut-triggered in-browser in this pass.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.

---

## 2026-05-02 CAN EMPTYING SPILL PASS

Event ID: `trash-dice-can-emptying-spill-pass-20260502`

Approximate active elapsed: ~15 minutes for implementation, syntax checks, P-0 smoke, mirroring, and telemetry.

CJ issue addressed:
- During round-win payout, the visible trash-can dice now drain progressively while dice spill into the winner inventory. This is the reverse of the can-fill behavior and avoids the old hard-clear at the end of the payout.

Implementation note:
- The round winner still receives the copied `claimedDice` list at the end of the spill. The live `trashDice` array is only drained for visual can state during the spill, so payout accounting remains stable.

Verification:
- Inline script syntax check passed for `index.html` and mirrored `trash-dice.html`.
- In-app browser P-0 autoplay ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Observed can fill, round transition behavior, continued autoplay, and no page console errors.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.

---

## 2026-05-02 RESULT OVERLAY AND P-0 RESTORE PASS

Event ID: `trash-dice-result-overlay-p0-restore-pass-20260502`

Approximate active elapsed: ~25 minutes for result-screen polish, QA hook support, P-0 restore, browser smoke, mirroring, and telemetry.

CJ issues addressed:
- Reworked the CPU/game-loss overlay away from `CPU WINS` plus roll-count telemetry. Player loss now reads as `YOU GOT TRASHED!` with a retail-style `Avoid the bin next time!` subline.
- Removed roll-count/debug stats from the primary game-over screen.
- CPU wins now use the same family-friendly can/lid/dice eruption system instead of skipping the big celebration path.
- Added a QA-only `?qa&gamewin=p1/p2` route for future direct result-screen review without browser-console work.
- Restored the browser to the real P-0 review path and added `?p-0` as an alias for `?p0`.

Verification:
- Inline script syntax check passed for `index.html` and mirrored `trash-dice.html`.
- In-app browser preview ran at `http://127.0.0.1:5174/index.html?p0`.
- Observed P-0 active badge, unattended CPU/player turns, trash can fill, and no page console errors.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.

---

## 2026-05-02 RETAIL LID GEOMETRY PASS

Event ID: `trash-dice-retail-lid-geometry-pass-20260502`

Approximate active elapsed: ~20 minutes for reference read, SVG geometry rebuild, syntax check, browser smoke, file mirroring, and telemetry.

CJ issue addressed:
- Rebuilt the active can-lid board renderer away from the previous six-slice wheel model. The lid now uses six molded die pockets arranged around a central vertical chute, including upright top/bottom pockets, angled side pockets, ring notches, molded rim circles, and no old `R1`/center-hub treatment.
- Preserved the real rules and roll mapping. Value 1 still targets slot 1, value 2 targets slot 2, and so on; this pass changed lid geometry and travel coordinates only.

Verification:
- Inline script syntax check passed for `index.html`.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 smoke ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Verified `Green Dice`, `Yellow Dice`, and `Yellow/Green Turn` copy appears in the live DOM, while old `CPU` / `You` HUD copy is absent.

---

## 2026-05-02 BOARD AND CAN SPACING PASS

Event ID: `trash-dice-board-can-spacing-pass-20260502`

Approximate active elapsed: ~15 minutes for layout inspection, CSS spacing/shadow pass, mirroring, and browser smoke.

CJ direction addressed:
- Kept the lid anchored and moved the trash can farther right and slightly lower so the two read as separate tabletop objects.
- Reduced the can about 5-8% at larger sizes so spacing is preserved instead of letting the can press into the lid.
- Softened the shared tabletop wash and added separate contact shadows under the lid and can.

Verification:
- Inline script syntax check passed for `index.html` and `trash-dice.html`.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 smoke ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.

---

## 2026-05-02 PLACEMENT FANFARE BOOST PASS

Event ID: `trash-dice-placement-fanfare-boost-pass-20260502`

Approximate active elapsed: ~20 minutes for placement-effect inspection, animation/audio tuning, mirroring, and browser smoke.

CJ direction addressed:
- Raised positive lid-placement fanfare rather than reducing trash fanfare.
- Increased slot impact brightness and duration when a die successfully places.
- Increased lid recoil/compression, player-color ring scale, and pressure-wave duration for successful placements.
- Boosted the Web Audio placement package with a louder clink, tabletop thump, brighter upper harmonics, and a longer color-coded flourish.

Verification:
- Inline script syntax check passed for `index.html` and `trash-dice.html`.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 smoke ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.

---

## 2026-05-02 ONLINE BACKUP PASS

Event ID: `trash-dice-online-backup-pass-20260502`

Approximate active elapsed: ~15 minutes for repo status review, ignored-file review, backup commit, push, and remote verification.

CJ direction addressed:
- Backed up the current Game 2 Trash Dice 1st Playable work to the configured GitHub remote.
- Included the playable files `index.html` and `trash-dice.html`.
- Also included `RESEARCH.md` and `TELEMETRY.md` because they are project memory and were otherwise ignored/local-only.

Verification:
- Remote target: `https://github.com/cjconnoy/trash-dice.git`.
- Push and remote-head verification performed after commit.

---

## 2026-05-02 RETAIL CAN GEOMETRY PASS

Event ID: `trash-dice-retail-can-geometry-pass-20260502`

Approximate active elapsed: ~25 minutes for reference comparison, SVG can rebuild, proportion tuning, mirroring, and browser smoke.

CJ direction addressed:
- Rebuilt the trash can SVG away from the short cartoony cup read.
- Added a straighter retail-style cylindrical body with a taller/slimmer proportion.
- Added a thick molded top collar, dark recessed mouth, inset lid plane, raised handle, upper and lower horizontal molded bands, and subtler grey plastic shading.
- Retained the gameplay can-fill overlay while repositioning it to fit the revised top geometry.

Verification:
- Inline script syntax check passed for `index.html` and `trash-dice.html`.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 preview ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.

---

## 2026-05-02 RETAIL LID AND PIP SCALE PASS

Event ID: `trash-dice-retail-lid-pip-scale-pass-20260502`

Approximate active elapsed: ~25 minutes for reference comparison, lid SVG refactor, dice-pip scale tuning, mirroring, and browser smoke.

CJ direction addressed:
- Moved the lid geometry further away from a radial wheel and closer to the retail molded tray.
- Added a stronger outer lip, recessed inner bowl, central vertical chute, molded side panels, and repositioned six die pockets around the tray.
- Enlarged/thickened active-die, placed-die, inventory, can-fill, and payout dice pips to better match the chunky retail dice dots.

Verification:
- Inline script syntax check passed for `index.html` and `trash-dice.html`.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 preview ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Observed placed dice and can-fill dice after autoplay; larger pips remained readable.
- Mirrored `index.html` to `trash-dice.html`; SHA256 hashes matched after the pass.
- In-app browser P-0 smoke ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Verified `Green Dice`, `Yellow Dice`, and `Yellow/Green Turn` copy appears in the live DOM, while old `CPU` / `You` HUD copy is absent.
- In-app browser P-0 preview ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- Observed the empty-board opening state with the revised six-pocket molded lid geometry.
- Mirrored `index.html` to `trash-dice.html` after the geometry pass.

---

## 2026-05-02 FIRST PLAYABLE JACKPOT + RETAIL UI PASS

Event ID: `trash-dice-first-playable-jackpot-retail-ui-pass-20260502`

Approximate active elapsed: ~55 minutes for game-win rework, victory QA, live P-0 inspection, retail callout cleanup, color-label polish, file mirroring, and backup prep.

CJ direction addressed:
- Adopted the operating mode that clear 1st Playable recommendations should be executed directly until CJ approval, rather than held for approval.
- Rebuilt the game-win presentation from a modal-style result into a visible dice-cannon jackpot: cloned spinning lid backdrop, visible can hero, full-screen persistent dice burst, bottom dice floor, and `ROLL AGAIN` affordance.
- Changed game result framing to color competition: `YELLOW DICE WIN!` / `GREEN DICE WIN!`, with the retail-facing line `ROLL, WIN, AVOID THE BIN!`.
- Fixed the victory dice sizing bug where jackpot dice inherited tiny inventory-die dimensions and read as sparse specks.
- Added a soft result readability glow so the dice explosion can stay huge without burying the win copy.
- Changed bottom gameplay messages from sentence/debug copy to short retail-style callouts like `ROLLED 4`, `LID 4!`, `TRASH 4!`, and `YELLOW WINS THE ROUND!`.
- Upgraded `Green Dice` / `Yellow Dice` labels and the turn pill with chunkier toy-label styling and pip details.

Verification:
- Inline script syntax check passed for `index.html`.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.
- In-app browser QA route `http://127.0.0.1:5174/index.html?qa&gamewin=p1` showed `YELLOW DICE WIN!`, `ROLL AGAIN`, the spinning lid backdrop, visible can hero, and no page console errors.
- In-app browser QA route `http://127.0.0.1:5174/index.html?qa&gamewin=p2` showed `GREEN DICE WIN!`, `ROLL AGAIN`, the same jackpot treatment, and no page console errors.
- In-app browser P-0 route `http://127.0.0.1:5174/index.html?p0` ran with no page console errors; observed the new compact gameplay callout and updated color labels.

---

## 2026-05-02 GAME WIN SCREEN REPAIR PASS

Event ID: `trash-dice-game-win-screen-repair-pass-20260502`

Approximate active elapsed: ~30 minutes for root-cause inspection, overlay layering fixes, QA-route browser verification, Play Again regression check, file mirroring, and telemetry.

CJ issues addressed:
- Fixed the hidden spinning-lid problem. The previous board spin happened behind the opaque game-over overlay; the result screen now creates a visible cloned lid inside the overlay as the spinning celebration backdrop.
- Fixed result-screen layering so `YOU WIN!`, the subline, and `PLAY AGAIN` remain foreground UI above the spectacle.
- Reworked the dice-cannon effect so it creates both a cannon burst and a persistent settled dice field that remains behind the result UI until a new game starts.
- Removed the invented `Final can claimed!` line. Player-win subcopy now uses the retail/product-language phrase `Roll. Collect. Avoid the trash.` Loss subcopy uses `ROLL, WIN, AVOID THE BIN!`.
- Hardened `init()` so QA-forced game-win and Play Again cannot leak the start overlay back into a live game reset.

Verification:
- Inline script syntax check passed for `index.html`.
- In-app browser QA route ran at `http://127.0.0.1:5174/index.html?qa&gamewin=p1` with no page console errors.
- Verified `PLAY AGAIN` is visible and clickable.
- Verified old copy `Final can claimed!` is absent and the retail/product-language subline is visible.
- Verified Play Again returns to a fresh playable board state with no page console errors.
- Mirrored `index.html` to `trash-dice.html` after the repair pass.

---

## 2026-05-02 PHYSICALITY ANIMATION PASS

Event ID: `trash-dice-physicality-animation-pass-20260502`

Approximate active elapsed: ~35 minutes for motion inspection, implementation, P-0 smoke, QA round-win smoke, mirroring, and telemetry.

CJ direction addressed:
- Shifted the next animation pass away from additive sparkle effects and toward object physicality.
- Reworked rolled-die travel to use arced physical paths to the lid or trash can instead of straight top/left sliding.
- Changed die-roll resolve into a squash/rebound settle so the final result has weight while preserving the hold on the final face.
- Changed lid placement feedback from a starburst-style effect to a pressure ring, lid compression/recoil, slot weight flash, and small board-scene nudge keyed by player color.
- Changed trash-can impact from pure giant scale into a heavier squash, lunge, slam, wobble, and scene shake while preserving the hungry-can read.
- Reworked round-win payout dice into gravity-style arcing dice from can to winner pile instead of UI-slide movement.
- Added QA route `?qa&roundwin=p1/p2` so payout physicality can be reviewed directly without waiting for a naturally completed round.

Verification:
- Inline script syntax check passed for `index.html`.
- In-app browser P-0 smoke ran at `http://127.0.0.1:5174/index.html?p0` with no page console errors.
- In-app browser round-win QA ran at `http://127.0.0.1:5174/index.html?qa&roundwin=p1` with no page console errors.
- Observed payout dice present mid-spill, removed by the end of the spill, and a clean return to the next round.
- Mirrored `index.html` to `trash-dice.html` after the pass.

---

## 2026-05-02 COLOR-FIRST PLAYER HUD PASS

Event ID: `trash-dice-color-first-player-hud-pass-20260502`

Approximate active elapsed: ~15 minutes for UI language change, runtime copy cleanup, syntax verification, mirroring, and browser smoke.

CJ direction addressed:
- Replaced the top-panel `CPU` identity with `Green Dice`.
- Replaced the bottom-panel `You` identity with `Yellow Dice`.
- Changed the status pill to `Yellow Turn` / `Green Turn` so the turn language is color-first.
- Removed the redundant inline `TURN` tag from the player strips to reduce HUD/debug feel and avoid text overflow.
- Updated normal gameplay messages, opening-roll copy, round-win copy, and game-win headline language to use Yellow/Green instead of You/CPU.

Verification:
- Inline script syntax check passed for `index.html`.

---

## 2026-05-04 1ST PLAYABLE MOBILE REVIEW HARDENING PASS

Event ID: `trash-dice-first-playable-mobile-review-hardening-20260504`

Approximate active elapsed: ~45 minutes for self-directed issue scan, desktop preview verification, headless iPhone-size LAN capture, implementation, mirroring, commit, and push.

CJ direction addressed:
- Responded to CJ's direction to aggressively address open issues without creating technical work for CJ.
- Removed a mobile-review workflow trap: LAN preview URLs now default to the low-power `fast-preview` path unless `fullfx` is explicitly requested.
- Tuned the trash-can hero glint so it reads as surface shine behind the printed label instead of washing over the can wordmark.
- Preserved the current simplified panel direction: no Green/Yellow player label blocks, narrower panels, and larger/more readable pool dice.
- Updated the Game 2 handoff package with the current Trash Dice state, current pushed HEAD, mobile review link, Slack channel ID, and performance guardrails.

Verification:
- Inline script syntax check passed for `index.html`.
- `git diff --check` passed with only the repo's expected CRLF warning.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.
- In-app browser desktop preview at `http://127.0.0.1:5174/index.html` showed the simplified panels and no page console errors.
- Headless Chrome iPhone-size LAN capture at `http://192.168.86.48:5175/index.html` reported `fast-preview player-roll-ready`, no scroll overflow, no P0 review control on mobile, and visible gameplay copy.

---

## 2026-05-04 RESPONSIVE ONE-VERSION GAME SCREEN PASS

Event ID: `trash-dice-responsive-one-version-game-screen-pass-20260504`

Approximate active elapsed: ~35 minutes for responsive layout implementation, file mirroring, static checks, in-app desktop verification, and headless mobile viewport verification.

CJ direction addressed:
- Confirmed the product should use one responsive/adaptive game screen rather than separate desktop and mobile versions, reducing QA drift and keeping one shared rules/UI code path.
- Added mobile breakpoints that compact the live game screen vertically while keeping the title, player panels, board, trash can, status message, and footer badges visible.
- Preserved the simplified player panels with no Green/Yellow label blocks, letting pool dice occupy more width and read larger on mobile.
- Tuned compact short-phone layout so the tagline hides, the title shrinks, panels tighten, and the board/can area remains playable without horizontal or vertical page overflow.

Verification:
- Inline script syntax check passed for `index.html`.
- `git diff --check` passed with only the repo's expected CRLF warning.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.
- In-app browser desktop preview at `http://127.0.0.1:5174/index.html` showed the simplified responsive game screen with no page console errors.
- Headless Chrome mobile captures at 390x844, 390x700, and 360x640 reported equal viewport/scroll dimensions, no checked hero elements outside the viewport, and `fast-preview player-roll-ready`.

---

## 2026-05-04 RIGHT-THUMB ROLL PANEL PASS

Event ID: `trash-dice-right-thumb-roll-panel-pass-20260504`

Approximate active elapsed: ~20 minutes for layout decision, CSS implementation, file mirroring, desktop preview verification, and headless mobile viewport verification.

CJ direction addressed:
- Moved the hero die/ROLL action bay to the right side of the player panel so it sits under a natural right-thumb tap zone on mobile.
- Mirrored the same composition on the green panel, placing the green die bay on the right and the count on the left for visual consistency.
- Moved both pool-count badges to the left side of the inventory lane while keeping the dice pools in the larger center lane.
- Shifted the bottom-panel `YOUR TURN` status over the dice lane after the count moved left.

Verification:
- Inline script syntax check passed for `index.html`.
- `git diff --check` passed with only the repo's expected CRLF warning.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.
- In-app browser desktop preview at `http://127.0.0.1:5174/index.html` showed the right-side ROLL layout with no page console errors.
- Headless Chrome mobile captures at 390x844, 390x700, and 360x640 reported equal viewport/scroll dimensions and no checked hero elements outside the viewport.

---

## 2026-05-04 MOBILE HERO GLINT RESTORE PASS

Event ID: `trash-dice-mobile-hero-glint-restore-pass-20260504`

Approximate active elapsed: ~15 minutes for fast-preview CSS inspection, targeted restore, file mirroring, desktop browser verification, and mobile animation sampling.

CJ direction addressed:
- Restored visible moving hero glints for the gameplay title, lid, trash-can body, and trash-can rim in mobile/LAN `fast-preview`.
- Kept the broader low-power preview behavior intact by leaving the can's overall SVG turntable animation disabled and not enabling full victory FX.
- Replaced the previous blanket fast-preview glint suppression with a narrow low-power allowance for these specific hero assets.

Verification:
- Inline script syntax check passed for `index.html`.
- `git diff --check` passed with only the repo's expected CRLF warning.
- `index.html` and `trash-dice.html` SHA256 hashes matched after mirroring.
- In-app browser desktop preview at `http://127.0.0.1:5174/index.html` showed no page console errors.
- Headless Chrome iPhone-size fast-preview sampling reported `fast-preview player-roll-ready`, moving title gradient values, visible can body/rim glint opacity peaks, and visible lid edge/inner glint opacity peaks.
