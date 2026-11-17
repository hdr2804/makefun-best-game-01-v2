// The player: first-person movement, the lantern rifle, grenades, relighting,
// and the light/dark health rules. A downed player is revived by a teammate
// who is still up; if the whole squad is down, the run ends.
import * as THREE from 'three';

export function createPlayer(G) {
  const camera = G.camera;
  const eye = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();

  const p = {
    pos: new THREE.Vector3(0, 0, 14),
    yaw: 0, pitch: 0,
    velY: 0, grounded: true,
    hp: 100, maxHp: 100,
    ammo: 24, reloading: false, reloadTimer: 0,
    grenades: 3, grenadeMax: 3,
    fireCooldown: 0,
    alive: true, down: false, downTimer: 0, reviveTimer: 0,
    inLight: 0, darkTime: 0, stepTimer: 0,
    relightTarget: null, relightProgress: 0,
    magSize: 24,
  };

  function applyUpgrades() {
    p.maxHp = 100 + (G.upgrades.plating ? 30 : 0);
    p.magSize = 24 + (G.upgrades.mag ? 8 : 0);
    p.grenadeMax = 3 + (G.upgrades.grenades ? 2 : 0);
    p.ammo = Math.min(p.ammo, p.magSize);
  }

  function eyePos() {
    eye.copy(p.pos);
    eye.y += p.down ? 0.7 : 1.7;
    return eye;
  }

  function lookDir() {
    fwd.set(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
    return fwd;
  }

  function collide(x, z) {
    // Beacon tower blocks.
    if (Math.hypot(x, z) < 5.0) return false;
    // Lantern posts block.
    for (const lan of G.lanterns.list) {
      if (Math.hypot(x - lan.pos.x, z - lan.pos.z) < 0.9) return false;
    }
    return G.world.onGround(x, z);
  }

  function startReload() {
    if (p.reloading || p.ammo >= p.magSize) return;
    p.reloading = true;
    p.reloadTimer = G.weapons.RIFLE.reloadTime;
    G.audio.reload();
  }

  // Methods live on the state object itself so every reader sees live values
  // (a spread copy would freeze the numbers at creation time).
  const api = {
    applyUpgrades,
    eyePos,
    lookDir,
    reset(spawnPos) {
      p.pos.copy(spawnPos || new THREE.Vector3(0, 0, 14));
      p.yaw = 0; p.pitch = 0; p.velY = 0;
      p.hp = p.maxHp; p.alive = true; p.down = false;
      p.ammo = p.magSize; p.grenades = p.grenadeMax;
      p.reloading = false; p.fireCooldown = 0;
      p.relightTarget = null; p.relightProgress = 0;
      p.darkTime = 0;
      applyUpgrades();
      p.hp = p.maxHp;
      p.ammo = p.magSize; p.grenades = p.grenadeMax;
    },
    damage(amount, fromPos) {
      if (!p.alive || p.down) return;
      p.hp -= amount;
      G.hud.flashHurt(fromPos);
      G.audio.hurt();
      G.particles.addShake(0.25);
      if (p.hp <= 0) {
        p.hp = 0;
        p.down = true;
        p.downTimer = 0;
        G.hud.showBanner('YOU ARE DOWN', 'A keeper is coming — hold on');
        G.audio.lose();
      }
    },
    heal(amount) {
      if (!p.alive || p.down) return;
      p.hp = Math.min(p.maxHp, p.hp + amount);
    },
    update(dt) {
      if (!p.alive) return;
      const input = G.input;

      // Mouse look.
      const sens = (G.settings.sens || 1) * 0.0023;
      const m = input.takeMouse();
      p.yaw -= m.dx * sens;
      p.pitch -= m.dy * sens;
      p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));

      if (p.down) {
        // A teammate is coming; the revive is handled by the squad module.
        p.downTimer += dt;
        p.relightTarget = null;
        camera.position.copy(eyePos());
        camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
        return;
      }

      // Movement.
      const ax = input.moveAxis();
      const speed = (input.sprint ? 10 : 6.5) * (G.upgrades.swift ? 1.12 : 1);
      const sin = Math.sin(p.yaw); const cos = Math.cos(p.yaw);
      // Forward is (-sin, -cos); right is (cos, -sin). ax.z is -1 on W, ax.x is +1 on D.
      const mx = sin * ax.z + cos * ax.x;
      const mz = cos * ax.z - sin * ax.x;
      const moving = Math.hypot(ax.x, ax.z) > 0;
      if (moving) {
        const nx = p.pos.x + mx * speed * dt;
        const nz = p.pos.z + mz * speed * dt;
        if (collide(nx, p.pos.z)) p.pos.x = nx;
        if (collide(p.pos.x, nz)) p.pos.z = nz;
        p.stepTimer -= dt;
        if (p.stepTimer <= 0) { G.audio.step(); p.stepTimer = input.sprint ? 0.32 : 0.45; }
      }
      // Jump and gravity.
      if (input.consume('jump') && p.grounded) { p.velY = 7.5; p.grounded = false; }
      p.velY -= 20 * dt;
      p.pos.y += p.velY * dt;
      if (p.pos.y <= 0) { p.pos.y = 0; p.velY = 0; p.grounded = true; }

      // Light and dark: slow heal in the light, slow drain in the dark.
      p.inLight = G.lanterns.bonusAt(p.pos);
      if (p.inLight > 0.5) {
        p.darkTime = 0;
        p.hp = Math.min(p.maxHp, p.hp + 2.2 * dt);
      } else if (p.inLight < 0.05) {
        p.darkTime += dt;
        if (p.darkTime > 6 && G.objectives.phase !== 'title') {
          p.hp -= 1.2 * dt;
          if (p.hp <= 0) { p.hp = 0; p.down = true; p.downTimer = 0; G.hud.showBanner('THE DARK TOOK YOU', 'A keeper is coming — hold on'); }
        }
      } else {
        p.darkTime = 0;
      }

      // Reload.
      if (p.reloading) {
        p.reloadTimer -= dt;
        if (p.reloadTimer <= 0) { p.reloading = false; p.ammo = p.magSize; }
      } else if (input.consume('reload')) {
        startReload();
      }

      // Shooting.
      p.fireCooldown -= dt;
      if (input.mouseDown && p.fireCooldown <= 0 && !p.reloading) {
        if (p.ammo <= 0) { G.audio.dryFire(); p.fireCooldown = 0.25; startReload(); }
        else {
          p.fireCooldown = G.weapons.RIFLE.fireInterval;
          p.ammo -= 1;
          G.objectives.shotsFired += 1;
          const origin = eyePos().clone();
          const dir = lookDir().clone();
          const spread = 0.012 + (moving ? 0.012 : 0) + (p.inLight > 0.5 ? -0.004 : 0);
          const res = G.weapons.fire({ origin, dir, damage: G.weapons.RIFLE.baseDamage, spread, owner: 'player' });
          const muzzle = origin.clone().addScaledVector(dir, 0.6);
          right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
          muzzle.addScaledVector(right, 0.25); muzzle.y -= 0.18;
          G.weapons.tracer(muzzle, res.point);
          G.weapons.muzzleFlash(muzzle);
          G.audio.shoot();
          G.particles.addShake(0.05);
          p.pitch += 0.0035; // slight kick
          if (res.hit) {
            G.objectives.shotsHit += 1;
            G.hud.showHitmarker(res.part === 'weak' || res.part === 'head');
            G.audio.hit(res.part === 'weak');
            G.particles.damageNumber(res.point, String(res.damage), res.part === 'weak' ? 'crit' : (res.part === 'armored' ? 'weak' : ''));
            if (res.killed) { G.audio.kill(); }
          }
        }
      }

      // Grenade.
      if (input.consume('grenade') && p.grenades > 0) {
        p.grenades -= 1;
        const origin = eyePos().clone();
        const dir = lookDir().clone();
        G.grenades.throwFrom(origin, dir, 'player');
        G.audio.grenadeThrow();
      }

      // Relight channel: hold F near a snuffed lantern.
      const near = G.lanterns.nearestLit(p.pos); // (unused here; snuffed check below)
      void near;
      let target = null;
      for (const lan of G.lanterns.list) {
        if (lan.lit) continue;
        if (Math.hypot(p.pos.x - lan.pos.x, p.pos.z - lan.pos.z) < 3.2) { target = lan; break; }
      }
      if (target && input.isDown('KeyF')) {
        if (p.relightTarget !== target) { p.relightTarget = target; p.relightProgress = 0; }
        p.relightProgress += dt / 1.5;
        if (p.relightProgress >= 1) {
          G.lanterns.setLit(target, true);
          p.relightTarget = null; p.relightProgress = 0;
          p.grenades = Math.min(p.grenadeMax, p.grenades + 1); // resupply at a lit lantern
          G.audio.relight();
          G.particles.burst(new THREE.Vector3(target.pos.x, 3.7, target.pos.z), 26, 0xffc95e, 3, 3);
          G.objectives.onLanternRelit(target);
        }
      } else {
        p.relightTarget = null; p.relightProgress = 0;
      }

      // Camera with shake.
      camera.position.copy(eyePos());
      const sh = G.particles.getShake();
      if (sh > 0) {
        camera.position.x += (G.rng.next() - 0.5) * sh * 0.25;
        camera.position.y += (G.rng.next() - 0.5) * sh * 0.25;
      }
      camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    },
  };
  return Object.assign(p, api);
}
