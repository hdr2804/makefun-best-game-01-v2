// Enemies: wisps, hounds, spitters and brutes. Shadow shapes with ember eyes,
// built procedurally. Each kind seeks the player, the squad or the beacon,
// and each has a glowing weak point that crits. Spitters fire globs.
import * as THREE from 'three';

const DEFS = {
  wisp: { hp: 30, speed: 4.4, dmg: 8, score: 10, range: 1.6, cooldown: 0.9 },
  hound: { hp: 65, speed: 5.6, dmg: 15, score: 15, range: 2.2, cooldown: 1.4 },
  spitter: { hp: 45, speed: 3.1, dmg: 12, score: 20, range: 15, cooldown: 2.6 },
  brute: { hp: 230, speed: 2.3, dmg: 25, score: 40, range: 2.8, cooldown: 1.8 },
};

export function createEnemies(G) {
  const scene = G.scene;
  const list = [];
  const globs = [];
  const globGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const globMat = new THREE.MeshBasicMaterial({ color: 0xc96bff });
  let snuffCooldown = 0;

  const shadowMat = new THREE.MeshStandardMaterial({ color: 0x191426, roughness: 1, flatShading: true });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff5a2e });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd23e });

  function tag(mesh, ref, part) { mesh.userData.ref = ref; mesh.userData.part = part; return mesh; }

  function buildWisp() {
    const g = new THREE.Group();
    const core = tag(new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), emberMat), null, 'weak');
    core.position.y = 1.3;
    g.add(core);
    const trail = tag(new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 6), shadowMat), null, 'body');
    trail.rotation.x = Math.PI;
    trail.position.y = 0.6;
    g.add(trail);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
    e1.position.set(-0.14, 1.38, 0.38); g.add(e1);
    const e2 = e1.clone(); e2.position.x = 0.14; g.add(e2);
    return g;
  }
  function buildHound() {
    const g = new THREE.Group();
    const body = tag(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.7), shadowMat), null, 'body');
    body.position.y = 0.75; g.add(body);
    const plate = tag(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.1), new THREE.MeshStandardMaterial({ color: 0x3a3348, roughness: 0.7, flatShading: true })), null, 'armored');
    plate.position.set(0, 1.1, -0.1); g.add(plate);
    const head = tag(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.7), shadowMat), null, 'head');
    head.position.set(0, 1.05, 1.05); g.add(head);
    const jaw = tag(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.5), emberMat), null, 'weak');
    jaw.position.set(0, 0.85, 1.35); g.add(jaw);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
    e1.position.set(-0.16, 1.18, 1.38); g.add(e1);
    const e2 = e1.clone(); e2.position.x = 0.16; g.add(e2);
    for (const [lx, lz] of [[-0.32, 0.6], [0.32, 0.6], [-0.32, -0.6], [0.32, -0.6]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), shadowMat);
      leg.position.set(lx, 0.28, lz); g.add(leg);
    }
    return g;
  }
  function buildSpitter() {
    const g = new THREE.Group();
    const body = tag(new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.7, 6), shadowMat), null, 'body');
    body.position.y = 0.85; g.add(body);
    const mouth = tag(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), emberMat), null, 'weak');
    mouth.position.set(0, 1.5, 0.5); g.add(mouth);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
    e1.position.set(-0.2, 1.7, 0.42); g.add(e1);
    const e2 = e1.clone(); e2.position.x = 0.2; g.add(e2);
    return g;
  }
  function buildBrute() {
    const g = new THREE.Group();
    const torso = tag(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.0), shadowMat), null, 'body');
    torso.position.y = 1.35; g.add(torso);
    const core = tag(new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), emberMat), null, 'weak');
    core.position.set(0, 1.5, 0.55); g.add(core);
    for (const sx of [-1, 1]) {
      const shoulder = tag(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a3348, roughness: 0.7, flatShading: true })), null, 'armored');
      shoulder.position.set(sx * 1.0, 2.0, 0); g.add(shoulder);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), shadowMat);
      arm.position.set(sx * 1.05, 0.95, 0); g.add(arm);
    }
    const head = tag(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), shadowMat), null, 'head');
    head.position.y = 2.45; g.add(head);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
    e1.position.set(-0.16, 2.5, 0.3); g.add(e1);
    const e2 = e1.clone(); e2.position.x = 0.16; g.add(e2);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), shadowMat);
    legL.position.set(-0.4, 0.4, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.4; g.add(legR);
    return g;
  }

  const BUILDERS = { wisp: buildWisp, hound: buildHound, spitter: buildSpitter, brute: buildBrute };

  function spawnPos() {
    // Ring spawns at the main island edge or on a satellite island.
    const a = G.rng.next() * Math.PI * 2;
    if (G.rng.chance(0.7)) {
      const r = G.rng.range(22, 25);
      return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
    const s = G.rng.pick(G.world.satellites);
    return new THREE.Vector3(s.x + G.rng.range(-3, 3), 0, s.z + G.rng.range(-3, 3));
  }

  function spawn(kind, pos) {
    const def = DEFS[kind];
    const mult = G.difficulty.enemyHp;
    const group = BUILDERS[kind]();
    const e = {
      kind, def, pos: (pos || spawnPos()).clone(),
      hp: def.hp * mult, maxHp: def.hp * mult,
      speed: def.speed * G.rng.range(0.9, 1.1),
      alive: true, group, hitMeshes: [],
      attackCooldown: 0, lungeTimer: 0, bobPhase: G.rng.next() * 6,
      globCooldown: 2,
    };
    group.traverse((m) => { if (m.isMesh) { m.userData.ref = e; e.hitMeshes.push(m); } });
    group.position.copy(e.pos);
    scene.add(group);
    list.push(e);
    return e;
  }

  function die(e) {
    e.alive = false;
    G.objectives.kills += 1;
    G.objectives.addScore(e.def.score, e.kind + ' down');
    G.particles.burst(e.pos.clone().setY(1.2), 24, 0xff5a2e, 4, 4);
    G.particles.burst(e.pos.clone().setY(1.2), 10, 0x8a6bff, 3, 3);
    scene.remove(e.group);
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  }

  return {
    list, DEFS,
    spawn,
    // Test/shot hook: keep creatures from snuffing lanterns for a while.
    setSnuffCooldown(s) { snuffCooldown = s; },
    spawnWave(phase) {
      const cap = phase === 'defend' ? 14 : 8;
      if (list.length >= cap) return;
      const roll = G.rng.next();
      if (phase === 'relight') {
        spawn(roll < 0.55 ? 'wisp' : 'hound');
        if (G.rng.chance(0.4)) spawn('wisp');
      } else if (phase === 'defend') {
        const n = 2 + G.rng.int(0, 2);
        for (let i = 0; i < n; i++) {
          const r = G.rng.next();
          spawn(r < 0.4 ? 'wisp' : r < 0.7 ? 'hound' : r < 0.9 ? 'spitter' : 'brute');
        }
      } else if (phase === 'boss') {
        if (G.rng.chance(0.7)) spawn('wisp');
      }
    },
    damageEnemy(e, dmg, part, point) {
      if (!e.alive) return false;
      e.hp -= dmg;
      if (point) G.particles.burst(point, 6, part === 'weak' ? 0xffc95e : 0xff5a2e, 2.5, 2);
      if (e.hp <= 0) { die(e); return true; }
      return false;
    },
    clear() {
      for (const e of list.slice()) { scene.remove(e.group); }
      list.length = 0;
      for (const g of globs) scene.remove(g.mesh);
      globs.length = 0;
    },
    update(dt) {
      snuffCooldown -= dt;
      const playerPos = G.player.pos;
      for (const e of list.slice()) {
        if (!e.alive) continue;
        e.attackCooldown -= dt;
        e.globCooldown -= dt;
        const toPlayer = Math.hypot(playerPos.x - e.pos.x, playerPos.z - e.pos.z);
        const toBeacon = Math.hypot(e.pos.x, e.pos.z);
        let target = null; let targetPos = null;
        if (e.kind === 'spitter') {
          target = 'player'; targetPos = playerPos;
        } else if (toPlayer < 26 || toBeacon > 18) {
          target = 'player'; targetPos = playerPos;
        } else {
          target = 'beacon'; targetPos = new THREE.Vector3(0, 0, 0);
        }
        // Snuff a lit lantern on the way (with a global cooldown so it is fair).
        if (snuffCooldown <= 0) {
          for (const lan of G.lanterns.list) {
            if (lan.lit && Math.hypot(e.pos.x - lan.pos.x, e.pos.z - lan.pos.z) < 2) {
              G.lanterns.setLit(lan, false);
              G.audio.snuff();
              G.hud.showBanner('A LANTERN WAS SNUFFED', 'Relight it — the dark is closing in');
              snuffCooldown = 22;
              break;
            }
          }
        }
        // Movement.
        const dx = targetPos.x - e.pos.x; const dz = targetPos.z - e.pos.z;
        const dist = Math.hypot(dx, dz) || 0.001;
        let moveSpeed = e.speed;
        if (e.kind === 'spitter' && dist < 9) moveSpeed = -e.speed * 0.8; // keep range
        if (e.kind === 'hound' && dist < 5 && e.lungeTimer <= 0) { moveSpeed = e.speed * 2.4; e.lungeTimer = 1.6; }
        e.lungeTimer -= dt;
        const nx = e.pos.x + (dx / dist) * moveSpeed * dt;
        const nz = e.pos.z + (dz / dist) * moveSpeed * dt;
        const blocked = Math.hypot(nx, nz) < 5.2; // beacon tower
        if (!blocked && G.world.onGround(nx, e.pos.z)) e.pos.x = nx;
        if (!blocked && G.world.onGround(e.pos.x, nz)) e.pos.z = nz;
        e.group.position.copy(e.pos);
        e.group.lookAt(targetPos.x, 0, targetPos.z);
        // Bobbing / animation.
        e.bobPhase += dt * (e.kind === 'wisp' ? 3 : 6);
        if (e.kind === 'wisp') e.group.position.y = 0.25 + Math.sin(e.bobPhase) * 0.25;
        if (e.kind === 'hound') e.group.position.y = Math.abs(Math.sin(e.bobPhase)) * 0.12;
        if (e.kind === 'brute') e.group.position.y = Math.abs(Math.sin(e.bobPhase * 0.6)) * 0.06;
        // Attacks.
        if (target === 'player' && dist < e.def.range && e.attackCooldown <= 0) {
          e.attackCooldown = e.def.cooldown;
          if (e.kind === 'spitter') {
            const from = e.pos.clone(); from.y = 1.5;
            const to = playerPos.clone(); to.y = 1.4;
            const dir = to.sub(from).normalize();
            const mesh = new THREE.Mesh(globGeo, globMat);
            mesh.position.copy(from);
            scene.add(mesh);
            globs.push({ mesh, vel: dir.multiplyScalar(13), life: 4 });
            G.audio.wave();
          } else {
            const mult = G.difficulty.enemyDmg;
            const matesNear = G.squad.list.filter((m) => !m.down && Math.hypot(m.pos.x - e.pos.x, m.pos.z - e.pos.z) < 2.5);
            if (matesNear.length && G.rng.chance(0.35)) {
              G.squad.damageMate(G.rng.pick(matesNear), Math.round(e.def.dmg * mult));
            } else {
              G.player.damage(Math.round(e.def.dmg * mult), e.pos);
            }
            G.particles.burst(e.pos.clone().setY(1.2), 8, 0xff5a2e, 2, 2);
          }
        } else if (target === 'beacon' && dist < 4.2 && e.attackCooldown <= 0) {
          e.attackCooldown = e.def.cooldown;
          G.objectives.damageBeacon(Math.round(e.def.dmg * 1.4 * G.difficulty.enemyDmg));
          G.particles.burst(new THREE.Vector3(0, 2, 0), 10, 0xff5a2e, 3, 3);
        }
      }
      // Separation: push overlapping enemies apart.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]; const b = list[j];
          const dx = b.pos.x - a.pos.x; const dz = b.pos.z - a.pos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.001 && d < 1.1) {
            const push = (1.1 - d) / 2;
            const ux = dx / d; const uz = dz / d;
            a.pos.x -= ux * push; a.pos.z -= uz * push;
            b.pos.x += ux * push; b.pos.z += uz * push;
          }
        }
      }
      // Globs.
      for (let i = globs.length - 1; i >= 0; i--) {
        const g = globs[i];
        g.life -= dt;
        g.mesh.position.addScaledVector(g.vel, dt);
        const mp = g.mesh.position;
        let dead = g.life <= 0 || mp.y < 0.1;
        if (!dead) {
          if (Math.hypot(mp.x - playerPos.x, mp.z - playerPos.z) < 1.3 && mp.y < 2.2) {
            G.player.damage(Math.round(12 * G.difficulty.enemyDmg), mp);
            dead = true;
          }
          for (const m of G.squad.list) {
            if (!m.down && Math.hypot(mp.x - m.pos.x, mp.z - m.pos.z) < 1.3 && mp.y < 2.2) {
              G.squad.damageMate(m, Math.round(10 * G.difficulty.enemyDmg));
              dead = true;
            }
          }
        }
        if (dead) {
          G.particles.burst(mp, 10, 0xc96bff, 3, 2);
          scene.remove(g.mesh);
          globs.splice(i, 1);
        }
      }
    },
  };
}
