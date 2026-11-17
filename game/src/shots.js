// Deterministic shot scenes: ?shot=title|play|boss|victory&seed=N. Each scene
// sets the run into a fixed state with the seeded RNG, then the main loop runs
// exactly 90 fixed steps before setting window.__shotReady. No wall clock,
// no input, no audio — the same seed always renders the same frame.
import * as THREE from 'three';

export function createShots(G) {
  function aimCamera(pos, lookAt, yaw, pitch) {
    G.player.pos.copy(pos);
    if (yaw !== undefined) G.player.yaw = yaw;
    if (pitch !== undefined) G.player.pitch = pitch;
    const eye = G.player.eyePos();
    G.camera.position.copy(eye);
    if (lookAt) {
      G.camera.lookAt(lookAt);
      // Keep the player's yaw/pitch in sync with the camera for the HUD compass.
      const d = lookAt.clone().sub(eye).normalize();
      G.player.yaw = Math.atan2(-d.x, -d.z);
      G.player.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    } else {
      G.camera.rotation.set(G.player.pitch, G.player.yaw, 0, 'YXZ');
    }
  }

  // Park the two keepers flanking the player and hold them there, so they
  // read as a squad in frame without blocking the view.
  function stageMates(x0, z0, x1, z1) {
    G.squad.order = 'HOLD';
    const m0 = G.squad.list[0]; const m1 = G.squad.list[1];
    m0.pos.set(x0, 0, z0); m0.holdPos = m0.pos.clone();
    m1.pos.set(x1, 0, z1); m1.holdPos = m1.pos.clone();
  }

  function setupShot(name) {
    G.difficulty = { enemyHp: 1.0, enemyDmg: 1.0 };
    G.difficultyKey = 'flare';
    if (name === 'title') {
      G.mode = 'title';
      G.enemies.setSnuffCooldown(3600);
      G.objectives.debugSet({ phase: 'title' });
      for (const lan of G.lanterns.list) G.lanterns.setLit(lan, true);
      // Ambient creatures on the satellite islands, far from the player.
      const sats = G.world.satellites;
      G.enemies.spawn('wisp', new THREE.Vector3(sats[0].x + 2, 0, sats[0].z));
      G.enemies.spawn('hound', new THREE.Vector3(sats[1].x - 2, 0, sats[1].z + 1));
      G.enemies.spawn('spitter', new THREE.Vector3(sats[2].x, 0, sats[2].z - 2));
      G.enemies.spawn('wisp', new THREE.Vector3(sats[2].x + 3, 0, sats[2].z + 2));
      G.enemies.spawn('brute', new THREE.Vector3(-14, 0, -12));
      G.squad.reset();
      G.player.pos.set(0, 0, 14);
      G.player.yaw = 0; G.player.pitch = 0.02;
      aimCamera(new THREE.Vector3(10, 5.5, 24), new THREE.Vector3(0, 8, 0));
      G.menus.showTitle();
      return;
    }

    // The other scenes run a real (paused-at-frame-90) game.
    G.mode = 'playing';
    G.hud.show();
    G.objectives.startRun();

    if (name === 'play') {
      G.menus.hideAll();
      G.enemies.setSnuffCooldown(3600); // the staged fight must not snuff the lantern
      G.lanterns.setLit(G.lanterns.list[0], true);
      G.lanterns.setLit(G.lanterns.list[1], true);
      // Fight on the north island, inside the lit lantern's glow. Enemies are
      // staged far enough that they stay in frame without crowding the camera.
      const L = G.lanterns.list[0].pos;
      G.player.pos.set(2, 0, 38);
      G.player.hp = 95;
      G.player.ammo = 18;
      G.player.grenades = 2;
      G.squad.reset();
      stageMates(-3.5, 39.5, 5.5, 39.5);
      G.enemies.spawn('wisp', new THREE.Vector3(7, 0, 45));
      G.enemies.spawn('wisp', new THREE.Vector3(-6, 0, 45));
      G.enemies.spawn('hound', new THREE.Vector3(6, 0, 46));
      G.enemies.spawn('spitter', new THREE.Vector3(-7, 0, 41));
      G.enemies.spawn('brute', new THREE.Vector3(2, 0, 47));
      G.objectives.debugSet({ score: 640, kills: 14 });
      G.objectives.addScore(0, 'Wisps down');
      G.forceArc = true; // show the grenade arc preview
      aimCamera(new THREE.Vector3(2, 0, 38), new THREE.Vector3(L.x, 2.5, L.z + 3));
      G.hud.showObjective('RELIGHT THE LANTERNS', '1 lantern still dark');
      G.hud.showBanner('THE LANTERNS BURN', 'Hold the light — the shadows press in');
      G.particles.damageNumber(new THREE.Vector3(7, 2.2, 45), '85', 'crit');
      return;
    }

    if (name === 'boss') {
      G.menus.hideAll();
      G.enemies.setSnuffCooldown(3600);
      G.objectives.debugSet({ phase: 'boss', score: 2140, kills: 46, charge: 100 });
      G.objectives.addScore(0, 'The Herald approaches');
      G.hud.showObjective('SLAY THE GLOOM HERALD', 'The boss has come. End it, then run for the pad');
      for (const lan of G.lanterns.list) G.lanterns.setLit(lan, true);
      G.boss.spawn();
      G.boss.pos.set(-1, 0, 45);
      G.player.pos.set(2, 0, 38);
      G.player.hp = 64;
      G.player.ammo = 11;
      G.player.grenades = 1;
      G.squad.reset();
      stageMates(-3.5, 39.5, 5.5, 39.5);
      G.enemies.spawn('wisp', new THREE.Vector3(-6, 0, 44));
      G.enemies.spawn('wisp', new THREE.Vector3(4, 0, 45));
      G.enemies.spawn('spitter', new THREE.Vector3(-7, 0, 42));
      G.forceArc = true;
      aimCamera(new THREE.Vector3(2, 0, 38), new THREE.Vector3(-1, 3.5, 45));
      G.particles.damageNumber(new THREE.Vector3(-1, 4.6, 44), '170', 'crit');
      return;
    }

    if (name === 'victory') {
      for (const lan of G.lanterns.list) G.lanterns.setLit(lan, true);
      G.player.pos.set(4, 0, 16);
      aimCamera(new THREE.Vector3(4, 0, 16), new THREE.Vector3(0, 10, 0));
      G.objectives.debugSet({ score: 2840, kills: 47, shotsFired: 210, shotsHit: 168, lanternsRelit: 3, startTime: G.time - 582 });
      G.objectives.victory();
      return;
    }
  }

  return { setupShot };
}
