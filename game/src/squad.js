// The squad: Bram and Sef, two AI lantern-keepers who fight beside the player.
// Orders (Q cycles): FOLLOW the player, HOLD a position, ADVANCE toward the
// objective. X orders both to focus fire on what the player aims at. A downed
// keeper is revived by standing near them; a downed player is revived by a
// keeper who reaches them.
import * as THREE from 'three';

const ORDERS = ['FOLLOW', 'HOLD', 'ADVANCE'];

export function createSquad(G) {
  const scene = G.scene;
  const mates = [];

  function buildMateMesh(accent) {
    const group = new THREE.Group();
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x2c3550, roughness: 0.9, flatShading: true });
    const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, emissive: accent, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.5, 6), robeMat);
    body.position.y = 0.95;
    body.userData.part = 'body';
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.8 }));
    head.position.y = 1.95;
    head.userData.part = 'head';
    group.add(head);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.7, 6), robeMat);
    hood.position.y = 2.2;
    group.add(hood);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), accentMat);
    lamp.position.set(0.3, 1.25, 0.35);
    group.add(lamp);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.85), new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.5, metalness: 0.6 }));
    gun.position.set(0.3, 1.45, 0.45);
    group.add(gun);
    const light = new THREE.PointLight(accent, 26, 9, 1.8);
    light.position.y = 1.4;
    group.add(light);
    return { group, body, head, lamp, light };
  }

  function makeMate(name, accent, offset) {
    const mesh = buildMateMesh(accent);
    scene.add(mesh.group);
    const mate = {
      name, accent, offset,
      group: mesh.group,
      pos: new THREE.Vector3(2, 0, 16),
      hp: 80, maxHp: 80,
      alive: true, down: false, reviveProgress: 0,
      fireCooldown: 0,
      holdPos: null,
      focusTarget: null,
      state: 'READY',
    };
    mates.push(mate);
    return mate;
  }

  makeMate('BRAM', 0x57d977, new THREE.Vector3(-2.2, 0, 2.5));
  makeMate('SEF', 0x57a8d9, new THREE.Vector3(2.2, 0, 2.5));

  function nearestEnemy(pos, maxDist) {
    let best = null; let bd = maxDist;
    for (const e of G.enemies.list) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (G.boss.active) {
      const d = Math.hypot(G.boss.pos.x - pos.x, G.boss.pos.z - pos.z);
      if (d < bd) { bd = d; best = { kind: 'boss', pos: G.boss.pos, hp: G.boss.hp }; }
    }
    return best;
  }

  return {
    list: mates,
    order: 'FOLLOW',
    cycleOrder() {
      const i = ORDERS.indexOf(this.order);
      this.order = ORDERS[(i + 1) % ORDERS.length];
      if (this.order === 'HOLD') {
        for (const m of mates) m.holdPos = m.pos.clone();
      }
      G.hud.showBanner('SQUAD: ' + this.order, this.order === 'FOLLOW' ? 'Keepers fall in behind you' : this.order === 'HOLD' ? 'Keepers hold this ground' : 'Keepers push to the objective');
      G.audio.click();
    },
    focusFire() {
      // Aim at the nearest enemy to the player's crosshair within 60 m.
      const dir = G.player.lookDir();
      let best = null; let bd = 0.94; // cos of ~20 degrees
      for (const e of G.enemies.list) {
        if (!e.alive) continue;
        const to = new THREE.Vector3(e.pos.x - G.player.pos.x, 1.2 - 1.7, e.pos.z - G.player.pos.z).normalize();
        const dot = to.dot(dir);
        if (dot > bd) { bd = dot; best = e; }
      }
      if (G.boss.active) {
        const to = new THREE.Vector3(G.boss.pos.x - G.player.pos.x, 2 - 1.7, G.boss.pos.z - G.player.pos.z).normalize();
        if (to.dot(dir) > bd) best = { kind: 'boss', pos: G.boss.pos };
      }
      for (const m of mates) m.focusTarget = best;
      if (best) { G.hud.showBanner('FOCUS FIRE', 'Both keepers engage the marked target'); G.audio.click(); }
    },
    damageMate(mate, amount) {
      if (!mate.alive || mate.down) return;
      mate.hp -= amount;
      if (mate.hp <= 0) {
        mate.hp = 0;
        mate.down = true;
        mate.state = 'DOWN';
        mate.group.rotation.z = Math.PI / 2 - 0.15; // fallen over
        mate.group.position.y = 0.3;
        G.hud.showBanner(mate.name + ' IS DOWN', 'Stand near them to revive');
        G.audio.hurt();
      }
    },
    revivePlayer(mate) {
      // Called when a mate reaches the downed player.
      G.player.down = false;
      G.player.hp = Math.max(30, G.player.maxHp * 0.5);
      G.player.pos.y = 0;
      G.hud.showBanner('BACK ON YOUR FEET', mate.name + ' dragged you up');
      G.audio.upgrade();
      G.particles.burst(G.player.pos.clone().setY(1.2), 20, 0x57d977, 3, 3);
    },
    reset() {
      for (const m of mates) {
        m.hp = m.maxHp;
        m.alive = true; m.down = false; m.state = 'READY';
        m.reviveProgress = 0; m.focusTarget = null; m.holdPos = null;
        m.group.rotation.z = 0;
        m.group.position.y = 0;
        m.pos.set(G.player.pos.x + m.offset.x, 0, G.player.pos.z + m.offset.z);
        m.group.position.copy(m.pos);
      }
      this.order = 'FOLLOW';
    },
    update(dt) {
      const playerDown = G.player.down;
      for (const m of mates) {
        if (!m.alive) continue;
        if (m.down) {
          // Revive: the player standing near channels it.
          const d = Math.hypot(G.player.pos.x - m.pos.x, G.player.pos.z - m.pos.z);
          if (d < 3 && !G.player.down && G.input.isDown('KeyF')) {
            m.reviveProgress += dt / (G.upgrades.revive ? 1.5 : 3);
            if (m.reviveProgress >= 1) {
              m.down = false; m.hp = Math.max(30, m.maxHp * 0.6); m.state = 'READY';
              m.group.rotation.z = 0; m.group.position.y = 0;
              G.hud.showBanner(m.name + ' IS BACK UP', 'The squad is whole again');
              G.audio.relight();
              G.particles.burst(m.pos.clone().setY(1.4), 18, m.accent, 3, 3);
            }
          } else {
            m.reviveProgress = Math.max(0, m.reviveProgress - dt * 0.5);
          }
          continue;
        }

        // Destination by order.
        let dest = null;
        if (playerDown) {
          dest = G.player.pos; // go revive the player
        } else if (this.order === 'FOLLOW') {
          dest = new THREE.Vector3(G.player.pos.x + m.offset.x, 0, G.player.pos.z + m.offset.z);
        } else if (this.order === 'HOLD') {
          dest = m.holdPos || m.pos;
        } else {
          dest = G.objectives.currentTarget() || G.player.pos;
        }
        const dist = Math.hypot(dest.x - m.pos.x, dest.z - m.pos.z);
        const speed = 5.2;
        if (dist > 1.2) {
          const nx = m.pos.x + ((dest.x - m.pos.x) / dist) * speed * dt;
          const nz = m.pos.z + ((dest.z - m.pos.z) / dist) * speed * dt;
          if (G.world.onGround(nx, m.pos.z)) m.pos.x = nx;
          if (G.world.onGround(m.pos.x, nz)) m.pos.z = nz;
          m.group.lookAt(dest.x, 0, dest.z);
        }
        // Revive the player on arrival.
        if (playerDown && dist < 2.2) {
          this.revivePlayer(m);
        }
        m.group.position.copy(m.pos);
        // Bob while walking.
        m.group.position.y = dist > 1.2 ? Math.abs(Math.sin(G.time * 9 + m.offset.x)) * 0.08 : 0;

        // Engage the nearest enemy (or the focus target).
        m.fireCooldown -= dt;
        let target = m.focusTarget;
        if (!target || (target.kind !== 'boss' && !target.alive)) {
          m.focusTarget = null;
          target = nearestEnemy(m.pos, 34);
        }
        if (target && m.fireCooldown <= 0) {
          const tPos = target.pos.clone(); tPos.y = 1.2;
          const from = m.pos.clone(); from.y = 1.45;
          const dir = tPos.clone().sub(from).normalize();
          const distT = from.distanceTo(tPos);
          if (distT < 34) {
            m.fireCooldown = 0.42;
            const res = G.weapons.fire({
              origin: from, dir,
              damage: 13 * (G.upgrades.squad ? 1.4 : 1),
              spread: 0.03, owner: 'mate',
            });
            G.weapons.tracer(from, res.point);
            if (res.hit && target.kind !== 'boss') {
              G.particles.damageNumber(res.point, String(res.damage), '');
            }
          }
        }
        // Slow heal in the light, like the player.
        if (G.lanterns.bonusAt(m.pos) > 0.5) m.hp = Math.min(m.maxHp, m.hp + 1.5 * dt);
      }
    },
  };
}
