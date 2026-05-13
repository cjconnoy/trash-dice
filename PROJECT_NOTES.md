# Trash Dice Project Notes

## Standing Handoff And Development Rule

ALPHA COMPLETE is frozen forever at approved build `dc5a995`.

Do not edit, overwrite, rebalance, patch, rename, repurpose, or replace the Alpha Complete build files. Future development must happen under a new build name, new release folder, and new share URL.

The exact already-shared Alpha Complete evaluator link must remain reserved for the frozen Alpha Complete build:

- Desktop full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995
- Mobile full: https://tel-sight-rice-extent.trycloudflare.com/index.html?v=dc5a995

Future handoffs must explicitly include this rule and point to:

- `PROJECT_NOTES.md`
- `ALPHA_COMPLETE_LINKS.md`
- `releases/alpha-complete/README.md`

For Trash Dice Beta and all later work, never reuse the Alpha Complete link. Create a new named release path or public URL for every new build.

## Trash Dice Beta v1 Direction

Beta v1 should focus on a very simple nearby two-player online mode plus PWA polish. Nearby online QR/code two-player is the primary Beta multiplayer target, not pass-and-play.

The guiding multiplayer target is: someone says "scan this," and both players are playing in under 10 seconds.

Beta v1 multiplayer should be strictly two players on two separate phones, no spectators, no accounts, no lobby browser, no chat, and no server-generated dice rolls. The flow should be:

- Player 1 taps `2 PLAYER`, then `Create Game`.
- Player 1 sees a large QR code, a short room code, and a share link.
- Player 2 taps `2 PLAYER`, then `Join Game`, and scans the QR code or enters the short code.
- Once both seats are filled, play starts quickly.

The server should sync the shared room state and reject impossible moves/desyncs. For Beta v1, the active player's device may generate the roll result because this mode is designed for nearby social-trust play, not ranked or stranger matchmaking.

Do not pivot Beta v1 toward local same-device pass-and-play unless CJ explicitly changes direction. The intended table flow is each player using their own phone.

The app direction for Beta v1 is PWA first: install-to-home-screen polish, app icon, standalone display, and mobile-friendly launch behavior. Players must not need to install the app to play; the share link should work immediately in a browser, with installation as an optional convenience.
