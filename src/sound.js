// Synthesized firecracker sounds with the Web Audio API — no audio files needed.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // Continuous loops whose volume we ride (sparkler hiss, anar roar, chakri whirr)
    this.loops = {
      hiss: this._loop('highpass', 4200, 0.7),
      roar: this._loop('bandpass', 1100, 0.5),
      whirr: this._loop('bandpass', 2800, 3),
    };
  }

  _loop(type, freq, q) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    s.connect(f).connect(g).connect(this.master);
    s.start();
    return { g, f, level: 0 };
  }

  setLevel(name, v) {
    if (!this.ctx) return;
    const l = this.loops[name];
    if (Math.abs(l.level - v) < 0.001) return;
    l.level = v;
    l.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
  }

  pulseLoop(name, v, dur) {
    if (!this.ctx) return;
    const l = this.loops[name];
    const t = this.ctx.currentTime;
    l.g.gain.cancelScheduledValues(t);
    l.g.gain.setTargetAtTime(v, t, 0.05);
    l.g.gain.setTargetAtTime(0, t + dur, 0.15);
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    if (m) window.speechSynthesis?.cancel();
  }

  _out(pan = 0) {
    const ctx = this.ctx;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      p.connect(this.master);
      return p;
    }
    return this.master;
  }

  _noise(t, dur, offset = Math.random()) {
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    n.start(t, offset);
    n.stop(t + dur);
    return n;
  }

  // Deep firework / bomb boom
  boom(size = 1, pan = 0, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const out = this._out(pan);
    const amp = Math.min(size, 1.6);

    const n = this._noise(t, 1.9 * size + 0.1);
    n.playbackRate.value = rand(0.5, 0.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200 * size, t);
    f.frequency.exponentialRampToValueAtTime(110, t + 1.2 * size);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * amp, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.7 * size);
    n.connect(f).connect(g).connect(out);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.9 * amp, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.7 * size);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + size + 0.2);
  }

  // Sharp little cracker pop
  pop(pan = 0, vol = 0.5, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const n = this._noise(t, 0.12);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = rand(900, 1800);
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(f).connect(g).connect(this._out(pan));
  }

  // Glittery crackle (many tiny clicks)
  crackle(count = 30, dur = 1, pan = 0, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const out = this._out(pan);
    const base = ctx.currentTime + delay;
    for (let i = 0; i < count; i++) {
      const t = base + Math.random() * dur;
      const n = this._noise(t, 0.04);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = rand(2500, 7500);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(rand(0.08, 0.3), t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      n.connect(f).connect(g).connect(out);
    }
  }

  // Rising rocket whistle
  whistle(dur = 1, pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(rand(500, 700), t);
    o.frequency.exponentialRampToValueAtTime(rand(1800, 2600), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.05);
    g.gain.setValueAtTime(0.045, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this._out(pan));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Festive arpeggio for the finale
  chime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
    notes.forEach((fr, i) => {
      const t = ctx.currentTime + i * 0.11;
      for (const type of ['sine', 'triangle']) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = fr * (type === 'triangle' ? 2 : 1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(type === 'sine' ? 0.12 : 0.03, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 1.9);
      }
    });
  }

  speak(text) {
    if (this.muted || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === 'en-IN') || voices.find((v) => v.lang?.startsWith('en'));
    if (v) u.voice = v;
    u.rate = 0.9;
    u.pitch = 1.1;
    u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}
