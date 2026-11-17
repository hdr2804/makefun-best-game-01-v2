// Keyboard and mouse input with pointer lock. Edge-triggered actions are queued
// and consumed once by the game loop, so a key press is never read twice.
export function createInput(G) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered keys, cleared each frame by consume()
  let mouseDX = 0;
  let mouseDY = 0;
  let mouseDown = false;
  let locked = false;
  const canvas = G.canvas;

  const KEY_ACTIONS = {
    KeyR: 'reload', KeyG: 'grenade', KeyF: 'interact', KeyQ: 'order',
    KeyX: 'focus', KeyM: 'mute', Escape: 'pause', Space: 'jump',
  };

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (KEY_ACTIONS[e.code]) pressed.add(KEY_ACTIONS[e.code]);
    if (e.code === 'Space') e.preventDefault();
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onMouseMove(e) {
    if (!locked) return;
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
  }
  function onMouseDown(e) {
    if (e.button === 0) mouseDown = true;
  }
  function onMouseUp(e) {
    if (e.button === 0) mouseDown = false;
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    get locked() { return locked; },
    isDown(code) { return keys.has(code); },
    get mouseDown() { return mouseDown; },
    // Movement axes from WASD, normalised.
    moveAxis() {
      let x = 0; let z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, z);
      if (len > 0) { x /= len; z /= len; }
      return { x, z };
    },
    get sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    // One-shot action: true once per physical press.
    consume(action) {
      if (pressed.has(action)) { pressed.delete(action); return true; }
      return false;
    },
    // Mouse deltas since last frame, then zeroed.
    takeMouse() {
      const dx = mouseDX; const dy = mouseDY;
      mouseDX = 0; mouseDY = 0;
      return { dx, dy };
    },
    lockPointer() {
      if (G.shot) return; // shot scenes never lock the pointer
      try {
        const p = canvas.requestPointerLock({ unadjustedMovement: true });
        if (p && p.catch) p.catch(() => { try { canvas.requestPointerLock(); } catch (_) { /* ignore */ } });
      } catch (_) {
        try { canvas.requestPointerLock(); } catch (__) { /* ignore */ }
      }
    },
    unlockPointer() {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    clearFrame() { pressed.clear(); },
  };
}
