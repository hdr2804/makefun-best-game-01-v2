// Boot: read the query parameters (?shot=title|play|boss|victory&seed=N),
// create the game, and surface any load error on the page itself so a
// headless screenshot run fails loudly instead of silently.
import { createGame } from './main.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 20261117) || 20261117;

window.addEventListener('error', (e) => {
  const el = document.createElement('div');
  el.id = 'fatal-error';
  el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;background:#400;color:#fff;padding:10px;font:14px monospace;white-space:pre-wrap;max-width:90vw';
  el.textContent = 'ERROR: ' + (e.message || e.error);
  document.body.appendChild(el);
  window.__shotError = String(e.message || e.error);
});

try {
  const canvas = document.getElementById('game');
  window.__game = createGame(canvas, { shot, seed });
} catch (err) {
  window.__shotError = String(err && err.message || err);
  throw err;
}
