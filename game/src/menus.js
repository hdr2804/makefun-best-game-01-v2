// Menus: title, pause, upgrade cards, victory results and defeat. Each menu
// is a DOM overlay; the game mode switches with it. Best score in localStorage.
export function createMenus(G) {
  const $ = (id) => document.getElementById(id);
  const BEST_KEY = 'lanternfall-best-score';

  function bestScore() {
    try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch (_) { return 0; }
  }
  function saveBest(score) {
    try {
      if (score > bestScore()) localStorage.setItem(BEST_KEY, String(score));
    } catch (_) { /* ignore */ }
  }

  function showOnly(id) {
    for (const m of ['menu-title', 'menu-pause', 'menu-upgrade', 'menu-results', 'menu-defeat']) {
      $(m).classList.toggle('hidden', m !== id);
    }
    if (!id) {
      for (const m of ['menu-title', 'menu-pause', 'menu-upgrade', 'menu-results', 'menu-defeat']) $(m).classList.add('hidden');
    }
  }

  function fillRows(elId, rows) {
    $(elId).innerHTML = rows.map(([k, v]) => '<div><span>' + k + '</span><span>' + v + '</span></div>').join('');
  }

  let difficulty = 'flare';
  const DIFFS = {
    ember: { enemyHp: 0.8, enemyDmg: 0.8, label: 'EMBER' },
    flare: { enemyHp: 1.0, enemyDmg: 1.0, label: 'FLARE' },
    blaze: { enemyHp: 1.35, enemyDmg: 1.3, label: 'BLAZE' },
  };

  function bind() {
    $('btn-start').addEventListener('click', () => {
      G.audio.resume();
      G.audio.click();
      G.difficulty = DIFFS[difficulty];
      G.difficultyKey = difficulty;
      G.mode = 'playing';
      showOnly(null);
      G.hud.show();
      G.input.lockPointer();
      G.objectives.startRun();
    });
    document.querySelectorAll('.diff-btn').forEach((b) => {
      b.addEventListener('click', () => {
        difficulty = b.dataset.diff;
        document.querySelectorAll('.diff-btn').forEach((x) => x.classList.toggle('selected', x === b));
        G.audio.click();
      });
    });
    $('btn-resume').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'playing';
      showOnly(null);
      G.input.lockPointer();
    });
    $('btn-restart-pause').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'playing';
      showOnly(null);
      G.hud.show();
      G.input.lockPointer();
      G.objectives.startRun();
    });
    $('btn-quit-pause').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'title';
      G.input.unlockPointer();
      showOnly('menu-title');
      G.hud.hide();
    });
    $('btn-again').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'playing';
      showOnly(null);
      G.hud.show();
      G.input.lockPointer();
      G.objectives.startRun();
    });
    $('btn-retry').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'playing';
      showOnly(null);
      G.hud.show();
      G.input.lockPointer();
      G.objectives.startRun();
    });
    $('btn-title-results').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'title';
      showOnly('menu-title');
      G.hud.hide();
    });
    $('btn-title-defeat').addEventListener('click', () => {
      G.audio.click();
      G.mode = 'title';
      showOnly('menu-title');
      G.hud.hide();
    });
    $('vol-slider').addEventListener('input', (e) => G.audio.setVolume(Number(e.target.value) / 100));
    $('sens-slider').addEventListener('input', (e) => { G.settings.sens = Number(e.target.value) / 100; });
    $('best-score').textContent = String(bestScore());
  }

  return {
    bind,
    showTitle() {
      G.mode = 'title';
      $('best-score').textContent = String(bestScore());
      showOnly('menu-title');
      G.hud.hide();
    },
    hideAll() { showOnly(null); },
    showPause() {
      G.mode = 'paused';
      G.input.unlockPointer();
      showOnly('menu-pause');
    },
    showUpgrade(picks, onPick) {
      G.mode = 'upgrade';
      G.input.unlockPointer();
      const wrap = $('upgrade-cards');
      wrap.innerHTML = '';
      picks.forEach((pick) => {
        const card = document.createElement('div');
        card.className = 'up-card';
        card.innerHTML = '<div class="up-icon">' + pick.icon + '</div><div class="up-name">' + pick.name + '</div><div class="up-desc">' + pick.desc + '</div>';
        card.addEventListener('click', () => { onPick(pick); showOnly(null); G.input.lockPointer(); G.mode = 'playing'; });
        wrap.appendChild(card);
      });
      showOnly('menu-upgrade');
    },
    showResults(data) {
      saveBest(G.objectives.score);
      $('results-title').textContent = data.title;
      $('results-sub').textContent = data.sub;
      fillRows('results-rows', data.rows);
      $('results-best').textContent = String(bestScore());
      showOnly('menu-results');
      G.hud.hide();
    },
    showDefeat(data) {
      saveBest(G.objectives.score);
      $('defeat-sub').textContent = data.sub;
      fillRows('defeat-rows', data.rows);
      showOnly('menu-defeat');
      G.hud.hide();
    },
  };
}
