# Trash Dice Research Notes

Research pass date: 2026-05-01
Scope: private ODG research/prototype study only

## Source Priority

For rules fidelity, use the official Big Discoveries rule sheet first, then the official product page, then secondary play summaries/reviews.

Primary sources:

- Official product page: https://bigdiscoveries.com/pages/trash-dice
- Official rule sheet PDF: https://cdn.shopify.com/s/files/1/0611/8581/8804/files/Trash_Dice_Rule_Sheet.pdf?v=1760473415
- Official how-to/instructions hub: https://bigdiscoveries.com/pages/how-to-play

Useful secondary/context sources:

- People of Play product profile: https://www.peopleofplay.com/product/trash-dice/1
- Family Game Shelf rules summary under the generic name "Garbage Dice": https://familygameshelf.com/2025/02/11/how-to-play-the-garbage-dice-game/
- PlayMonster/Big Discoveries retail distribution announcement: https://www.playmonster.com/author/sarahperson/
- Spielregeln TV German review/context page: https://www.spielregeln.tv/tag/big-discovery/

## Product Facts

Trash Dice is a two-player, fast-playing dice game from Big Discoveries. The official product page frames it as a 2-player, ages 6+, 10-20 minute game and says it includes a trash can, a lid that functions as the dice tray/gameboard, 40 dice, and a rulebook.

The People of Play profile lists Alex Mackey as a creator and gives a launch date of February 14, 2024. The official rule sheet artwork credits Mike Szalajko and Alex Mackey. Secondary German coverage also lists Alex Mackey and Mike Szalajko as authors and Alex Mackey for graphics.

PlayMonster announced a 2026 distribution partnership with Big Discoveries for Trash Dice and Dumpster Dice, describing the games as social-media-fueled, easy-to-learn dice games with strong TikTok/Amazon momentum. For this private research project, that mainly confirms that the physical game has current market heat and a recognizable product identity.

## Official Rule Truth

Objective: be the last player who still has any dice.

Setup: each player starts with 20 dice of one color. In the physical set those colors are yellow and green. Players roll one die each to determine who starts; high roll starts.

Turn loop: on a turn, a player rolls one die. If the corresponding number space on the trash-can lid is open, the die is placed into that numbered space. The shared lid is trying to fill a single 1-6 set.

Duplicate rule: if the rolled number is already filled on the lid, that die is trashed and removed from play.

Set completion: when a player places the final missing die and completes the 1-6 set, that player wins all six dice from the lid and adds them to their remaining dice. A new set then begins.

Dice color after set win: once a player wins a set, they may use dice of any color from the set(s) they have won. In a digital prototype, color should therefore be treated as physical provenance, not permanent player ownership.

Game end: the game ends when only one player has dice remaining.

## Visual Reference Index

Do not copy these images into the repo as game assets unless CJ explicitly wants local reference captures for private-only study. Use them as visual direction references.

- Product hero, can and dice: https://bigdiscoveries.com/cdn/shop/files/A7R05376.png?v=1741119055&width=416
- Overhead lid and dice layout: https://bigdiscoveries.com/cdn/shop/files/71-H17iEHpL._AC_SL1500.jpg?v=1764802648&width=416
- Lifestyle gameplay, adult/child: https://bigdiscoveries.com/cdn/shop/files/9_d8b5033e-d75f-4daa-9435-a7fd3e4d76a6.png?v=1764802648&width=416
- Lifestyle gameplay, two adults: https://bigdiscoveries.com/cdn/shop/files/preview_images/4.png?v=1728494096&width=416
- Marketing card, can and dice pyramid: https://bigdiscoveries.com/cdn/shop/files/13_693b4d3e-e62d-41ed-a2a2-91a29ac1c540.png?v=1764802648&width=1445
- Marketing card, 40 dice/components: https://bigdiscoveries.com/cdn/shop/files/14_95ae825a-c977-46e6-ad71-1b23abc841a3.png?v=1764802648&width=1445
- Official rule sheet: https://cdn.shopify.com/s/files/1/0611/8581/8804/files/Trash_Dice_Rule_Sheet.pdf?v=1760473415

## Visual Design Read

The physical product identity is loud, toy-like, and compact. The strongest signals are:

- Yellow and deep green dice, with opposite-color pips.
- A grey cylindrical trash can as storage, with a removable grey lid that becomes the gameboard.
- A circular lid with six recessed, numbered spaces around the surface.
- Graffiti/splatter logo treatment with yellow, green, orange, and dark green outlines.
- The product promise is short and rhythmic: roll, win/collect, avoid the bin/trash.
- The tabletop play area is very simple: each player keeps a pile of dice, the lid sits between them, and trashed dice go into the can.

The current prototype already captures the green/yellow dice palette, graffiti title energy, circular lid board, and trash collision moment. It should become more physically faithful by making the trash can itself feel like the center object rather than only a circular board on a mat.

## Current Prototype Fidelity Audit

Already close:

- Two-player player-vs-CPU structure.
- Each side starts with 20 dice.
- Shared 1-6 circular lid spaces.
- One die rolled per turn.
- Duplicate number means the rolled die is trashed/out.
- Game ends when a player runs out of dice.
- Yellow/green dice visual language and loud arcade presentation.

Needs correction for faithfulness:

- Starting player should be determined by an opening roll-off, not always the human player.
- The set payout is currently wrong. When the lid is completed, the final placer should collect all six dice from the lid. The prototype currently adds dice back to their original owners, which weakens the core tug-of-war economy.
- Dice color should become inventory, not fixed ownership. If the human wins a set containing green dice, those green dice belong to the human inventory afterward, and vice versa.
- Messages should describe communal lid spaces, not "your slot" or "CPU's slot." A duplicate is about the number already being filled.
- The trash can/bin should be more legible as a physical destination for trashed dice. The current SVG lid works, but the can itself is mostly implied.
- Secondary rules summaries suggest the next player may start after a completed set, but the official sheet is ambiguous. This is a product-feel choice to test: winner starts for momentum, opponent starts for comeback pressure.

## Strongest Next Implementation Move

Make the dice economy faithful before adding more juice:

1. Track each player's inventory as counts by die color, not just a single number.
2. On each turn, choose/consume one die from the current player's inventory.
3. Store placed lid dice as objects with owner and color.
4. On duplicate, remove the rolled die from the game and animate it into the can.
5. On set completion, transfer all six lid dice into the winner's inventory, preserving color.
6. Update piles so each player can visibly own mixed yellow/green dice after winning sets.
7. Add opening roll-off and a clear rule for who starts the next set.

This is the highest-leverage fidelity pass because it fixes the game's actual tension: every completed set is a six-die swing, not just a reset.

## Private Research Boundary

CJ clarified on 2026-05-01 that this is not for public release and is a research project only. For that private lane, faithful recreation is acceptable as the working goal. If CJ later wants a public ODG game inspired by this, the public version should be re-skinned and renamed or handled with explicit rights/permission.
