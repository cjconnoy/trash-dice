# Trash Dice Project Notes

## Standing Handoff And Development Rule

ALPHA COMPLETE is frozen forever at approved build `dc5a995`.

Do not edit, overwrite, rebalance, patch, rename, repurpose, or replace the Alpha Complete build files. Future development must happen under a new build name, new release folder, and new share URL.

The current working Alpha Complete evaluator link is:

- Desktop full: https://playonedaygames.com/private/trash-dice-alpha-complete-dc5a995/
- Mobile full: https://playonedaygames.com/private/trash-dice-alpha-complete-dc5a995/

The old already-shared quick-tunnel link is retired after its local `trycloudflare.com` tunnel died on 2026-05-14:

- Desktop full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995
- Mobile full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995

Do not try to reuse or revive that quick-tunnel hostname as the source of truth. The custom-domain copy is byte-locked to the frozen Alpha Complete build and must not be reused for Beta.

Future handoffs must explicitly include this rule and point to:

- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `releases/alpha-complete/README.md`

For Trash Dice Beta and all later work, never reuse the Alpha Complete link. Create a new named release path or public URL for every new build.

## Trash Dice Beta v1 Direction

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
