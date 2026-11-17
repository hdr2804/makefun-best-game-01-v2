// Weapons: the lantern rifle. Hitscan with spread, tracers, and locational
// damage — glowing weak points crit, armoured shadow parts resist, head-height
// hits on humanoid creatures deal more. Shots are blocked by the beacon tower.
import * as THREE from 'three';

export function createWeapons(G) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 120;
  const tmpDir = new THREE.Vector3();
  const tmpOrigin = new THREE.Vector3();

  // The rifle's numbers. Upgrades and light modify them at fire time.
  const RIFLE = { baseDamage: 34, fireInterval: 0.13, magSize: 24, reloadTime: 1.4, range: 120 };

  function partMultiplier(part) {
    if (part === 'weak') return 2.5;
    if (part === 'head') return 1.8;
    if (part === 'armored') return 0.6;
    return 1.0;
  }

  // All shootable meshes: enemy parts, boss parts, and the tower blockers.
  function targets() {
    const arr = [];
    for (const e of G.enemies.list) {
      if (!e.alive) continue;
      for (const m of e.hitMeshes) arr.push(m);
    }
    if (G.boss.active) {
      for (const m of G.boss.hitMeshes) arr.push(m);
    }
    return arr;
  }

  return {
    RIFLE,
    // Fires one hitscan shot. shooter: { origin, dir, damage, spread, owner }.
    // Returns { hit, killed, part, damage, point }.
    fire(shooter) {
      tmpOrigin.copy(shooter.origin);
      tmpDir.copy(shooter.dir);
      // Spread: a small random cone.
      const sp = shooter.spread || 0;
      tmpDir.x += (G.rng.next() - 0.5) * sp;
      tmpDir.y += (G.rng.next() - 0.5) * sp;
      tmpDir.z += (G.rng.next() - 0.5) * sp;
      tmpDir.normalize();
      raycaster.set(tmpOrigin, tmpDir);

      const hits = raycaster.intersectObjects(targets(), false);
      const blockHits = raycaster.intersectObjects(G.world.blockers, false);
      const blockDist = blockHits.length ? blockHits[0].distance : Infinity;
      const end = tmpOrigin.clone().addScaledVector(tmpDir, RIFLE.range);

      if (hits.length && hits[0].distance < blockDist) {
        const h = hits[0];
        const mesh = h.object;
        const part = mesh.userData.part || 'body';
        const ref = mesh.userData.ref;
        let dmg = shooter.damage * partMultiplier(part);
        if (shooter.owner === 'player') {
          const light = G.lanterns.bonusAt(G.player.pos);
          if (light > 0.5) dmg *= 1.2; // fighting in the light hits harder
          dmg *= G.upgrades.damageMul || 1;
        }
        dmg = Math.round(dmg);
        const point = h.point.clone();
        end.copy(point);
        let killed = false;
        if (ref && ref.kind === 'boss') {
          killed = G.boss.damage(dmg, part);
        } else if (ref) {
          killed = G.enemies.damageEnemy(ref, dmg, part, point);
        }
        return { hit: true, killed, part, damage: dmg, point };
      }
      if (blockHits.length) end.copy(blockHits[0].point);
      return { hit: false, killed: false, part: null, damage: 0, point: end };
    },
    // A visible tracer from the muzzle to the shot's end point.
    tracer(from, to) {
      G.particles.tracer(from, to, 0xffe9a8);
    },
    muzzleFlash(pos) {
      G.particles.burst(pos, 5, 0xffc95e, 2.5, 1.5);
    },
  };
}
