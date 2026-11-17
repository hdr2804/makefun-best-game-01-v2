// Grenades: an arcing throwable with a fuse and area damage that falls off
// with distance. A faint dotted arc previews the throw while the key is held.
import * as THREE from 'three';

export function createGrenades(G) {
  const scene = G.scene;
  const thrown = [];
  const ARC_POINTS = 16;

  const shellGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x2e4a2e, roughness: 0.6, emissive: 0x1a5a1a, emissiveIntensity: 0.7 });

  // The preview arc: a line rebuilt every frame while aiming.
  const arcGeo = new THREE.BufferGeometry();
  const arcPos = new Float32Array((ARC_POINTS + 1) * 3);
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcLine = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xffc95e, transparent: true, opacity: 0.0 }));
  arcLine.frustumCulled = false;
  scene.add(arcLine);

  function simulate(origin, dir, steps) {
    const pts = [];
    const pos = origin.clone();
    const vel = dir.clone().multiplyScalar(16);
    vel.y += 3.5;
    for (let i = 0; i <= steps; i++) {
      pts.push(pos.clone());
      vel.y -= 14 * (1 / 30);
      pos.addScaledVector(vel, 1 / 30);
      if (pos.y <= 0.1) { pos.y = 0.1; break; }
    }
    return pts;
  }

  return {
    throwFrom(origin, dir, owner) {
      const mesh = new THREE.Mesh(shellGeo, shellMat);
      mesh.position.copy(origin);
      scene.add(mesh);
      const vel = dir.clone().multiplyScalar(16);
      vel.y += 3.5;
      thrown.push({ mesh, vel, fuse: 1.2, owner });
    },
    update(dt) {
      // Arc preview while the player holds G with grenades left, or forced on
      // by a deterministic shot scene.
      const showArc = (G.player.grenades > 0 && G.input.isDown('KeyG') && G.mode === 'playing' && !G.player.down) || !!G.forceArc;
      if (showArc) {
        const pts = simulate(G.player.eyePos(), G.player.lookDir(), ARC_POINTS);
        for (let i = 0; i <= ARC_POINTS; i++) {
          const pt = pts[Math.min(i, pts.length - 1)];
          arcPos[i * 3] = pt.x; arcPos[i * 3 + 1] = pt.y; arcPos[i * 3 + 2] = pt.z;
        }
        arcGeo.attributes.position.needsUpdate = true;
        arcLine.material.opacity = 0.75;
      } else {
        arcLine.material.opacity = 0;
      }
      for (let i = thrown.length - 1; i >= 0; i--) {
        const g = thrown[i];
        g.fuse -= dt;
        g.vel.y -= 14 * dt;
        g.mesh.position.addScaledVector(g.vel, dt);
        g.mesh.rotation.x += dt * 9;
        if (g.mesh.position.y <= 0.16) {
          g.mesh.position.y = 0.16;
          g.vel.y = Math.abs(g.vel.y) * 0.35;
          g.vel.x *= 0.6; g.vel.z *= 0.6;
        }
        if (g.fuse <= 0) {
          this.explode(g.mesh.position);
          scene.remove(g.mesh);
          thrown.splice(i, 1);
        }
      }
    },
    explode(pos) {
      G.audio.explosion();
      G.particles.burst(pos, 42, 0xff8a2e, 7, 5);
      G.particles.burst(pos, 20, 0xffe9a8, 4, 6);
      G.particles.addShake(0.5);
      const R = 6;
      const dmgAt = (d) => Math.round(120 * Math.max(0, 1 - d / R) + 20 * (d < R ? 1 : 0));
      for (const e of G.enemies.list) {
        if (!e.alive) continue;
        const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
        if (d < R) G.enemies.damageEnemy(e, dmgAt(d), 'body', e.pos.clone().setY(1.2));
      }
      if (G.boss.active) {
        const d = Math.hypot(G.boss.pos.x - pos.x, G.boss.pos.z - pos.z);
        if (d < R) G.boss.damage(dmgAt(d), 'body');
      }
      const pd = Math.hypot(G.player.pos.x - pos.x, G.player.pos.z - pos.z);
      if (pd < R * 0.7) G.player.damage(Math.round(40 * (1 - pd / R)), pos);
    },
    clear() {
      for (const g of thrown) G.scene.remove(g.mesh);
      thrown.length = 0;
    },
  };
}
