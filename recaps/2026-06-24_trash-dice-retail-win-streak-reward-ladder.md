# Trash Dice Retail Win-Streak Reward Ladder Recap

## DECISIONS

- Implemented the win-streak reward ladder in `ship-html5/` as cosmetic-only HTML/browser behavior for desktop, iPhone, and iPad.
- Added one source-of-truth `REWARD_DICE` config array with eight character tiers: RUST, TOXIC SPAT, BUBBLEGUM, VOLT ZAP, TIE-DYE, CHROME, DIAMOND, PRISM.
- Counted only player/yellow game wins toward the persistent reward total; green/CPU wins preserve the ladder state without awarding progress.
- Stored the cumulative player win count in localStorage under `trashDiceRewardWinsV1`.
- Displayed a fixed-pip, solo reward die unlock overlay only when a newly reached tier changes the active reward die.
- Kept PRISM as the permanent cap: once the current-win count reaches tier 8, `nextDie` is null and `capped` is true.
- Added a first-game-only assist that is active until the browser records one completed game, then turns off persistently.
- Added a reward-die review button for QA/review modes so desktop and mobile reviewers can cycle through die variants in game.

## CUTS

- No functional dice changes, rerolls, weighted dice, alternate dice shapes, or balance effects.
- No public-evergreen/unprotected route flip; after CJ redirected, the protected `/trash-dice/play/` review route was mirrored and deployed.
- No native iOS/App Store scope; this remains the Retail Phase 1 HTML/browser candidate lane.
- No poster/art iteration in this pass.
- No public-facing tutorial panel or explicit "easy mode" copy; the first-game assist is invisible and roll-shaping only.

## PATTERNS

- Reward visuals use CSS transform/filter animations only; no per-frame JavaScript repaint loop.
- Patterned dice use bold low-count marks: one bolt, a few toxic drips, large tie-dye blooms, and broad diamond facets.
- TIE-DYE, DIAMOND, and PRISM carry outlined white pips to preserve contrast against busy or shifting backgrounds.
- Reward pips are deterministic markup rendered as a fixed five-pip die for legibility, avoiding malformed/random pip art.
- Tier rendering is driven by config colors/effects, with `holographic` handled as the PRISM rendering sentinel.
- QA seeds reward wins to 2, forces one player win, and verifies the TOXIC SPAT tier unlock at 3 wins.
- QA separately forces 100 wins to verify PRISM is the capped permanent tier.
- QA verifies the first-game assist is active before any completed game and inactive after one completed game.
- QA verifies the reward-die review button appears in active QA/review gameplay and does not change reward unlock progress.

## VERIFICATION

- `powershell -NoProfile -ExecutionPolicy Bypass -File sync-ship-html5.ps1 -Json`
  - Result: `SHIP_HTML5_SYNC_OK`
  - Hash: `F90ECA60DF10B7092CF6DC14A1CE88FB63AB419C9C26583815A19071C416D5B8`
- `node qa-ship-html5.js`
  - Result: `SHIP_HTML5_QA_OK`
  - Local QA URL: `http://127.0.0.1:5789/`
- `powershell -NoProfile -ExecutionPolicy Bypass -File test-trash-dice-retail-live-readiness.ps1 -Mode PreLaunch -SkipLive -Json`
  - Result: `yellow`; source QA, mirror hash, route state, and launch-marker checks green; yellow only because source and mirror were intentionally dirty before deploy.
- `powershell -NoProfile -ExecutionPolicy Bypass -File test-route-contracts.ps1 -Json`
  - Result: `green`; `/trash-dice/play/` remained protected-review, unauthenticated 401, authenticated 200, hash match; Alpha Complete stayed protected and hash-matched.
- Live protected route smoke:
  - URL: `https://playonedaygames.com/trash-dice/play/?reward-review=1`
  - Result: authenticated HTTP 200, reward review button marker present, first-game assist marker present.
- Studio-site deploy commit:
  - `2297030587eb86c5a71e95aee62567867e9f2ff1`

## KNOWN RISKS

- Reward total is local to browser storage; clearing site data resets cosmetic progress.
- The unlock presentation is intentionally brief to protect tablet sustained-animation budgets.
- `test-trash-dice-retail-live-readiness.ps1 -Mode PreLaunch` currently reports red because the broad `test-play-surface.ps1` guard flags one existing WUYB preview README sentence that says it is not a Trash Dice route. The route-specific guard is green.
- Studio Ops still owns public-evergreen route promotion, byte mirror monitoring, and live incident handling.
