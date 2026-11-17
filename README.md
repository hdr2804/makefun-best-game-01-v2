# LANTERNFALL — The Last Beacon

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/hdr2804/makefun-best-game-01-v2/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/hdr2804/makefun-best-game-01-v2/reward.svg)](https://make.fun/c/best-game-01)

A squad first-person shooter for [make.fun's best-game-01](https://make.fun/c/best-game-01) bounty. Night has swallowed the floating sky-islands. You are the keeper of the last beacon, with Bram and Sef at your side. Relight the three snuffed lanterns, hold the tower while the beacon charges, slay the Gloom Herald, and reach the extraction pad before the light fades.

## The game

Three objectives in one run:

1. **Relight** — find the three snuffed lanterns on the satellite islands and hold `F` to relight them while shadow creatures close in.
2. **Defend** — hold the beacon tower while it charges to 100%. Between objectives, pick one of three field upgrades.
3. **Slay and extract** — defeat the Gloom Herald (two phases: wisp summons, then radial shadow waves) and run for the glowing extraction pad.

Lose if the beacon is destroyed or the whole squad falls.

## Systems

- **Squad command** — two AI lantern-keepers fight beside you. `Q` cycles FOLLOW / HOLD / ADVANCE; `X` orders focus fire on your target. Downed keepers are revived by standing near them (hold `F`); a downed keeper will come and revive you.
- **Locational damage** — glowing weak points crit (2.5×), head-height hits deal more (1.8×), armoured shadow plates resist (0.6×). Hit markers and floating damage numbers show what landed.
- **Grenades** — arcing throws with a fuse and distance falloff, with a dotted arc preview. Resupply at lit lanterns.
- **Light mechanic** — fighting inside lantern light grants +damage, +accuracy and slow healing; standing in darkness slowly drains you. Creatures snuff lanterns — relight them.
- **Enemies** — swarming wisps, lunging hounds, ranged spitters, tanky brutes, and the Gloom Herald boss.
- **Feel** — procedural WebAudio sound effects and a music bed that intensifies in combat, particles, screen shake, hit markers, a compass to the objective, and a full HUD.

## Controls

| Key | Action |
| --- | --- |
| WASD / mouse | Move / aim (click to lock the pointer) |
| Click | Shoot |
| R | Reload |
| G | Grenade (hold to preview the arc) |
| F | Relight lantern / revive keeper (hold) |
| Q | Squad order (follow / hold / advance) |
| X | Focus fire |
| Shift / Space | Sprint / jump |
| Esc | Pause · M mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Everything runs offline from static files under `game/` (three.js is vendored under `game/vendor/`). No network request at run time.

## Build

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output folder and writes `dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are deterministic renders of the game's own code: `?shot=title|play|boss|victory&seed=1` (see `shots.json`).

## License

MIT — see `LICENSE`.
