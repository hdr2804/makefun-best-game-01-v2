// Particles, floating damage numbers and screen shake. One shared pool of
// point sprites, plus DOM damage numbers projected from world positions.
import * as THREE from 'three';

export function createParticles(G) {
  const scene = G.scene;
  const MAX = 420;
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.32, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const pool = [];
  for (let i = 0; i < MAX; i++) {
    pool.push({ alive: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, r: 1, g: 1, b: 1 });
    positions[i * 3 + 1] = -999;
  }
  let cursor = 0;
  let shake = 0;
  const dmgLayer = document.getElementById('dmg-layer');
  const tmpV = new THREE.Vector3();

  function spawnOne(x, y, z, vx, vy, vz, life, r, g, b) {
    const p = pool[cursor];
    cursor = (cursor + 1) % MAX;
    p.alive = true; p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = life; p.maxLife = life; p.r = r; p.g = g; p.b = b;
  }

  return {
    burst(pos, count, color, speed, up) {
      const c = new THREE.Color(color);
      for (let i = 0; i < count; i++) {
        const a = G.rng.next() * Math.PI * 2;
        const s = speed * (0.3 + G.rng.next() * 0.7);
        spawnOne(
          pos.x, pos.y, pos.z,
          Math.cos(a) * s, (up || 2) * G.rng.next() + 0.5, Math.sin(a) * s,
          0.4 + G.rng.next() * 0.5, c.r, c.g, c.b,
        );
      }
    },
    // A short-lived tracer line from muzzle to hit point.
    tracer(from, to, color) {
      const geoL = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
      const line = new THREE.Line(geoL, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      scene.add(line);
      setTimeout(() => { scene.remove(line); geoL.dispose(); line.material.dispose(); }, 70);
    },
    damageNumber(worldPos, text, kind) {
      if (!dmgLayer) return;
      tmpV.copy(worldPos).project(G.camera);
      if (tmpV.z > 1) return;
      const el = document.createElement('div');
      el.className = 'dmg-num' + (kind ? ' ' + kind : '');
      el.textContent = text;
      el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      dmgLayer.appendChild(el);
      setTimeout(() => el.remove(), 850);
      while (dmgLayer.children.length > 24) dmgLayer.firstChild.remove();
    },
    addShake(amount) { shake = Math.min(0.6, shake + amount); },
    getShake() { return shake; },
    update(dt) {
      shake = Math.max(0, shake - dt * 1.8);
      for (let i = 0; i < MAX; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; positions[i * 3 + 1] = -999; continue; }
        p.vy -= 9 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        const f = p.life / p.maxLife;
        positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
        colors[i * 3] = p.r * f; colors[i * 3 + 1] = p.g * f; colors[i * 3 + 2] = p.b * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
