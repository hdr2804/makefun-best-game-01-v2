// LANTERNFALL — wiring and the fixed-step game loop. The game state object G
// is built first, then every subsystem is attached to it; subsystems only talk
// to each other through G, so there are no import cycles between them.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildWorld } from './world.js';
import { createLanterns } from './lanterns.js';
import { createParticles } from './particles.js';
import { createWeapons } from './weapons.js';
import { createGrenades } from './grenades.js';
import { createPlayer } from './player.js';
import { createSquad } from './squad.js';
import { createEnemies } from './enemies.js';
import { createBoss } from './boss.js';
import { createObjectives } from './objectives.js';
import { createHud } from './hud.js';
import { createMenus } from './menus.js';
import { createShots } from './shots.js';

const STEP = 1 / 60;

export function createGame(canvas, params) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 1.7, 14);

  const G = {
    canvas, renderer, scene, camera,
    time: 0,
    mode: 'title',
    shot: params.shot || null,
    seed: params.seed || 20261117,
    settings: { sens: 1 },
    upgrades: {},
    difficulty: { enemyHp: 1.0, enemyDmg: 1.0 },
    difficultyKey: 'flare',
    forceArc: false,
    shotFrames: 0,
  };
  G.rng = makeRng(G.seed);
  G.input = createInput(G);
  G.audio = createAudio(G);
  G.world = buildWorld(G);
  G.lanterns = createLanterns(G);
  G.particles = createParticles(G);
  G.weapons = createWeapons(G);
  G.grenades = createGrenades(G);
  G.player = createPlayer(G);
  G.squad = createSquad(G);
  G.enemies = createEnemies(G);
  G.boss = createBoss(G);
  G.objectives = createObjectives(G);
  G.hud = createHud(G);
  G.menus = createMenus(G);
  G.shots = createShots(G);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  canvas.addEventListener('click', () => {
    if (G.mode === 'playing' && !G.shot) G.input.lockPointer();
  });
  // Clicking the canvas also resumes audio (the first user gesture).
  canvas.addEventListener('pointerdown', () => G.audio.resume());

  G.menus.bind();
  if (G.shot) {
    G.shots.setupShot(G.shot);
  } else {
    G.menus.showTitle();
  }

  function step(dt) {
    G.time += dt;
    G.world.update(dt, G.time);
    G.lanterns.update(dt, G.time);
    G.particles.update(dt);
    if (G.mode === 'playing') {
      G.player.update(dt);
      G.squad.update(dt);
      G.enemies.update(dt);
      G.boss.update(dt);
      G.grenades.update(dt);
      G.objectives.update(dt);
      G.hud.update(dt);
      if (G.input.consume('pause') && !G.shot) G.menus.showPause();
      if (G.input.consume('order')) G.squad.cycleOrder();
      if (G.input.consume('focus')) G.squad.focusFire();
      if (G.input.consume('mute')) G.audio.setMuted(!G.audio.muted);
    } else if (G.mode === 'title' && G.shot === 'title') {
      // Ambient life behind the title menu.
      G.enemies.update(dt);
      G.squad.update(dt);
    }
    G.input.clearFrame();
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (G.shot) dt = STEP; // deterministic shots run on fixed steps
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; }
    renderer.render(scene, camera);
    if (G.shot) {
      G.shotFrames += 1;
      if (G.shotFrames >= 40 && !window.__shotReady) window.__shotReady = true;
    }
  }
  requestAnimationFrame(frame);

  return G;
}
