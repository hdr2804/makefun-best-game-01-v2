// The HUD: health, ammo, grenades, squad status, objective, beacon charge,
// score, compass, hitmarker, banners and the damage-direction vignette.
// All DOM lookups happen once at creation.
import * as THREE from 'three';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'), hpBar: $('hp-bar'), hpNum: $('hp-num'),
    ammo: $('ammo'), reloadHint: $('reload-hint'), grenades: $('grenades'),
    lightBox: $('light-box'), lightText: $('light-text'),
    score: $('score'), scoreSub: $('score-sub'),
    objectiveTitle: $('objective-title'), objectiveText: $('objective-text'),
    chargeWrap: $('charge-wrap'), chargeBar: $('charge-bar'), chargeNum: $('charge-num'),
    compassStrip: $('compass-strip'),
    timerBox: $('timer-box'), timer: $('timer'),
    orderText: $('order-text'),
    interactPrompt: $('interact-prompt'),
    banner: $('banner'),
    hitmarker: $('hitmarker'),
    vignette: $('vignette'),
    bossWrap: $('boss-bar-wrap'), bossFill: $('boss-fill'),
  };
  let bannerTimer = null;
  let hitTimer = null;
  const COMPASS_MARKS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  function bearingTo(target) {
    // Compass bearing of a target from the player, in degrees (0 = north = -Z).
    const dx = target.x - G.player.pos.x;
    const dz = target.z - G.player.pos.z;
    return (Math.atan2(dx, -dz) * 180) / Math.PI;
  }

  return {
    show() { el.hud.classList.remove('hidden'); },
    hide() { el.hud.classList.add('hidden'); },
    showBanner(title, sub) {
      el.banner.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
      el.banner.classList.remove('hidden');
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => el.banner.classList.add('hidden'), 3200);
    },
    showObjective(title, text) {
      el.objectiveTitle.textContent = title;
      el.objectiveText.textContent = text;
    },
    setScore(score, note) {
      el.score.textContent = String(score);
      if (note) el.scoreSub.textContent = note;
    },
    showHitmarker(crit) {
      el.hitmarker.classList.add('show');
      el.hitmarker.classList.toggle('crit', !!crit);
      if (hitTimer) clearTimeout(hitTimer);
      hitTimer = setTimeout(() => el.hitmarker.classList.remove('show'), 90);
    },
    flashHurt(fromPos) {
      el.vignette.classList.add('hurt');
      setTimeout(() => el.vignette.classList.remove('hurt'), 220);
      void fromPos;
    },
    showBossBar(show) { el.bossWrap.classList.toggle('hidden', !show); },
    update(dt) {
      const p = G.player;
      const pct = Math.max(0, (p.hp / p.maxHp) * 100);
      el.hpBar.style.width = pct + '%';
      el.hpNum.textContent = String(Math.ceil(p.hp));
      el.hpBar.style.background = pct > 50
        ? 'linear-gradient(90deg,#ff5a3c,#ffb02e)'
        : pct > 25 ? 'linear-gradient(90deg,#e33,#ff5a3c)' : '#e33';
      el.ammo.textContent = String(p.ammo);
      el.reloadHint.classList.toggle('hidden', !p.reloading);
      el.grenades.textContent = String(p.grenades);
      const inLight = p.inLight > 0.5;
      el.lightBox.classList.toggle('dark', !inLight);
      el.lightText.textContent = inLight ? 'IN THE LIGHT — +DMG · HEALING' : p.inLight > 0.05 ? 'EDGE OF THE LIGHT' : 'IN DARKNESS — DRAINING';
      el.vignette.classList.toggle('lit', inLight);
      // Squad.
      G.squad.list.forEach((m, i) => {
        const box = document.getElementById('mate-' + i);
        if (!box) return;
        box.classList.toggle('down', m.down);
        box.querySelector('.mate-hp-fill').style.width = Math.max(0, (m.hp / m.maxHp) * 100) + '%';
        box.querySelector('.mate-state').textContent = m.down
          ? (m.reviveProgress > 0 ? 'REVIVING ' + Math.round(m.reviveProgress * 100) + '%' : 'DOWN — HOLD F NEARBY')
          : 'READY';
      });
      el.orderText.textContent = G.squad.order;
      // Objective + charge.
      const phase = G.objectives.phase;
      el.chargeWrap.classList.toggle('hidden', phase !== 'defend');
      if (phase === 'defend') {
        el.chargeBar.style.width = G.objectives.charge + '%';
        el.chargeNum.textContent = Math.floor(G.objectives.charge) + '%';
      }
      el.timerBox.classList.toggle('hidden', phase !== 'extract');
      if (phase === 'extract') {
        const t = Math.max(0, G.objectives.extractTimer);
        el.timer.textContent = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
      }
      // Boss bar.
      if (G.boss.active) {
        el.bossFill.style.width = Math.max(0, (G.boss.hp / G.boss.maxHp) * 100) + '%';
      }
      // Compass: a repeating strip of bearing marks; the player's heading sits
      // under the centre needle, and a diamond marks the objective's bearing.
      const heading = (((-G.player.yaw * 180) / Math.PI % 360) + 360) % 360;
      const target = G.objectives.currentTarget();
      const tb = bearingTo(target);
      let strip = '';
      for (let k = 0; k < 24; k++) {
        const b = k * 45;
        const mark = COMPASS_MARKS[k % 8];
        const isTarget = Math.abs((((tb - b + 540) % 360) - 180)) < 22.5;
        strip += '<span style="display:inline-block;width:60px;text-align:center;color:' + (isTarget ? '#ffb02e' : '#9fb8dd') + '">' + (isTarget ? '◆ ' : '') + mark + '</span>';
      }
      el.compassStrip.innerHTML = strip;
      // Span k centres on bearing k*45 at pixel k*60+30; put the heading at 130.
      el.compassStrip.style.transform = 'translateX(' + (100 - (heading / 45) * 60) + 'px)';
      // Interact prompt (relight or revive).
      const nearSnuffed = G.lanterns.list.some((l) => !l.lit && Math.hypot(p.pos.x - l.pos.x, p.pos.z - l.pos.z) < 3.2);
      const nearDownMate = G.squad.list.some((m) => m.down && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 3);
      const showPrompt = (nearSnuffed || nearDownMate) && !p.down && G.mode === 'playing';
      el.interactPrompt.classList.toggle('hidden', !showPrompt);
      if (showPrompt) {
        el.interactPrompt.innerHTML = nearDownMate
          ? 'Hold <b>F</b> — Revive ' + (G.squad.list.find((m) => m.down) || {}).name
          : 'Hold <b>F</b> — Relight lantern' + (p.relightTarget ? ' ' + Math.round(p.relightProgress * 100) + '%' : '');
      }
      void dt; void THREE;
    },
  };
}
