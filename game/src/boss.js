// The Gloom Herald: the boss of the third objective. A tall crowned shadow with
// a glowing core. Phase one summons wisps; below half health it enters phase
// two, faster, with a radial shadow wave. Defeating it opens extraction.
import * as THREE from 'three';

export function createBoss(G) {
  const scene = G.scene;
  let boss = null;
  const waveGeo = new THREE.TorusGeometry(1, 0.5, 8, 40);
  const waveMat = new THREE.MeshBasicMaterial({ color: 0xc96bff, transparent: true, opacity: 0.7 });
  const waves = [];

  function buildMesh() {
    const g = new THREE.Group();
    const shadowMat = new THREE.MeshStandardMaterial({ color: 0x120e20, roughness: 1, flatShading: true });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x2e2440, roughness: 0.7, flatShading: true });
    const robe = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 7), shadowMat);
    robe.position.y = 1.7;
    robe.userData.part = 'body';
    g.add(robe);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.0), plateMat);
    torso.position.y = 3.6;
    torso.userData.part = 'armored';
    g.add(torso);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: 0xc96bff }));
    core.position.set(0, 3.7, 0.6);
    core.userData.part = 'weak';
    g.add(core);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), shadowMat);
    head.position.y = 4.7;
    head.userData.part = 'head';
    g.add(head);
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 5), plateMat);
      horn.position.set(sx * 0.5, 5.3, 0);
      horn.rotation.z = -sx * 0.5;
      g.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd23e }));
      eye.position.set(sx * 0.2, 4.8, 0.48);
      g.add(eye);
    }
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.9, 0.4), shadowMat);
      arm.position.set(sx * 1.25, 3.2, 0);
      arm.userData.part = 'body';
      g.add(arm);
    }
    const light = new THREE.PointLight(0xc96bff, 320, 26, 1.7);
    light.position.y = 3.5;
    g.add(light);
    return { group: g, core, light };
  }

  return {
    get active() { return !!boss && boss.alive; },
    get hp() { return boss ? boss.hp : 0; },
    get maxHp() { return boss ? boss.maxHp : 1; },
    get pos() { return boss ? boss.pos : new THREE.Vector3(0, 0, 0); },
    get hitMeshes() {
      if (!boss) return [];
      const arr = [];
      boss.group.traverse((m) => { if (m.isMesh) arr.push(m); });
      return arr;
    },
    spawn() {
      const mesh = buildMesh();
      const mult = G.difficulty.enemyHp;
      const hp = Math.round(900 * mult);
      boss = {
        kind: 'boss', pos: new THREE.Vector3(0, 0, -24), hp, maxHp: hp,
        alive: true, group: mesh.group, core: mesh.core,
        phase: 1, speed: 2.0,
        attackCooldown: 2, summonCooldown: 6, waveCooldown: 8,
        bobPhase: 0,
      };
      boss.group.traverse((m) => { if (m.isMesh) m.userData.ref = boss; });
      boss.group.position.copy(boss.pos);
      scene.add(boss.group);
      G.audio.bossRoar();
      G.hud.showBanner('THE GLOOM HERALD', 'Slay it — then run for the extraction pad');
      G.hud.showBossBar(true);
      return boss;
    },
    damage(dmg, part) {
      if (!boss || !boss.alive) return false;
      boss.hp -= dmg;
      boss.core.scale.setScalar(1 + (1 - boss.hp / boss.maxHp) * 0.4);
      if (boss.hp <= boss.maxHp / 2 && boss.phase === 1) {
        boss.phase = 2;
        boss.speed = 3.1;
        G.hud.showBanner('THE HERALD RAGES', 'Phase two — shadow waves are coming');
        G.audio.bossRoar();
        G.particles.burst(boss.pos.clone().setY(3), 40, 0xc96bff, 6, 5);
      }
      if (boss.hp <= 0) {
        boss.alive = false;
        G.objectives.kills += 1;
        G.objectives.addScore(500, 'Gloom Herald slain');
        G.particles.burst(boss.pos.clone().setY(3), 80, 0xc96bff, 8, 7);
        G.particles.burst(boss.pos.clone().setY(2), 50, 0xffc95e, 6, 6);
        G.particles.addShake(0.6);
        G.audio.explosion();
        G.audio.win();
        scene.remove(boss.group);
        G.hud.showBossBar(false);
        G.objectives.onBossSlain();
        return true;
      }
      return false;
    },
    clear() {
      if (boss) { scene.remove(boss.group); boss = null; }
      for (const w of waves) scene.remove(w.mesh);
      waves.length = 0;
      G.hud.showBossBar(false);
    },
    update(dt) {
      if (!boss || !boss.alive) return;
      boss.attackCooldown -= dt;
      boss.summonCooldown -= dt;
      boss.waveCooldown -= dt;
      boss.bobPhase += dt * 2;
      const playerPos = G.player.pos;
      const dist = Math.hypot(playerPos.x - boss.pos.x, playerPos.z - boss.pos.z);
      // Walk toward the player, slow and unstoppable.
      if (dist > 6) {
        const nx = boss.pos.x + ((playerPos.x - boss.pos.x) / dist) * boss.speed * dt;
        const nz = boss.pos.z + ((playerPos.z - boss.pos.z) / dist) * boss.speed * dt;
        if (G.world.onGround(nx, boss.pos.z)) boss.pos.x = nx;
        if (G.world.onGround(boss.pos.x, nz)) boss.pos.z = nz;
      }
      boss.group.position.copy(boss.pos);
      boss.group.position.y = Math.abs(Math.sin(boss.bobPhase)) * 0.15;
      boss.group.lookAt(playerPos.x, 0, playerPos.z);
      boss.core.rotation.y += dt * 3;
      // Melee slam up close.
      if (dist < 4.5 && boss.attackCooldown <= 0) {
        boss.attackCooldown = 1.8;
        G.player.damage(Math.round(30 * G.difficulty.enemyDmg), boss.pos);
        G.particles.addShake(0.5);
        G.particles.burst(playerPos.clone().setY(1), 16, 0xc96bff, 4, 3);
      }
      // Phase one: summon wisps.
      if (boss.phase === 1 && boss.summonCooldown <= 0 && G.enemies.list.length < 10) {
        boss.summonCooldown = 7;
        for (let i = 0; i < 2; i++) {
          const a = G.rng.next() * Math.PI * 2;
          G.enemies.spawn('wisp', new THREE.Vector3(boss.pos.x + Math.cos(a) * 3, 0, boss.pos.z + Math.sin(a) * 3));
        }
        G.audio.wave();
      }
      // Phase two: radial shadow wave.
      if (boss.phase === 2 && boss.waveCooldown <= 0) {
        boss.waveCooldown = 8;
        const mesh = new THREE.Mesh(waveGeo, waveMat.clone());
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(boss.pos.x, 0.4, boss.pos.z);
        scene.add(mesh);
        waves.push({ mesh, r: 1, hit: false });
        G.audio.bossRoar();
      }
      // Expanding waves: damage the player once as the ring passes them.
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += dt * 9;
        w.mesh.scale.setScalar(w.r);
        w.mesh.material.opacity = Math.max(0, 0.7 - w.r * 0.02);
        if (!w.hit && Math.abs(Math.hypot(playerPos.x - boss.pos.x, playerPos.z - boss.pos.z) - w.r) < 1.2) {
          w.hit = true;
          G.player.damage(Math.round(20 * G.difficulty.enemyDmg), boss.pos);
        }
        if (w.r > 34) { scene.remove(w.mesh); waves.splice(i, 1); }
      }
    },
  };
}
