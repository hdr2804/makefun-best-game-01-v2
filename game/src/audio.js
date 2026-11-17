// Procedural WebAudio sound: every effect is synthesised, no audio files.
// A small step sequencer plays a dark music bed whose intensity follows the phase.
// Everything is guarded: with no AudioContext (headless shots) every call is a no-op.
export function createAudio(G) {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let volume = 0.7;
  let musicTimer = null;
  let step = 0;
  let intensity = 0.25; // 0 calm .. 1 battle
  let noiseBuffer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
      const len = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      startMusic();
      return true;
    } catch (_) { return false; }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, type, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // Minor-key bass line with a slow pad; a kick on the beat when intensity is high.
  const BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 0, 73.42, 0];
  const PAD = [220, 261.63, 329.63];
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = setInterval(() => {
      if (muted || !ctx) return;
      const t0 = ctx.currentTime;
      const bass = BASS[step % BASS.length];
      if (bass) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = bass;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
        o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 0.55);
      }
      if (step % 16 === 0) {
        PAD.forEach((f) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.05, t0 + 1.2);
          g.gain.linearRampToValueAtTime(0.0001, t0 + 3.8);
          o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 4);
        });
      }
      if (intensity > 0.55 && step % 2 === 0) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(120, t0);
        o.frequency.exponentialRampToValueAtTime(38, t0 + 0.12);
        g.gain.setValueAtTime(0.5 * intensity, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 0.2);
      }
      step++;
    }, 240);
  }

  return {
    resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : volume; },
    get muted() { return muted; },
    setVolume(v) { volume = v; if (master && !muted) master.gain.value = v; },
    setIntensity(x) { intensity = Math.max(0, Math.min(1, x)); },
    shoot() { noise(0.09, 0.5, 2600, 'highpass'); tone(190, 0.08, 'square', 0.16, 70); },
    dryFire() { tone(1200, 0.04, 'square', 0.08); },
    reload() { tone(500, 0.06, 'square', 0.12, 300); tone(700, 0.06, 'square', 0.12, 900, 0.12); },
    hit(crit) { tone(crit ? 1400 : 900, 0.07, 'sine', crit ? 0.3 : 0.18, crit ? 900 : 600); },
    kill() { tone(520, 0.16, 'triangle', 0.25, 130); noise(0.2, 0.2, 900); },
    hurt() { tone(140, 0.22, 'sawtooth', 0.3, 60); noise(0.15, 0.25, 500); },
    grenadeThrow() { noise(0.25, 0.2, 700, 'bandpass'); },
    explosion() { noise(0.7, 0.7, 320); tone(70, 0.6, 'sine', 0.5, 28); },
    relight() { tone(660, 0.12, 'sine', 0.2); tone(880, 0.2, 'sine', 0.2, null, 0.1); tone(1320, 0.3, 'sine', 0.16, null, 0.2); },
    snuff() { tone(300, 0.4, 'sine', 0.2, 90); },
    pickup() { tone(980, 0.08, 'sine', 0.18); tone(1240, 0.1, 'sine', 0.18, null, 0.07); },
    click() { tone(800, 0.05, 'square', 0.12); },
    upgrade() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, null, i * 0.07)); },
    bossRoar() { tone(90, 1.1, 'sawtooth', 0.4, 45); noise(1.0, 0.3, 400); tone(55, 1.2, 'square', 0.25, 40, 0.1); },
    wave() { tone(180, 0.5, 'sawtooth', 0.22, 70); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, null, i * 0.12)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, 'triangle', 0.22, null, i * 0.18)); },
    step() { noise(0.05, 0.06, 400); },
  };
}
