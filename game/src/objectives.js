// Objectives: the run state machine. Title -> Relight (3 lanterns) -> Defend
// (beacon charges) -> upgrade cards -> Boss (Gloom Herald) -> Extract ->
// Victory. Also tracks score, kills, accuracy and the beacon's health.
import * as THREE from 'three';

const UPGRADE_POOL = [
  { id: 'mag', icon: '🔋', name: 'DEEP MAG', desc: '+8 rounds per magazine. Fewer reloads, more lantern-light.' },
  { id: 'plating', icon: '🛡️', name: 'KEEPER PLATING', desc: '+30 max health and heal 30 now. The dark bites softer.' },
  { id: 'lantern', icon: '🏮', name: 'BRIGHT LANTERNS', desc: 'Lantern light radius +40% and the light bonus doubles.' },
  { id: 'grenades', icon: '💣', name: 'GRENADE SATCHEL', desc: '+2 grenade capacity. More thunder for the shadows.' },
  { id: 'squad', icon: '⚔️', name: 'DRILLED SQUAD', desc: 'Bram and Sef deal +40% damage and revive faster.' },
  { id: 'revive', icon: '✚', name: 'FIELD MEDIC', desc: 'Revives take half the time and restore more health.' },
  { id: 'swift', icon: '💨', name: 'SWIFT BOOTS', desc: '+12% move speed. Outrun the dark.' },
  { id: 'damage', icon: '🎯', name: 'DEADEYE', desc: '+15% rifle damage on every hit.' },
];

export function createObjectives(G) {
  const o = {
    phase: 'title', // title | relight | defend | upgrade | boss | extract | victory | defeat
    score: 0, kills: 0, shotsFired: 0, shotsHit: 0,
    time: 0, startTime: 0,
    beaconHp: 500, beaconMaxHp: 500,
    charge: 0, extractTimer: 0,
    spawnTimer: 0, waveTimer: 0, wave: 0,
    lanternsRelit: 0,
    lastScoreNote: '',
  };

  function banner(title, sub) { G.hud.showBanner(title, sub); }

  function setPhase(phase) {
    o.phase = phase;
    G.audio.setIntensity(phase === 'defend' || phase === 'boss' ? 0.85 : phase === 'relight' || phase === 'extract' ? 0.55 : 0.25);
  }

  function startRun() {
    G.enemies.clear();
    G.boss.clear();
    G.grenades.clear();
    G.upgrades = {};
    o.score = 0; o.kills = 0; o.shotsFired = 0; o.shotsHit = 0;
    o.time = 0; o.startTime = G.time;
    o.beaconHp = o.beaconMaxHp;
    o.charge = 0; o.extractTimer = 0;
    o.spawnTimer = 4; o.waveTimer = 0; o.wave = 0;
    o.lanternsRelit = 0;
    for (const lan of G.lanterns.list) G.lanterns.setLit(lan, false);
    G.player.reset(new THREE.Vector3(0, 0, 14));
    G.squad.reset();
    G.world.setPadVisible(false);
    setPhase('relight');
    G.hud.showObjective('RELIGHT THE LANTERNS', 'Find the three snuffed lanterns and hold F to relight them');
    banner('RELIGHT THE LANTERNS', 'Three lanterns are dark — the shadows are already moving');
    G.audio.setIntensity(0.55);
  }

  function offerUpgrade() {
    setPhase('upgrade');
    const available = UPGRADE_POOL.filter((u) => !G.upgrades[u.id]);
    const picks = G.rng.shuffle(available).slice(0, 3);
    G.menus.showUpgrade(picks, (pick) => {
      G.upgrades[pick.id] = true;
      if (pick.id === 'damage') G.upgrades.damageMul = (G.upgrades.damageMul || 1) * 1.15;
      if (pick.id === 'lantern') G.upgrades.lanternMul = 2;
      if (pick.id === 'plating') G.player.heal(30);
      G.player.applyUpgrades();
      G.audio.upgrade();
      resumeAfterUpgrade();
    });
  }

  function resumeAfterUpgrade() {
    if (o.phase === 'upgrade') {
      if (o.lanternsRelit >= 3 && o.charge < 100) {
        setPhase('defend');
        G.hud.showObjective('DEFEND THE BEACON', 'Hold the tower while the beacon charges to 100%');
        banner('DEFEND THE BEACON', 'The charge has begun — nothing gets through');
      } else {
        setPhase('boss');
        G.hud.showObjective('SLAY THE GLOOM HERALD', 'The boss has come. End it, then run for the pad');
        G.boss.spawn();
      }
    }
  }

  return {
    ...o,
    get phase() { return o.phase; },
    get score() { return o.score; },
    set score(v) { o.score = v; },
    get kills() { return o.kills; },
    set kills(v) { o.kills = v; },
    get shotsFired() { return o.shotsFired; },
    get shotsHit() { return o.shotsHit; },
    set shotsFired(v) { o.shotsFired = v; },
    set shotsHit(v) { o.shotsHit = v; },
    get beaconHp() { return o.beaconHp; },
    get beaconMaxHp() { return o.beaconMaxHp; },
    get charge() { return o.charge; },
    get extractTimer() { return o.extractTimer; },
    // Test/shot hook: set run state directly (used by deterministic shot scenes).
    debugSet(patch) { Object.assign(o, patch); },
    startRun,
    addScore(n, note) {
      o.score += n;
      o.lastScoreNote = note || '';
      G.hud.setScore(o.score, note || '');
    },
    damageBeacon(amount) {
      if (o.phase === 'victory' || o.phase === 'defeat' || o.phase === 'title') return;
      o.beaconHp -= amount;
      if (o.beaconHp <= 0) {
        o.beaconHp = 0;
        this.defeat('The beacon was destroyed. The light is gone.');
      }
    },
    onLanternRelit(lan) {
      o.lanternsRelit += 1;
      this.addScore(50, 'Lantern relit');
      if (o.lanternsRelit >= 3) {
        banner('ALL LANTERNS BURN', 'The beacon stirs — defend it while it charges');
        offerUpgrade();
      } else {
        G.hud.showObjective('RELIGHT THE LANTERNS', (3 - o.lanternsRelit) + ' lantern' + (3 - o.lanternsRelit > 1 ? 's' : '') + ' still dark');
      }
    },
    onBossSlain() {
      setPhase('extract');
      o.extractTimer = 45;
      G.hud.showObjective('EXTRACT', 'Reach the glowing pad before the light fades');
      banner('EXTRACT NOW', 'The pad is lit — run, keeper, run');
      G.world.setPadVisible(true);
      G.audio.setIntensity(0.7);
    },
    victory() {
      if (o.phase === 'victory') return;
      setPhase('victory');
      const timeBonus = Math.max(0, Math.round((900 - (G.time - o.startTime)) * 2));
      o.score += timeBonus;
      G.audio.win();
      G.input.unlockPointer();
      const acc = o.shotsFired ? Math.round((o.shotsHit / o.shotsFired) * 100) : 0;
      G.menus.showResults({
        title: 'THE BEACON ENDURES',
        sub: 'Dawn breaks over the islands. The keepers did it.',
        rows: [
          ['Creatures slain', String(o.kills)],
          ['Lanterns relit', String(o.lanternsRelit) + ' / 3'],
          ['Accuracy', acc + '%'],
          ['Time', fmtTime(G.time - o.startTime)],
          ['Time bonus', '+' + timeBonus],
          ['FINAL SCORE', String(o.score)],
        ],
      });
    },
    defeat(reason) {
      if (o.phase === 'defeat') return;
      setPhase('defeat');
      G.audio.lose();
      G.input.unlockPointer();
      const acc = o.shotsFired ? Math.round((o.shotsHit / o.shotsFired) * 100) : 0;
      G.menus.showDefeat({
        sub: reason,
        rows: [
          ['Creatures slain', String(o.kills)],
          ['Lanterns relit', String(o.lanternsRelit) + ' / 3'],
          ['Accuracy', acc + '%'],
          ['Time survived', fmtTime(G.time - o.startTime)],
          ['SCORE', String(o.score)],
        ],
      });
    },
    // The compass target: the current objective's position.
    currentTarget() {
      if (o.phase === 'relight') {
        for (const lan of G.lanterns.list) {
          if (!lan.lit) return lan.pos;
        }
        return new THREE.Vector3(0, 0, 0);
      }
      if (o.phase === 'boss') return G.boss.pos;
      if (o.phase === 'extract') return G.world.padPos;
      return new THREE.Vector3(0, 0, 0);
    },
    update(dt) {
      if (o.phase === 'title' || o.phase === 'victory' || o.phase === 'defeat' || o.phase === 'upgrade') return;
      o.time += dt;
      // Spawning director.
      o.spawnTimer -= dt;
      if (o.spawnTimer <= 0) {
        if (o.phase === 'relight') { o.spawnTimer = 6; G.enemies.spawnWave('relight'); }
        else if (o.phase === 'defend') { o.spawnTimer = 11; o.wave += 1; G.enemies.spawnWave('defend'); }
        else if (o.phase === 'boss') { o.spawnTimer = 9; G.enemies.spawnWave('boss'); }
        else { o.spawnTimer = 6; }
      }
      if (o.phase === 'defend') {
        o.charge = Math.min(100, o.charge + dt * (100 / 95));
        if (o.charge >= 100) {
          banner('THE BEACON IS CHARGED', 'Something vast is coming — choose your upgrade');
          offerUpgrade();
        }
      }
      if (o.phase === 'extract') {
        o.extractTimer -= dt;
        const d = Math.hypot(G.player.pos.x - G.world.padPos.x, G.player.pos.z - G.world.padPos.z);
        if (d < 3.2) {
          this.addScore(200, 'Extracted');
          this.victory();
          return;
        }
        if (o.extractTimer <= 0) this.defeat('The light faded before you reached the pad.');
      }
      // Whole squad down while the player is down: the run ends.
      if (G.player.down) {
        const anyMateUp = G.squad.list.some((m) => !m.down);
        if (!anyMateUp) {
          G.player.alive = false;
          this.defeat('The whole squad fell in the dark.');
        }
      }
    },
  };

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return m + ':' + String(ss).padStart(2, '0');
  }
}
