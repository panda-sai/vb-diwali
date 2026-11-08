// Canvas particle engine for Diwali crackers.
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const MAX_PARTICLES = 9000;

// random direction on a sphere, projected to 2D (gives a nice filled burst)
function sph() {
  const z = rand(-1, 1);
  const t = rand(0, TAU);
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(t), r * Math.sin(t)];
}

export class Fireworks {
  constructor(canvas, hud, sound) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;
    this.hctx = hud.getContext('2d');
    this.sound = sound;
    this.parts = [];
    this.rockets = [];
    this.emitters = [];
    this.flashes = [];
    this.rings = [];
    this.segments = [];
    this.textParts = [];
    this.sources = { anar: [], sparkler: [] };
    this.prevSpark = new Map();
    this.time = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = innerWidth;
    this.H = innerHeight;
    for (const c of [this.canvas, this.hud]) {
      c.width = Math.round(this.W * dpr);
      c.height = Math.round(this.H * dpr);
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.S = Math.max(0.6, Math.min(this.W, this.H) / 750);
  }

  pan(x) {
    return (x / this.W) * 2 - 1;
  }

  spark(x, y, vx, vy, o = {}) {
    if (this.parts.length >= MAX_PARTICLES) return null;
    const life = o.life ?? 1;
    const p = {
      x, y, px: x, py: y, vx, vy,
      life, max: life,
      hue: o.hue ?? 40,
      sat: o.sat ?? 100,
      lum: o.lum ?? 60,
      size: o.size ?? 2,
      drag: o.drag ?? 0.98,
      grav: o.grav ?? 0.04 * this.S,
      flicker: o.flicker ?? 0,
      trail: o.trail ?? 0,
      branch: o.branch ?? 0,
      split: o.split ?? 0,
      splitHue: o.splitHue ?? o.hue ?? 40,
    };
    this.parts.push(p);
    return p;
  }

  flash(x, y, r, hue = 40, life = 0.35, a = 0.55) {
    this.flashes.push({ x, y, r, hue, life, max: life, a });
  }

  // ---------- Crackers ----------

  rocket({ x0, y0, tx, ty, pattern = 'peony', hue = rand(0, 360), power = 1, silent = false }) {
    const S = this.S;
    const g = 0.08 * S;
    x0 ??= rand(this.W * 0.1, this.W * 0.9);
    y0 ??= this.H + 10;
    tx ??= x0;
    ty = Math.min(ty ?? rand(this.H * 0.12, this.H * 0.35), y0 - 60);
    const vy = -Math.sqrt(2 * g * (y0 - ty)) * 1.02;
    const frames = -vy / g;
    const vx = (tx - x0) / frames;
    this.rockets.push({ x: x0, y: y0, px: x0, py: y0, vx, vy, grav: g, ty, pattern, hue, power });
    if (!silent) this.sound.whistle(Math.min(frames / 60, 1.6), this.pan(x0));
  }

  explode(x, y, pattern = 'peony', hue = rand(0, 360), power = 1) {
    const S = this.S * power;
    const pan = this.pan(x);
    this.flash(x, y, 160 * S, hue);
    this.sound.boom(0.7 + 0.35 * power, pan);

    switch (pattern) {
      case 'peony': {
        const hue2 = (hue + rand(40, 180)) % 360;
        for (let i = 0; i < 160; i++) {
          const [dx, dy] = sph();
          const sp = rand(5.6, 6.4) * S;
          this.spark(x, y, dx * sp, dy * sp, {
            life: rand(1.3, 1.9), hue: i % 3 ? hue : hue2, lum: rand(55, 72),
            size: 2.2, drag: 0.965, grav: 0.05 * this.S, flicker: 0.08,
          });
        }
        break;
      }
      case 'multi': {
        for (let i = 0; i < 180; i++) {
          const [dx, dy] = sph();
          const sp = rand(5, 6.6) * S;
          this.spark(x, y, dx * sp, dy * sp, {
            life: rand(1.3, 2), hue: rand(0, 360), lum: rand(55, 70),
            size: 2.2, drag: 0.965, grav: 0.05 * this.S, flicker: 0.1,
          });
        }
        break;
      }
      case 'ring':
      case 'rainbow': {
        const n = 110;
        const tilt = rand(0.3, 1);
        const rot = rand(0, TAU);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          let dx = Math.cos(a), dy = Math.sin(a) * tilt;
          [dx, dy] = [dx * Math.cos(rot) - dy * Math.sin(rot), dx * Math.sin(rot) + dy * Math.cos(rot)];
          const sp = 6.2 * S;
          this.spark(x, y, dx * sp, dy * sp, {
            life: rand(1.5, 1.9), hue: pattern === 'rainbow' ? (i / n) * 360 : hue,
            lum: 62, size: 2.4, drag: 0.962, grav: 0.035 * this.S,
          });
        }
        for (let i = 0; i < 50; i++) {
          const [dx, dy] = sph();
          const sp = rand(1, 2.5) * S;
          this.spark(x, y, dx * sp, dy * sp, { life: rand(1, 1.5), hue: 45, sat: 60, lum: 80, size: 1.6, drag: 0.96, flicker: 0.4 });
        }
        break;
      }
      case 'heart': {
        const n = 120;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * TAU;
          const hx = 16 * Math.sin(t) ** 3;
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const sp = 0.36 * S;
          this.spark(x, y, hx * sp, hy * sp, {
            life: rand(1.7, 2.1), hue: rand(330, 352), lum: rand(60, 72),
            size: 2.5, drag: 0.955, grav: 0.012 * this.S,
          });
        }
        for (let i = 0; i < 40; i++) {
          const [dx, dy] = sph();
          const sp = rand(0.5, 2.5) * S;
          this.spark(x, y, dx * sp, dy * sp, { life: rand(1, 1.6), hue: 0, sat: 0, lum: 95, size: 1.3, drag: 0.95, flicker: 0.5 });
        }
        break;
      }
      case 'willow': {
        for (let i = 0; i < 120; i++) {
          const [dx, dy] = sph();
          const sp = rand(3.8, 5) * S;
          this.spark(x, y, dx * sp, dy * sp, {
            life: rand(2.6, 3.6), hue: rand(36, 46), sat: 85, lum: rand(48, 60),
            size: 1.9, drag: 0.975, grav: 0.035 * this.S, trail: 0.25,
          });
        }
        this.sound.crackle(40, 2.6, pan, 0.8);
        break;
      }
      case 'crossette': {
        const n = 30;
        const off = rand(0, TAU);
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * TAU;
          const sp = rand(4.6, 5.4) * S;
          this.spark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: 1.5, hue, lum: 65, size: 2.8, drag: 0.97, grav: 0.04 * this.S,
            split: 0.75, splitHue: (hue + 180) % 360,
          });
        }
        this.sound.crackle(30, 0.4, pan, 0.75);
        break;
      }
      case 'glitter': {
        for (let i = 0; i < 150; i++) {
          const [dx, dy] = sph();
          const sp = rand(4.5, 6) * S;
          this.spark(x, y, dx * sp, dy * sp, {
            life: rand(1.8, 2.4), hue: 50, sat: 25, lum: 88, size: 1.8,
            drag: 0.965, grav: 0.045 * this.S, flicker: 0.55,
          });
        }
        this.sound.crackle(60, 1.6, pan, 0.5);
        break;
      }
    }
  }

  // Chakri: spinning wheel
  chakri(x, y, hue = rand(0, 360)) {
    const S = this.S;
    const dur = 3.2;
    let t = 0, ang = 0;
    this.sound.crackle(70, dur, this.pan(x));
    this.sound.pulseLoop('whirr', 0.28, dur);
    this.emitters.push({
      update: (dt, k) => {
        t += dt;
        if (t > dur) return false;
        const fade = t > dur - 0.6 ? (dur - t) / 0.6 : 1;
        const spin = (0.22 + Math.min(t, 1) * 0.18) * fade + 0.05;
        ang += spin * k;
        for (let arm = 0; arm < 3; arm++) {
          const a = ang + (arm * TAU) / 3;
          const cx = x + Math.cos(a) * 12 * S;
          const cy = y + Math.sin(a) * 12 * S;
          const n = Math.max(1, Math.round(3 * k * fade));
          for (let i = 0; i < n; i++) {
            const sp = rand(4, 8) * S * fade + 1;
            const ta = a + Math.PI / 2 + rand(-0.15, 0.15);
            this.spark(cx, cy, Math.cos(ta) * sp, Math.sin(ta) * sp, {
              life: rand(0.35, 0.8), hue: Math.random() < 0.5 ? hue : rand(38, 50),
              sat: 100, lum: rand(55, 75), size: rand(1.4, 2.2), drag: 0.93, grav: 0.12 * S, flicker: 0.2,
            });
          }
        }
      },
      drawHud: (c) => {
        const r = 18 * this.S;
        const g = c.createRadialGradient(x, y, 0, x, y, r * 2.5);
        g.addColorStop(0, 'rgba(255,255,230,0.95)');
        g.addColorStop(0.3, `hsla(${hue},100%,65%,0.55)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r * 2.5, 0, TAU);
        c.fill();
      },
    });
  }

  // Ladi: string of crackers popping one after another
  ladi(x, y) {
    const S = this.S;
    const count = 24;
    const dir = x < this.W / 2 ? 1 : -1;
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({ x: x + dir * i * 15 * S, y: y + Math.sin(i * 0.7) * 6 * S + i * 5 * S, alive: true });
    }
    const interval = 0.07;
    let t = 0, idx = 0;
    this.emitters.push({
      update: (dt) => {
        t += dt;
        while (idx < count && t >= idx * interval) {
          const p = pts[idx];
          p.alive = false;
          this._pop(p.x, p.y);
          idx++;
        }
        return idx < count;
      },
      drawHud: (c) => {
        const alive = pts.filter((p) => p.alive);
        if (!alive.length) return;
        c.strokeStyle = 'rgba(230,200,140,0.7)';
        c.lineWidth = 1.5;
        c.beginPath();
        alive.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
        c.stroke();
        for (const p of alive) {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(0.4 * dir);
          c.fillStyle = '#d4202a';
          c.fillRect(-3 * S, -8 * S, 6 * S, 16 * S);
          c.fillStyle = '#ffd34d';
          c.fillRect(-3 * S, -2 * S, 6 * S, 2 * S);
          c.restore();
        }
        // burning fuse spark
        const f = alive[0];
        c.fillStyle = 'rgba(255,240,180,0.95)';
        c.beginPath();
        c.arc(f.x, f.y, 4 * S, 0, TAU);
        c.fill();
      },
    });
  }

  _pop(x, y) {
    const S = this.S;
    this.flash(x, y, 60 * S, 45, 0.15, 0.8);
    this.sound.pop(this.pan(x), rand(0.35, 0.6));
    for (let i = 0; i < 18; i++) {
      const [dx, dy] = sph();
      const sp = rand(2, 7) * S;
      this.spark(x, y, dx * sp, dy * sp, { life: rand(0.15, 0.4), hue: rand(40, 55), sat: 60, lum: 85, size: 1.5, drag: 0.9, grav: 0.05 * S });
    }
    for (let i = 0; i < 4; i++) {
      this.spark(x, y, rand(-3, 3) * S, rand(-4, 0) * S, { life: rand(0.8, 1.4), hue: 355, sat: 85, lum: 42, size: 3.2, drag: 0.95, grav: 0.15 * S });
    }
  }

  // Atom bomb
  bomb(x, y) {
    const S = this.S;
    this.flash(x, y, 520 * S, 32, 0.7, 0.9);
    this.rings.push({ x, y, r: 10, v: 22 * S, life: 0.7, max: 0.7 });
    this.sound.boom(2.2, this.pan(x));
    this.sound.boom(1.2, this.pan(x), 0.06);
    this.sound.crackle(30, 0.8, this.pan(x), 0.1);
    for (let i = 0; i < 280; i++) {
      const [dx, dy] = sph();
      const sp = rand(4, 17) * S;
      this.spark(x, y, dx * sp, dy * sp, {
        life: rand(0.5, 1.3), hue: rand(12, 48), lum: rand(50, 75), size: rand(1.5, 3.2), drag: 0.93, grav: 0.08 * S,
      });
    }
  }

  // ---------- continuous sources ----------

  _anar(x, y, k) {
    const S = this.S;
    const n = Math.round(14 * k * S) + 1;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-0.28, 0.28);
      const sp = rand(7, 14) * S;
      const gold = Math.random() < 0.72;
      this.spark(x + rand(-3, 3), y - 22 * S, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rand(0.7, 1.5), hue: gold ? rand(30, 48) : 200, sat: gold ? 100 : 10,
        lum: gold ? rand(55, 70) : 92, size: rand(1.2, 2.2), drag: 0.985, grav: 0.16 * S,
        flicker: 0.3, branch: Math.random() < 0.06 ? 1 : 0,
      });
    }
  }

  _sparkler(s, k) {
    const S = this.S;
    const prev = this.prevSpark.get(s.id);
    if (prev && Math.hypot(prev.x - s.x, prev.y - s.y) < 260 * S) {
      this.segments.push({ x1: prev.x, y1: prev.y, x2: s.x, y2: s.y, life: 1.4, max: 1.4 });
    }
    this.prevSpark.set(s.id, { x: s.x, y: s.y });
    const n = Math.round(12 * k) + 1;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(1, 6.5) * S;
      this.spark(s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, {
        life: rand(0.12, 0.4), hue: rand(35, 55), sat: rand(30, 100), lum: rand(70, 92),
        size: rand(0.8, 1.6), drag: 0.92, grav: 0.06 * S, branch: Math.random() < 0.25 ? 1 : 0,
      });
    }
  }

  _die(p) {
    if (!p.branch) return;
    const S = this.S;
    for (let i = 0; i < 3; i++) {
      this.spark(p.x, p.y, rand(-2.2, 2.2) * S, rand(-2.2, 2.2) * S, {
        life: rand(0.08, 0.2), hue: p.hue, sat: 50, lum: 92, size: 0.8, drag: 0.9, grav: 0,
      });
    }
  }

  // ---------- Finale: particle text ----------

  finale(lines, font = '"Yatra One", serif') {
    const W = this.W, H = this.H;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const o = off.getContext('2d');
    let fs = Math.min(H * (lines.length > 1 ? 0.2 : 0.24), 220);
    o.font = `${fs}px ${font}`;
    const widest = Math.max(...lines.map((l) => o.measureText(l).width));
    if (widest > W * 0.9) fs *= (W * 0.9) / widest;
    o.font = `${fs}px ${font}`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillStyle = '#fff';
    const lh = fs * 1.05;
    const cy = H * 0.4 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => o.fillText(l, W / 2, cy + i * lh));

    const data = o.getImageData(0, 0, W, H).data;
    const gap = Math.max(3, Math.round(fs / 30));
    let pts = [];
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    const cap = 3200;
    if (pts.length > cap) pts = pts.sort(() => Math.random() - 0.5).slice(0, cap);

    this.textParts = pts.map(([tx, ty]) => {
      const sx = rand(0, W);
      const sy = H + rand(10, 160);
      return {
        x: sx, y: sy, px: sx, py: sy, tx, ty,
        delay: rand(0, 0.5) + (tx / W) * 0.7,
        t: 0,
        hue: Math.random() < 0.85 ? rand(30, 50) : pick([330, 15, 285]),
        phase: rand(0, TAU),
        hold: 6.8,
        size: Math.max(1.6, gap * 0.6),
      };
    });
  }

  // ---------- main loop ----------

  update(dt) {
    const k = dt * 60;
    const S = this.S;
    this.time += dt;

    for (const s of this.sources.anar) this._anar(s.x, s.y, k);
    const seen = new Set();
    for (const s of this.sources.sparkler) {
      this._sparkler(s, k);
      seen.add(s.id);
    }
    for (const id of [...this.prevSpark.keys()]) if (!seen.has(id)) this.prevSpark.delete(id);

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.px = r.x;
      r.py = r.y;
      r.vy += r.grav * k;
      r.x += r.vx * k;
      r.y += r.vy * k;
      for (let j = 0; j < 2; j++) {
        this.spark(r.x + rand(-1, 1), r.y, rand(-0.4, 0.4) * S, rand(0.5, 1.5) * S, {
          life: rand(0.3, 0.6), hue: 35, sat: 90, lum: rand(55, 75), size: 1.4, grav: 0.02 * S, drag: 0.95,
        });
      }
      if (r.y <= r.ty || r.vy >= -0.5) {
        this.rockets.splice(i, 1);
        this.explode(r.x, r.y, r.pattern, r.hue, r.power);
      }
    }

    this.emitters = this.emitters.filter((e) => e.update(dt, k) !== false);

    const P = this.parts;
    let w = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._die(p);
        continue;
      }
      p.px = p.x;
      p.py = p.y;
      const d = Math.pow(p.drag, k);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.trail && Math.random() < p.trail * k) {
        this.spark(p.x, p.y, 0, 0.3 * S, { life: rand(0.3, 0.7), hue: p.hue, sat: p.sat, lum: p.lum - 10, size: 1, drag: 0.9, grav: 0.02 * S });
      }
      if (p.split && p.max - p.life > p.split) {
        const base = Math.atan2(p.vy, p.vx);
        for (let j = 0; j < 4; j++) {
          const a = base + Math.PI / 4 + (j * TAU) / 4;
          const sp = 2.8 * S;
          this.spark(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, {
            life: rand(0.6, 0.9), hue: p.splitHue, lum: 68, size: 1.8, drag: 0.95, grav: 0.04 * S, flicker: 0.15,
          });
        }
        continue;
      }
      P[w++] = p;
    }
    P.length = w;

    // text particles
    if (this.textParts.length) {
      const e = 1 - Math.pow(1 - 0.085, k);
      let tw = 0;
      const T = this.textParts;
      for (let i = 0; i < T.length; i++) {
        const tp = T[i];
        tp.t += dt;
        tp.px = tp.x;
        tp.py = tp.y;
        if (tp.t >= tp.delay && tp.t < tp.hold) {
          tp.x += (tp.tx - tp.x) * e;
          tp.y += (tp.ty - tp.y) * e;
        } else if (tp.t >= tp.hold) {
          this.spark(tp.x, tp.y, rand(-1.5, 1.5) * S, rand(-2, 0.5) * S, {
            life: rand(1, 2.2), hue: tp.hue, lum: 70, size: 1.6, drag: 0.97, grav: 0.05 * S, flicker: 0.35,
          });
          continue;
        }
        T[tw++] = tp;
      }
      T.length = tw;
    }

    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.v * k;
      r.v *= Math.pow(0.94, k);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const s of this.segments) s.life -= dt;
    this.segments = this.segments.filter((s) => s.life > 0);
    if (this.segments.length > 600) this.segments.splice(0, this.segments.length - 600);
  }

  draw() {
    const c = this.ctx, W = this.W, H = this.H;
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';

    for (const f of this.flashes) {
      const a = (f.life / f.max) * f.a;
      const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `hsla(${f.hue},100%,85%,${a})`);
      g.addColorStop(0.4, `hsla(${f.hue},100%,60%,${a * 0.35})`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      c.fillStyle = g;
      c.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }

    for (const r of this.rings) {
      c.strokeStyle = `rgba(255,220,170,${(r.life / r.max) * 0.7})`;
      c.lineWidth = 6 * this.S * (r.life / r.max) + 1;
      c.beginPath();
      c.arc(r.x, r.y, r.r, 0, TAU);
      c.stroke();
    }

    c.lineCap = 'round';
    for (const s of this.segments) {
      const a = s.life / s.max;
      c.strokeStyle = `rgba(255,190,80,${a * 0.35})`;
      c.lineWidth = 7 * this.S;
      c.beginPath();
      c.moveTo(s.x1, s.y1);
      c.lineTo(s.x2, s.y2);
      c.stroke();
      c.strokeStyle = `rgba(255,250,225,${a * 0.9})`;
      c.lineWidth = 2 * this.S;
      c.stroke();
    }

    for (const p of this.parts) {
      let a = p.life / p.max;
      if (p.flicker && Math.random() < p.flicker) a *= 0.15;
      c.strokeStyle = `hsla(${p.hue},${p.sat}%,${p.lum}%,${a})`;
      c.lineWidth = p.size;
      c.beginPath();
      c.moveTo(p.px, p.py);
      c.lineTo(p.x + 0.01, p.y);
      c.stroke();
    }

    for (const r of this.rockets) {
      c.fillStyle = 'rgba(255,245,210,1)';
      c.beginPath();
      c.arc(r.x, r.y, 2.6 * this.S, 0, TAU);
      c.fill();
    }

    for (const tp of this.textParts) {
      if (tp.t < tp.delay) continue;
      const lum = 62 + 26 * Math.sin(this.time * 6 + tp.phase);
      c.strokeStyle = `hsla(${tp.hue},100%,${lum}%,1)`;
      c.lineWidth = tp.size;
      c.beginPath();
      c.moveTo(tp.px, tp.py);
      c.lineTo(tp.x + 0.01, tp.y);
      c.stroke();
    }

    // HUD layer (cleared each frame)
    const h = this.hctx;
    h.clearRect(0, 0, W, H);
    for (const e of this.emitters) e.drawHud?.(h);
    for (const s of this.sources.anar) this._drawAnarPot(h, s.x, s.y);
  }

  _drawAnarPot(c, x, y) {
    const S = this.S;
    c.fillStyle = '#7a3b16';
    c.beginPath();
    c.moveTo(x - 16 * S, y + 6);
    c.lineTo(x - 5 * S, y - 22 * S);
    c.lineTo(x + 5 * S, y - 22 * S);
    c.lineTo(x + 16 * S, y + 6);
    c.closePath();
    c.fill();
    c.fillStyle = '#e3a22a';
    c.fillRect(x - 12 * S, y - 10 * S, 24 * S, 3 * S);
  }

  get busy() {
    return this.textParts.length > 0;
  }
}
