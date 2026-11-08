import {
  FilesetResolver,
  FaceLandmarker,
  GestureRecognizer,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
import { Fireworks } from './fireworks.js';
import { Sound } from './sound.js';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const GESTURE_MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const $ = (s) => document.querySelector(s);

const video = $('#video');
const stage = $('#stage');
const sound = new Sound();
const fx = new Fireworks($('#fx'), $('#hud'), sound);
const W = () => fx.W;
const H = () => fx.H;
const clampX = (x) => Math.max(40, Math.min(W() - 40, x));

let faceLm = null, gestRec = null;
let running = false;      // camera tracking active
let demo = false;         // started without camera
let showTracking = true;
let finaleOn = false;
let lastFace = null, lastHands = null;

// ---------- UI helpers ----------
const toastEl = $('#toast');
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
}
const flashTimers = {};
function flashUI(k) {
  const el = document.querySelector(`[data-k="${k}"]`);
  if (!el) return;
  el.classList.add('on');
  clearTimeout(flashTimers[k]);
  flashTimers[k] = setTimeout(() => el.classList.remove('on'), 700);
}
function setActive(k, on) {
  document.querySelector(`[data-k="${k}"]`)?.classList.toggle('active', on);
}
function meter(k, v) {
  const el = document.querySelector(`[data-k="${k}"] .meter > i`);
  if (el) el.style.width = `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
}

function shake() {
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
  const f = $('#flash');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}

const cooldowns = {};
function ready(key, ms) {
  const now = performance.now();
  if (now - (cooldowns[key] || 0) < ms) return false;
  cooldowns[key] = now;
  return true;
}

// ---------- Cracker actions (shared by tracking + keyboard demo) ----------
const A = {
  rockets(x = W() / 2) {
    flashUI('jaw'); toast('🚀 Sky Rockets!');
    for (let i = 0; i < 3; i++) {
      setTimeout(() => fx.rocket({
        x0: clampX(x + rand(-0.3, 0.3) * W()),
        tx: clampX(x + (i - 1) * W() * 0.22),
        ty: rand(0.1, 0.3) * H(),
        pattern: pick(['peony', 'crossette', 'multi', 'glitter']),
        power: 1.15,
      }), i * 180);
    }
  },
  chakri(x = W() / 2) {
    flashUI('brow'); toast('🌀 Chakri!');
    fx.chakri(clampX(x - W() * 0.22), H() * 0.8);
    fx.chakri(clampX(x + W() * 0.22), H() * 0.8);
  },
  heart(x = W() / 2, y = H() * 0.6) {
    flashUI('pucker'); toast('💖 Heart Burst!');
    fx.rocket({ x0: x, y0: y, tx: x, ty: Math.max(H() * 0.12, y - H() * 0.4), pattern: 'heart', power: 1.2 });
  },
  sparkle(x, y) { setActive('point', true); },
  twin(x = W() / 2, y = H() / 2) {
    flashUI('victory'); toast('✌️ Twin Rockets!');
    const hue = rand(0, 360);
    for (const s of [-1, 1]) {
      fx.rocket({ x0: clampX(x + s * W() * 0.15), tx: clampX(x + s * W() * 0.12), ty: Math.max(H() * 0.1, y - H() * 0.25), pattern: 'peony', hue: (hue + (s > 0 ? 0 : 160)) % 360 });
    }
  },
  bomb(x = W() / 2, y = H() / 2) {
    flashUI('fist'); toast('💣 Atom Bomb!');
    fx.bomb(x, y);
    shake();
  },
  ladi(x = W() / 2, y = H() / 2) {
    flashUI('thumbup'); toast('🧨 Ladi!');
    fx.ladi(x, y);
  },
  skyshot(x = W() / 2, y = H() / 2) {
    flashUI('palm'); toast('🎆 Sky Shot!');
    fx.explode(x, Math.max(80, y - 60 * fx.S), pick(['multi', 'crossette']), rand(0, 360), 1.1);
  },
  rainbow(x = W() / 2, y = H() / 2) {
    flashUI('love'); toast('🌈 Rainbow Ring!');
    fx.rocket({ x0: clampX(x), tx: clampX(x), ty: Math.max(H() * 0.12, y - H() * 0.3), pattern: 'rainbow', power: 1.3 });
  },
  willow() {
    flashUI('thumbdown'); toast('✨ Golden Willow!');
    fx.rocket({ x0: W() * 0.3, tx: W() * 0.32, ty: H() * 0.15, pattern: 'willow', power: 1.2 });
    setTimeout(() => fx.rocket({ x0: W() * 0.7, tx: W() * 0.68, ty: H() * 0.18, pattern: 'willow', power: 1.2 }), 250);
  },
  async finale() {
    if (finaleOn) return;
    finaleOn = true;
    flashUI('wink');
    toastEl.classList.remove('show');
    sound.chime();
    setTimeout(() => sound.speak('Happy Diwali!'), 500);
    try { await document.fonts.load('100px "Yatra One"'); } catch {}
    fx.finale(W() < 700 ? ['Happy', 'Diwali'] : ['Happy Diwali']);
    $('#greeting').classList.add('show');
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        const left = i % 2 === 0;
        const x = left ? rand(0.05, 0.35) * W() : rand(0.65, 0.95) * W();
        fx.rocket({ x0: x, tx: x + rand(-60, 60), ty: rand(0.08, 0.3) * H(), pattern: pick(['peony', 'multi', 'ring', 'crossette', 'glitter', 'willow', 'heart']), power: rand(1, 1.3) });
      }, 300 + i * 380);
    }
    setTimeout(() => fx.chakri(W() * 0.15, H() * 0.85, 40), 1200);
    setTimeout(() => fx.chakri(W() * 0.85, H() * 0.85, 320), 1400);
    const anarUntil = performance.now() + 6500;
    demoAnar = { until: anarUntil, pts: [W() * 0.08, W() * 0.3, W() * 0.7, W() * 0.92] };
    setTimeout(() => {
      $('#greeting').classList.remove('show');
      finaleOn = false;
    }, 9500);
  },
};

// ---------- Mapping landmark -> screen (video is mirrored + object-fit: cover) ----------
function toScreen(nx, ny) {
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
  const s = Math.max(W() / vw, H() / vh);
  const ox = (W() - vw * s) / 2, oy = (H() - vh * s) / 2;
  return { x: W() - (ox + nx * vw * s), y: oy + ny * vh * s };
}

// ---------- Face expressions ----------
let winkFrames = 0;
let smileOn = false;
let demoAnar = null;

function processFace(res) {
  const lm = res?.faceLandmarks?.[0];
  if (!lm) {
    lastFace = null;
    smileOn = false;
    setActive('smile', false);
    return [];
  }
  const bs = {};
  res.faceBlendshapes?.[0]?.categories.forEach((c) => (bs[c.categoryName] = c.score));
  const nose = toScreen(lm[1].x, lm[1].y);
  const mouth = toScreen((lm[13].x + lm[14].x) / 2, (lm[13].y + lm[14].y) / 2);
  lastFace = { lm, nose };

  const smile = ((bs.mouthSmileLeft || 0) + (bs.mouthSmileRight || 0)) / 2;
  const jaw = bs.jawOpen || 0;
  const brow = Math.max(bs.browInnerUp || 0, ((bs.browOuterUpLeft || 0) + (bs.browOuterUpRight || 0)) / 2);
  const pucker = bs.mouthPucker || 0;
  const L = bs.eyeBlinkLeft || 0, R = bs.eyeBlinkRight || 0;
  const winkScore = Math.abs(L - R);
  meter('smile', smile / 0.55);
  meter('jaw', jaw / 0.5);
  meter('brow', brow / 0.6);
  meter('pucker', pucker / 0.7);
  meter('wink', winkScore / 0.35);

  // WINK -> Happy Diwali finale (one eye closed, the other open, held a few frames)
  const winking = Math.max(L, R) > 0.5 && Math.min(L, R) < 0.3 && winkScore > 0.35;
  winkFrames = winking ? winkFrames + 1 : 0;
  if (winkFrames === 4 && ready('wink', 10000)) A.finale();
  const eyesBusy = Math.max(L, R) > 0.45; // don't misfire other expressions mid-wink

  const anar = [];
  if (!finaleOn) {
    const nowSmile = smile > 0.55;
    if (nowSmile && !smileOn) { flashUI('smile'); toast('🌋 Anar Fountains!'); }
    smileOn = nowSmile;
    setActive('smile', nowSmile);
    if (nowSmile) anar.push({ x: clampX(nose.x - W() * 0.2), y: H() - 4 }, { x: clampX(nose.x + W() * 0.2), y: H() - 4 });

    if (!eyesBusy) {
      if (jaw > 0.5 && ready('jaw', 1600)) A.rockets(nose.x);
      if (brow > 0.6 && ready('brow', 2400)) A.chakri(nose.x);
      if (pucker > 0.7 && jaw < 0.3 && ready('pucker', 1800)) A.heart(mouth.x, mouth.y);
    }
  }
  return anar;
}

// ---------- Hand gestures ----------
const handState = {};
const GESTURE_EMOJI = {
  Pointing_Up: '☝️', Victory: '✌️', Closed_Fist: '✊', Thumb_Up: '👍',
  Open_Palm: '✋', ILoveYou: '🤟', Thumb_Down: '👎', None: '',
};

function processHands(res) {
  const sparks = [];
  const hands = [];
  const used = new Set();
  (res?.landmarks || []).forEach((lm, i) => {
    const g = res.gestures?.[i]?.[0];
    const name = g && g.score > 0.55 ? g.categoryName : 'None';
    let key = res.handedness?.[i]?.[0]?.categoryName || 'h';
    if (used.has(key)) key += i;
    used.add(key);
    const st = (handState[key] ||= { g: 'None', n: 0 });
    if (st.g === name) st.n++;
    else { st.g = name; st.n = 1; }

    const tip = toScreen(lm[8].x, lm[8].y);
    const thumb = toScreen(lm[4].x, lm[4].y);
    const palm = toScreen(lm[9].x, lm[9].y);
    const wrist = toScreen(lm[0].x, lm[0].y);
    hands.push({ lm, name, wrist });
    if (st.n < 3) return;

    switch (name) {
      case 'Pointing_Up':
        sparks.push({ id: key, x: tip.x, y: tip.y });
        if (ready(key + 'pt', 1500)) { flashUI('point'); toast('🎇 Phuljhadi!'); }
        break;
      case 'Victory': if (ready(key + 'v', 1500)) A.twin(palm.x, palm.y); break;
      case 'Closed_Fist': if (ready('fist', 2200)) A.bomb(palm.x, palm.y); break;
      case 'Thumb_Up': if (ready(key + 'tu', 2600)) A.ladi(thumb.x, thumb.y); break;
      case 'Open_Palm': if (ready(key + 'op', 1300)) A.skyshot(palm.x, palm.y); break;
      case 'ILoveYou': if (ready(key + 'ly', 1600)) A.rainbow(palm.x, palm.y); break;
      case 'Thumb_Down': if (ready('td', 2200)) A.willow(); break;
    }
  });
  for (const k of Object.keys(handState)) if (!used.has(k)) delete handState[k];
  lastHands = hands;
  return sparks;
}

// ---------- Tracking overlay ----------
const HAND_CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawTracking(c) {
  if (!showTracking || !running) return;
  if (lastFace) {
    c.fillStyle = 'rgba(255,214,120,0.35)';
    const lm = lastFace.lm;
    for (let i = 0; i < lm.length; i += 5) {
      const p = toScreen(lm[i].x, lm[i].y);
      c.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    for (const i of [468, 473]) {
      if (!lm[i]) continue;
      const p = toScreen(lm[i].x, lm[i].y);
      c.strokeStyle = 'rgba(255,180,60,0.8)';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(p.x, p.y, 7, 0, Math.PI * 2); c.stroke();
    }
  }
  for (const h of lastHands || []) {
    const pts = h.lm.map((p) => toScreen(p.x, p.y));
    c.strokeStyle = 'rgba(255,170,60,0.6)';
    c.lineWidth = 2;
    c.beginPath();
    for (const [a, b] of HAND_CONN) { c.moveTo(pts[a].x, pts[a].y); c.lineTo(pts[b].x, pts[b].y); }
    c.stroke();
    c.fillStyle = 'rgba(255,235,180,0.9)';
    for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, 2.5, 0, Math.PI * 2); c.fill(); }
    const em = GESTURE_EMOJI[h.name];
    if (em) {
      c.font = '28px system-ui, "Apple Color Emoji", sans-serif';
      c.textAlign = 'center';
      c.fillText(em, h.wrist.x, h.wrist.y + 36);
    }
  }
}

// ---------- Demo input (mouse + keyboard) ----------
let pointer = null;
let keyAnarUntil = 0;
const isUI = (e) => e.target.closest?.('button, aside, header, #intro, a');
addEventListener('pointerdown', (e) => {
  if (isUI(e)) return;
  sound.init();
  pointer = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
});
addEventListener('pointermove', (e) => {
  if (!pointer) return;
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (Math.hypot(pointer.x - pointer.sx, pointer.y - pointer.sy) > 12) pointer.moved = true;
});
addEventListener('pointerup', () => {
  if (pointer && !pointer.moved) fx.rocket({ x0: clampX(pointer.x + rand(-80, 80)), tx: pointer.x, ty: pointer.y, pattern: pick(['peony', 'multi', 'ring', 'crossette', 'glitter']) });
  pointer = null;
});

const KEYS = {
  '1': () => { flashUI('smile'); toast('🌋 Anar Fountains!'); keyAnarUntil = performance.now() + 2500; },
  '2': () => A.rockets(),
  '3': () => A.chakri(),
  '4': () => A.heart(),
  '5': () => A.twin(),
  '6': () => A.bomb(),
  '7': () => A.ladi(W() * 0.3, H() * 0.35),
  '8': () => A.skyshot(rand(0.3, 0.7) * W(), rand(0.3, 0.5) * H()),
  '9': () => A.rainbow(),
  '0': () => A.willow(),
  w: () => A.finale(),
};
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const f = KEYS[e.key.toLowerCase()];
  if (f) { sound.init(); f(); }
});

// ---------- Main loop ----------
let lastT = performance.now();
let lastVideoTime = -1;
let fpsAcc = 0, fpsN = 0, fps = 0;
let idleRocket = 0;
let faceAnar = [];
let handSparks = [];

function loop(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  if (running && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const ts = performance.now();
    try {
      faceAnar = processFace(faceLm.detectForVideo(video, ts));
      handSparks = processHands(gestRec.recognizeForVideo(video, ts));
    } catch (err) {
      console.warn(err);
    }
    fpsAcc += dt; fpsN++;
  }

  // assemble continuous sources
  const now = performance.now();
  const anar = [...faceAnar];
  if (now < keyAnarUntil) anar.push({ x: W() * 0.3, y: H() - 4 }, { x: W() * 0.7, y: H() - 4 });
  if (demoAnar && now < demoAnar.until) for (const x of demoAnar.pts) anar.push({ x, y: H() - 4 });
  fx.sources.anar = anar;
  const sparks = [...handSparks];
  if (pointer?.moved) sparks.push({ id: 'mouse', x: pointer.x, y: pointer.y });
  fx.sources.sparkler = sparks;
  setActive('point', sparks.length > 0);
  sound.setLevel('hiss', sparks.length ? 0.22 : 0);
  sound.setLevel('roar', anar.length ? Math.min(0.5, 0.18 * anar.length) : 0);

  // attract mode before starting
  if (!running && !demo) {
    idleRocket -= dt;
    if (idleRocket <= 0) {
      idleRocket = rand(0.8, 1.6);
      fx.rocket({ ty: rand(0.1, 0.4) * H(), pattern: pick(['peony', 'multi', 'ring', 'willow', 'crossette']), silent: true });
    }
  }

  fx.update(dt);
  fx.draw();
  drawTracking(fx.hctx);

  if (fpsAcc > 0.5) {
    fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0; fpsN = 0;
    updateStatus();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function updateStatus(text) {
  const el = $('#status');
  if (text) { el.textContent = text; return; }
  if (!running) { el.textContent = demo ? 'Demo mode · keys 1–0, W' : 'Ready'; return; }
  const hands = lastHands?.length || 0;
  el.innerHTML = `<span class="${lastFace ? 'ok' : 'no'}">● Face</span> <span class="${hands ? 'ok' : 'no'}">● Hands ${hands}</span> <span class="dim">${fps} fps</span>`;
}

// ---------- Startup ----------
async function createTask(Cls, vision, opts) {
  try {
    return await Cls.createFromOptions(vision, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'GPU' } });
  } catch (e) {
    console.warn('GPU delegate failed, using CPU', e);
    return await Cls.createFromOptions(vision, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' } });
  }
}

let modelsPromise = null;
function loadModels() {
  modelsPromise ||= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    [faceLm, gestRec] = await Promise.all([
      createTask(FaceLandmarker, vision, {
        baseOptions: { modelAssetPath: FACE_MODEL },
        runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
      }),
      createTask(GestureRecognizer, vision, {
        baseOptions: { modelAssetPath: GESTURE_MODEL },
        runningMode: 'VIDEO', numHands: 2,
      }),
    ]);
  })();
  return modelsPromise;
}
loadModels().catch((e) => console.error('Model load failed', e)); // preload while the intro shows

const startBtn = $('#start');
const introMsg = $('#introMsg');
startBtn.addEventListener('click', async () => {
  sound.init();
  startBtn.disabled = true;
  try {
    introMsg.textContent = 'Asking for camera…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    introMsg.textContent = 'Loading AI models (first time takes a few seconds)…';
    await loadModels();
    running = true;
    $('#intro').classList.add('hide');
    document.body.classList.add('live');
    toast('🪔 Make a face or show a hand!');
  } catch (e) {
    console.error(e);
    startBtn.disabled = false;
    introMsg.textContent = e?.name === 'NotAllowedError'
      ? 'Camera permission was denied. Allow it in the browser and try again, or use demo mode.'
      : `Could not start: ${e?.message || e}. Try demo mode.`;
  }
});

$('#demo').addEventListener('click', () => {
  sound.init();
  demo = true;
  $('#intro').classList.add('hide');
  updateStatus();
  toast('⌨️ Keys 1–0 fire crackers · W = wink finale');
});

$('#btnMute').addEventListener('click', (e) => {
  sound.init();
  sound.setMuted(!sound.muted);
  e.currentTarget.textContent = sound.muted ? '🔇' : '🔊';
});
$('#btnTrack').addEventListener('click', (e) => {
  showTracking = !showTracking;
  e.currentTarget.textContent = `Tracking: ${showTracking ? 'on' : 'off'}`;
});
$('#btnGuide').addEventListener('click', () => $('#guide').classList.toggle('collapsed'));
if (innerWidth < 720) $('#guide').classList.add('collapsed');
updateStatus();
