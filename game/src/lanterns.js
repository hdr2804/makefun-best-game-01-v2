// Lanterns: the light the game is fought over. Three outer lanterns on the
// satellite islands plus the beacon's own glow. Lit lanterns heal and buff the
// squad nearby; snuffed ones go cold and can be relit. Creatures snuff them.
import * as THREE from 'three';

export function createLanterns(G) {
  const scene = G.scene;
  const list = [];

  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3348, roughness: 0.9, flatShading: true });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x8a6a24, roughness: 0.5, metalness: 0.6 });

  function makeLantern(pos, radius, startLit) {
    const group = new THREE.Group();
    group.position.copy(pos);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3.4, 6), postMat);
    post.position.y = 1.7;
    group.add(post);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.9, 6), cageMat);
    cage.position.y = 3.7;
    group.add(cage);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc95e });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), flameMat);
    flame.position.y = 3.7;
    group.add(flame);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb02e, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.30, 12, 12), glowMat);
    glow.position.y = 3.7;
    group.add(glow);
    const light = new THREE.PointLight(0xffb02e, 220, radius * 2.4, 1.7);
    light.position.y = 3.7;
    group.add(light);
    // A light pool decal on the ground so the radius reads at a glance.
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xffb02e, transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;
    group.add(pool);
    scene.add(group);
    const lan = { pos: pos.clone(), radius, lit: startLit, group, flame, flameMat, glow, light, pool, flicker: G.rng.next() * 10 };
    setLit(lan, startLit);
    list.push(lan);
    return lan;
  }

  function setLit(lan, lit) {
    lan.lit = lit;
    lan.flame.visible = lit;
    lan.glow.visible = lit;
    lan.light.visible = lit;
    lan.pool.visible = lit;
    lan.flameMat.color.set(lit ? 0xffc95e : 0x4a5a7a);
    if (!lit) {
      // A cold ember: a dim blue nub so the post still reads as a lantern.
      lan.flame.scale.setScalar(0.45);
      lan.flame.visible = true;
    } else {
      lan.flame.scale.setScalar(1);
    }
  }

  // Outer lanterns sit on the satellite islands.
  for (const s of G.world.satellites) {
    makeLantern(new THREE.Vector3(s.x, 0, s.z), 7, false);
  }

  return {
    list,
    setLit,
    // Nearest lit lantern to a point, or null.
    nearestLit(pos) {
      let best = null; let bd = Infinity;
      for (const lan of list) {
        if (!lan.lit) continue;
        const d = Math.hypot(pos.x - lan.pos.x, pos.z - lan.pos.z);
        if (d < bd) { bd = d; best = lan; }
      }
      return best ? { lan: best, dist: bd } : null;
    },
    // Light bonus: 1 inside a lit lantern's radius, fading to 0 outside.
    bonusAt(pos) {
      let best = 0;
      for (const lan of list) {
        if (!lan.lit) continue;
        const d = Math.hypot(pos.x - lan.pos.x, pos.z - lan.pos.z);
        const b = Math.max(0, 1 - d / lan.radius);
        if (b > best) best = b;
      }
      // The beacon itself is a small light at the centre.
      const bd = Math.hypot(pos.x, pos.z);
      const bb = Math.max(0, 1 - bd / 12);
      if (bb > best) best = bb;
      return best;
    },
    // Snuff one lit lantern at random (creatures do this when they reach one).
    snuffRandom() {
      const lit = list.filter((l) => l.lit);
      if (!lit.length) return null;
      const lan = G.rng.pick(lit);
      setLit(lan, false);
      return lan;
    },
    update(dt, t) {
      for (const lan of list) {
        if (!lan.lit) continue;
        const f = 0.9 + Math.sin(t * 7 + lan.flicker) * 0.12 + Math.sin(t * 13 + lan.flicker * 2) * 0.06;
        lan.light.intensity = 220 * f;
        lan.flame.scale.setScalar(f);
      }
    },
  };
}
