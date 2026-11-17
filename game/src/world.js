// The world: floating sky-islands at night, a beacon tower in the centre, three
// satellite islands joined by rope bridges, a star field and drifting fog.
// Geometry is procedural low-poly only; nothing is downloaded.
import * as THREE from 'three';

export function buildWorld(G) {
  const scene = G.scene;
  const rng = G.rng;

  // Night sky, fog and lights.
  scene.background = new THREE.Color(0x070818);
  scene.fog = new THREE.FogExp2(0x0a0c26, 0.016);
  const ambient = new THREE.AmbientLight(0x33406e, 0.85);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0x8fa8d8, 0.9);
  moon.position.set(-30, 42, -18);
  scene.add(moon);
  const moonBall = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }),
  );
  moonBall.position.set(-60, 55, -70);
  scene.add(moonBall);

  // Stars: two point clouds, one bright, one faint.
  function starCloud(count, size, color, spread, height) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng.next() - 0.5) * spread;
      pos[i * 3 + 1] = height + rng.next() * 55;
      pos[i * 3 + 2] = (rng.next() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  }
  const starsA = starCloud(420, 1.6, 0xffffff, 320, 12);
  const starsB = starCloud(700, 1.0, 0xaec6ff, 320, 8);

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4460, roughness: 1, flatShading: true });
  const rockDark = new THREE.MeshStandardMaterial({ color: 0x322e44, roughness: 1, flatShading: true });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x3d5a4a, roughness: 1, flatShading: true });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x51683f, roughness: 1, flatShading: true });

  // One island: a flat-topped rock (cylinder with a jittered rim) plus an underside cone.
  function makeIsland(x, z, radius, topY) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, 1.6, 9), topMat);
    top.position.set(x, topY - 0.8, z);
    group.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.92, radius * 1.5, 9), rockMat);
    under.rotation.x = Math.PI;
    under.position.set(x, topY - 1.6 - radius * 0.75, z);
    group.add(under);
    // Boulders and shrubs for silhouette.
    const nRocks = Math.floor(radius * 0.35);
    for (let i = 0; i < nRocks; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = rng.range(radius * 0.45, radius * 0.95);
      const s = rng.range(0.5, 1.6);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rng.chance(0.5) ? rockDark : rockMat);
      rock.position.set(x + Math.cos(a) * r, topY + s * 0.4, z + Math.sin(a) * r);
      rock.rotation.set(rng.next() * 3, rng.next() * 3, rng.next() * 3);
      group.add(rock);
    }
    for (let i = 0; i < Math.floor(radius * 0.5); i++) {
      const a = rng.next() * Math.PI * 2;
      const r = rng.range(radius * 0.3, radius * 0.9);
      const shrub = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.3, 0.6), rng.range(0.8, 1.6), 5), mossMat);
      shrub.position.set(x + Math.cos(a) * r, topY + 0.6, z + Math.sin(a) * r);
      group.add(shrub);
    }
    scene.add(group);
    return { x, z, radius, topY };
  }

  const main = makeIsland(0, 0, 26, 0);
  const satellites = [];
  const angles = [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6];
  for (let i = 0; i < 3; i++) {
    const a = angles[i];
    const d = 40;
    satellites.push(makeIsland(Math.cos(a) * d, Math.sin(a) * d, 9, 0));
  }

  // Rope bridges from the main island to each satellite.
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x9a7b52 });
  function makeBridge(from, to) {
    const group = new THREE.Group();
    const dx = to.x - from.x; const dz = to.z - from.z;
    const len = Math.hypot(dx, dz);
    const dirX = dx / len; const dirZ = dz / len;
    const steps = Math.floor(len / 1.6);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sag = Math.sin(t * Math.PI) * 1.4;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.1), plankMat);
      plank.position.set(from.x + dx * t, 0.1 - sag, from.z + dz * t);
      plank.rotation.y = -Math.atan2(dirZ, dirX);
      group.add(plank);
    }
    for (const side of [-1.2, 1.2]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(new THREE.Vector3(
          from.x + dx * t - dirZ * side,
          1.1 - Math.sin(t * Math.PI) * 1.4,
          from.z + dz * t + dirX * side,
        ));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x9a7b52 }),
      );
      group.add(line);
    }
    scene.add(group);
  }
  for (const s of satellites) {
    const edge = 26 - 2;
    const a = Math.atan2(s.z, s.x);
    makeBridge(
      { x: Math.cos(a) * edge, z: Math.sin(a) * edge },
      { x: s.x - Math.cos(a) * (s.radius - 1), z: s.z - Math.sin(a) * (s.radius - 1) },
    );
  }
  void ropeMat;

  // The beacon tower: stone base, brass cage, crystal, and a sweeping beam.
  const beacon = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5468, roughness: 0.9, flatShading: true });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xa8842e, roughness: 0.45, metalness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 3.2, 8), stoneMat);
  base.position.y = 1.6;
  beacon.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.4, 9, 8), stoneMat);
  shaft.position.y = 7.6;
  beacon.add(shaft);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.6, 8), brassMat);
  cage.position.y = 13.4;
  beacon.add(cage);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffc95e, emissive: 0xff9a1e, emissiveIntensity: 2.2, roughness: 0.2,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), crystalMat);
  crystal.position.y = 13.4;
  beacon.add(crystal);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffc95e, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 42, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2 - 0.12;
  beam.position.set(21, 13.4, 0);
  beacon.add(beam);
  const beaconLight = new THREE.PointLight(0xffb02e, 900, 60, 1.6);
  beaconLight.position.set(0, 13.4, 0);
  beacon.add(beaconLight);
  scene.add(beacon);

  // Extraction pad on the main island's south edge (lit only during extraction).
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1d2f4a, roughness: 0.7, emissive: 0x0a2a44, emissiveIntensity: 0.6 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.4, 12), padMat);
  pad.position.set(0, 0.2, 20);
  scene.add(pad);
  const padRing = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x57d9ff }),
  );
  padRing.rotation.x = Math.PI / 2;
  padRing.position.set(0, 0.45, 20);
  padRing.visible = false;
  scene.add(padRing);

  // Walkable ground: main island + satellites (bridges count as walkable strips).
  function onGround(x, z) {
    if (Math.hypot(x, z) <= 25) return true;
    for (const s of satellites) {
      if (Math.hypot(x - s.x, z - s.z) <= s.radius - 0.5) return true;
    }
    // Bridges: within 1.6 of the segment main-edge -> satellite-edge.
    for (const s of satellites) {
      const a = Math.atan2(s.z, s.x);
      const ax = Math.cos(a) * 24; const az = Math.sin(a) * 24;
      const bx = s.x - Math.cos(a) * (s.radius - 1); const bz = s.z - Math.sin(a) * (s.radius - 1);
      const abx = bx - ax; const abz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
      const px = ax + abx * t; const pz = az + abz * t;
      if (Math.hypot(x - px, z - pz) <= 1.5) return true;
    }
    return false;
  }

  return {
    main, satellites,
    beaconPos: new THREE.Vector3(0, 0, 0),
    padPos: new THREE.Vector3(0, 0, 20),
    setPadVisible(v) { padRing.visible = v; },
    // Solid meshes that block shots (the beacon tower).
    blockers: [base, shaft, cage],
    onGround,
    update(dt, t) {
      beam.rotation.y = t * 0.35;
      crystal.rotation.y = t * 0.8;
      crystal.position.y = 13.4 + Math.sin(t * 1.4) * 0.15;
      crystalMat.emissiveIntensity = 1.9 + Math.sin(t * 2.2) * 0.5;
      starsA.rotation.y = t * 0.004;
      starsB.rotation.y = -t * 0.002;
    },
  };
}
