/**
 * Public WebAR viewer. Renders the owner's composed scene (3D models with
 * animation, tappable social icons / images, video) anchored on the printed
 * card via MindAR image tracking. Standalone HTML, loaded by the app's WebView.
 * Same family of tech as PlugXR / Kivicube / MyWebAR; swap the engine here for
 * an 8th Wall project URL later for premium tracking.
 */
import { createClient } from "@supabase/supabase-js";
import { normalizeLink, socialPreset } from "@/lib/ar/scene";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL ?? "";
const APP_ANON = process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_ANON_KEY ?? "";

// WebAR engine: the documented pair, A-Frame 1.5.0 + MindAR 1.2.5. A-Frame
// evaluates strings as JS at runtime, so the /ar/* CSP must allow 'unsafe-eval'
// (see next.config.ts) — without it A-Frame half-inits and the scene throws a
// cascade of masked errors. No aframe-extras (it registered a system A-Frame
// rejected); animation looping comes from the inline animation-mixer below.
const AFRAME = "https://cdn.jsdelivr.net/npm/aframe@1.5.0/dist/aframe-master.min.js";
const MINDAR = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js";

function page(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never cache the viewer HTML — the WebView/CDN must always get the latest
      // (deploys were appearing stale otherwise).
      "cache-control": "no-store, must-revalidate",
    },
  });
}
function fallback(message: string) {
  return page(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>body{margin:0;background:#0a0a0a;color:#e6edf3;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px}</style>
</head><body><div><p>${message}</p></div></body></html>`);
}

export async function GET(_req: Request, ctx: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await ctx.params;
  if (!APP_URL || !APP_ANON) return fallback("AR isn’t configured.");

  const supabase = createClient(APP_URL, APP_ANON, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("resolve_ar_model_for_card", { p_card_id: cardId });
  if (error || !data) return fallback("This card doesn’t have an AR experience yet.");

  const m = data as Record<string, any>;
  const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u);

  // AR image targets: both card photos when present (so AR fires whether the
  // viewer points at the front OR the back), else the single chosen target, else
  // the legacy QR image. De-duped, order preserved.
  // Track a SINGLE side — the one the owner chose as the AR target. One target is
  // faster to lock and more stable than registering both sides. Fall back to
  // whichever side has a photo, then the legacy reference image.
  const sceneCard = (m.scene && typeof m.scene === "object" ? (m.scene as any).card : null) ?? {};
  const targetSide = sceneCard.target === "back" ? "back" : "front";
  const chosenUrl = targetSide === "back" ? sceneCard.backUrl : sceneCard.frontUrl;
  let targets: string[] = [chosenUrl].filter(isHttp);
  if (targets.length === 0) targets = [sceneCard.frontUrl, sceneCard.backUrl].filter(isHttp).slice(0, 1);
  if (targets.length === 0 && isHttp(m.reference_image_path)) targets = [m.reference_image_path];

  // Prebuilt MindAR target compiled in the editor: the viewer downloads it and
  // skips the slow on-device feature-extraction compile. `targets` stays as the
  // fallback (runtime compile) for older cards or if the .mind fails to load.
  const mindUrl = isHttp(sceneCard.mindUrl) ? sceneCard.mindUrl : null;
  const mindTargetCount = Number(sceneCard.mindTargets) > 0 ? Number(sceneCard.mindTargets) : null;

  const rawEls = Array.isArray(m.scene?.elements) ? m.scene.elements : [];
  const elements = rawEls
    .filter((el: Record<string, any>) => !el.hidden)
    .map((el: Record<string, any>) => {
      const p = socialPreset(el.platform);
      return {
        type: el.type,
        url: typeof el.url === "string" ? el.url : null,
        color: el.type === "text" ? (typeof el.color === "string" ? el.color : "#18181b") : p?.color ?? null,
        label: el.label ?? p?.label ?? null,
        text: typeof el.text === "string" ? el.text : null,
        link: el.link ? normalizeLink(String(el.link)) : null,
        position: Array.isArray(el.position) ? el.position : [0, 0.2, 0.15],
        rotationX: Number(el.rotationX) || 0,
        rotationY: Number(el.rotationY) || 0,
        rotationZ: Number(el.rotationZ) || 0,
        scale: Number(el.scale) || 1,
        // The auto-fit normalization factor. WITHOUT this the viewer rendered
        // every model at the raw multiplier (a giant car), so it overflowed the
        // card and looked nowhere near where it was placed. Effective scale in
        // buildElement = baseScale * scale, matching the editor exactly.
        baseScale: Number(el.baseScale) > 0 ? Number(el.baseScale) : 1,
        animated: !!el.animated,
        spin: !!el.spin,
      };
    });

  if (targets.length === 0 && !mindUrl) return fallback("This card isn’t set up for AR tracking yet.");

  const li = (m.scene && typeof m.scene === "object" ? (m.scene as any).lighting : null) ?? {};
  const lighting = { intensity: typeof li.intensity === "number" && li.intensity > 0 ? Math.min(3, li.intensity) : 1.2 };

  return page(viewerHtml({ targets, elements, lighting, mindUrl, mindTargetCount }));
}

function viewerHtml(view: unknown): string {
  const json = JSON.stringify(view).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>AR Card</title>
<style>
  html,body{margin:0;height:100%;background:#0b0d12;overflow:hidden;font-family:system-ui,sans-serif;color:#fff}
  /* Single branded loading screen (no black flash, no stacked spinners). Fades
     out once AR is actually ready. The in-app WebView draws its own matching bar
     on top, so this is mainly the browser/fallback view. */
  #status{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;z-index:30;
    background:radial-gradient(120% 80% at 50% 0%, #15110a 0%, #0b0d12 60%);transition:opacity .45s ease}
  #status.done{opacity:0}
  #status.hide{display:none}
  .ld{width:min(280px,80vw)}
  .ld-logo{font-size:17px;font-weight:600;letter-spacing:.3px;margin-bottom:18px}
  .ld-logo b{color:#F59E0B;font-weight:700}
  .ld-track{height:6px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden}
  .ld-bar{height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#F59E0B,#fbbf24);transition:width .3s ease}
  .ld-pct{margin-top:10px;font-size:13px;color:#9aa3b2;font-variant-numeric:tabular-nums}
  #hint{position:fixed;top:16px;left:0;right:0;text-align:center;z-index:20;pointer-events:none;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  /* Diagnostic HUD — only shown with ?debug=1. Tells us FPS + tracking state so we
     can tell a slow device apart from a logic bug. */
  #dbg{position:fixed;top:8px;left:8px;z-index:40;display:none;font:600 12px/1.45 ui-monospace,Menlo,monospace;
    color:#7CFFB2;background:rgba(0,0,0,.62);padding:7px 9px;border-radius:8px;white-space:pre;pointer-events:none}
  /* The scene wrapper MUST be full-viewport — MindAR measures this container to
     size the camera video AND match the 3D projection to it. An unsized wrapper
     made it letterbox (video shorter than the canvas) and threw the overlay
     off-card. */
  #scene{position:fixed;inset:0;width:100%;height:100%}
  /* CRITICAL: do NOT override the camera <video> geometry. MindAR's own _resize()
     sizes + positions the video to "cover" this container AND builds the camera
     projection matrix to match that exact sizing. If we force
     object-fit/width/height/position here, the displayed video and the 3D
     projection DISAGREE — content drifts off the card and SLIDES as the phone
     moves (the misalignment grows toward the frame edges). So we only set
     stacking: video behind the transparent WebGL canvas. */
  video{z-index:0 !important}
  .a-canvas{background-color:transparent !important;z-index:1 !important}
</style>
</head>
<body>
<div id="status"><div class="ld">
  <div class="ld-logo">KaunTech <b>AR</b></div>
  <div class="ld-track"><div id="bar" class="ld-bar"></div></div>
  <div id="pct" class="ld-pct">Starting…</div>
</div></div>
<div id="hint"></div>
<div id="dbg"></div>
<div id="scene"></div>
<script>window.__AR__ = ${json};</script>
<script>
// Diagnostics installed BEFORE the AR libraries so we capture errors from
// MindAR's worker — it grabs the real Worker constructor when its script loads,
// so the wrapper must exist first or worker errors stay masked as "Script error."
(function(){
  function log(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage('[ARView] ' + Array.prototype.join.call(arguments, ' ')); } catch(e){} }
  window.__ARLOG__ = log;
  window.addEventListener('error', function(e){ log('window error:', e.message, (e.filename||'') + ':' + (e.lineno||'')); });
  window.addEventListener('unhandledrejection', function(e){ log('promise rejection:', (e.reason && (e.reason.message || e.reason.name || e.reason)) || 'unknown'); });
  try { var _ce = console.error; console.error = function(){ log('console.error:', Array.prototype.map.call(arguments, String).join(' ')); try { _ce.apply(console, arguments); } catch(_){} }; } catch(e){}
  try {
    var _W = window.Worker;
    if (_W){
      var WW = function(u, o){ var w = new _W(u, o); try { w.addEventListener('error', function(e){ log('WORKER error:', (e.message||'?') + ' @ ' + (e.filename||'') + ':' + (e.lineno||'')); }); w.addEventListener('messageerror', function(){ log('WORKER messageerror'); }); } catch(_){ } return w; };
      WW.prototype = _W.prototype; window.Worker = WW;
    }
  } catch(e){}
  // Camera resolution = a PERFORMANCE vs precision trade. MindAR runs CV in WASM on
  // the CPU every frame; 1080p doubles the per-frame work vs 720p, which tanks the
  // tracking framerate on LOW-END phones (→ laggy, jittery, frequent loss). 720p is
  // the safer default: well above the low-detail threshold for our crisp 1440px
  // target, far lighter for weak hardware. continuous AF keeps the card sharp.
  // Merged into every video request the page makes.
  try {
    var md = navigator.mediaDevices;
    if (md && md.getUserMedia){
      var _gum = md.getUserMedia.bind(md);
      md.getUserMedia = function(c){
        try {
          c = c || {};
          if (c.video){
            var v = (typeof c.video === 'object') ? c.video : {};
            if (v.width == null) v.width = { ideal: 1280 };
            if (v.height == null) v.height = { ideal: 720 };
            if (v.facingMode == null) v.facingMode = { ideal: 'environment' };
            if (v.frameRate == null) v.frameRate = { ideal: 30 };
            // continuous AF keeps the card sharp as the phone moves — as an
            // ADVANCED (optional) constraint so it never makes gUM throw.
            v.advanced = (v.advanced || []).concat([{ focusMode: 'continuous' }]);
            c.video = v;
            log('gUM hires video constraints applied');
          }
        } catch(e){}
        return _gum(c);
      };
    }
  } catch(e){}
})();
</script>
<script src="${AFRAME}" crossorigin="anonymous"></script>
<script src="${MINDAR}" crossorigin="anonymous"></script>
<script>
(function(){
  var D = window.__AR__ || {};
  var statusEl = document.getElementById('status');
  var barEl = document.getElementById('bar');
  var pctEl = document.getElementById('pct');
  var hintEl = document.getElementById('hint');
  var lastProg = 0;

  // Single source of truth for loading progress. Updates the in-page bar AND
  // posts to the native app, which draws the matching bar over the WebView — so
  // the user sees ONE progress bar, not a stack of spinners.
  function rnPost(obj){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){} }
  function setProg(v){
    v = Math.max(lastProg, Math.min(100, Math.round(v))); // monotonic, never jumps back
    lastProg = v;
    if (barEl) barEl.style.width = v + '%';
    if (pctEl) pctEl.textContent = v + '%';
    rnPost({ type: 'ar-progress', value: v });
  }
  var arReadyFired = false;
  var log = window.__ARLOG__ || function(){};

  // Diagnostic HUD (add ?debug=1 to the URL): shows RENDER fps + tracking state +
  // whether device-orientation is available. Lets us tell a slow device (low fps)
  // apart from a logic bug (good fps but bad behaviour). 'build' confirms the
  // deployed version. Off for normal users.
  (function(){
    try {
      if (!/[?&]debug/i.test(location.search)) return;
      var el = document.getElementById('dbg'); if (!el) return;
      el.style.display = 'block';
      var frames = 0, t0 = (window.performance ? performance.now() : Date.now()), fps = 0;
      (function loop(){
        frames++;
        var t = (window.performance ? performance.now() : Date.now());
        if (t - t0 >= 500){ fps = Math.round(frames * 1000 / (t - t0)); frames = 0; t0 = t; }
        el.textContent =
          'build: coast-v1\\n' +
          'render fps: ' + fps + '\\n' +
          'state: ' + (window.__ARSTATE__ || 'starting') + '\\n' +
          'orient: ' + ((typeof devQ !== 'undefined' && devQ) ? 'yes' : 'no');
        requestAnimationFrame(loop);
      })();
    } catch(e){}
  })();

  // Minimal animation-mixer so user-uploaded animated .glb models loop their
  // built-in animations — replaces aframe-extras (which crashed scene init) with
  // a plain component (no system registration, so it can't reproduce that crash).
  if (window.AFRAME && AFRAME.registerComponent && !AFRAME.components['animation-mixer']){
    AFRAME.registerComponent('animation-mixer', {
      schema: { clip: { default: '*' }, loop: { default: 'repeat' } },
      init: function(){
        var self = this; this.mixer = null;
        this.el.addEventListener('model-loaded', function(e){
          try {
            var model = e.detail && e.detail.model;
            var clips = model && model.animations;
            if (!model || !clips || !clips.length) return;
            self.mixer = new AFRAME.THREE.AnimationMixer(model);
            clips.forEach(function(c){ self.mixer.clipAction(c).reset().play(); });
            log('animation-mixer: ' + clips.length + ' clip(s)');
          } catch(err){ log('animation-mixer err: ' + (err && err.message)); }
        });
      },
      tick: function(t, dt){ if (this.mixer && dt) this.mixer.update(dt / 1000); }
    });
  }

  // ── Device orientation, for COASTING through a track loss ─────────────────
  // The phone's orientation (already IMU-fused by the OS) as a three.js quaternion,
  // via the canonical DeviceOrientationControls mapping (incl. screen rotation).
  // When MindAR drops the card (fast move = motion blur), we rotate the model by
  // how the phone has turned since the loss, so it STAYS where the card is instead
  // of freezing to the screen ("stuck to camera") or vanishing. On re-lock, vision
  // snaps it back to truth, so even an imperfect coast self-corrects within the
  // brief loss window. Android Chrome fires this with no prompt; iOS needs a tap
  // (requested on first touch) — without it we just hide on loss (never stuck).
  var devQ = null, devSeen = 0;
  if (window.AFRAME && AFRAME.THREE){
    (function(){
      var T = AFRAME.THREE;
      var zee = new T.Vector3(0, 0, 1), euler = new T.Euler(), q0 = new T.Quaternion();
      var q1 = new T.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° about X
      var out = new T.Quaternion();
      function onOrient(e){
        if (e.alpha == null && e.beta == null && e.gamma == null) return;
        var a = (e.alpha || 0) * Math.PI / 180, b = (e.beta || 0) * Math.PI / 180, g = (e.gamma || 0) * Math.PI / 180;
        var orient = (((screen.orientation && screen.orientation.angle) || window.orientation || 0)) * Math.PI / 180;
        euler.set(b, a, -g, 'YXZ');
        out.setFromEuler(euler);
        out.multiply(q1);
        out.multiply(q0.setFromAxisAngle(zee, -orient));
        devQ = devQ || out.clone(); devQ.copy(out);
        devSeen = (window.performance ? performance.now() : Date.now());
      }
      try { window.addEventListener('deviceorientation', onOrient, { passive: true }); } catch(e){}
      try {
        window.addEventListener('touchend', function rq(){
          window.removeEventListener('touchend', rq);
          try {
            var DOE = window.DeviceOrientationEvent;
            if (DOE && typeof DOE.requestPermission === 'function'){
              DOE.requestPermission().then(function(s){ if (s === 'granted') window.addEventListener('deviceorientation', onOrient, { passive: true }); }).catch(function(){});
            }
          } catch(e){}
        }, { passive: true });
      } catch(e){}
    })();
  }

  // ── Stabilizer (decoupled render-rate smoother + orientation coast) ───────
  // Content rides a "stage" that EASES toward MindAR's pose each render frame (a
  // light low-pass — takes the edge off jitter without adding lag). When tracking
  // drops, it COASTS with the phone orientation (above) so it stays glued to the
  // card, then snaps back on re-lock.
  if (window.AFRAME && AFRAME.registerComponent && AFRAME.THREE && !AFRAME.components['card-stabilizer']){
    var _T = AFRAME.THREE;
    var TAU = 0.05;        // s — smoothing time constant. Small = snappy. THE dial:
                           //     ↑ (0.08–0.12) for steadier-but-softer, ↓ for snappier.
    var COAST_MS = 1200;   // ms — how long to coast (stay glued) through a loss before
                           //     giving up and hiding.
    AFRAME.registerComponent('card-stabilizer', {
      // target = a CSS selector STRING (resolved lazily in tick — the anchor isn't
      // in the document when this attribute is set).
      schema: { target: { type: 'string' } },
      init: function(){
        this._p = new _T.Vector3(); this._q = new _T.Quaternion(); this._s = new _T.Vector3();
        this.locked = false; this.src = null; this.lastSeen = 0;
        // coast snapshot: last good displayed pose + the device orientation then.
        this.cP = new _T.Vector3(); this.cQ = new _T.Quaternion(); this.cRef = new _T.Quaternion();
        this.cRefValid = false; this._cr = new _T.Quaternion();
        this.el.object3D.visible = false; // hidden until the target is found
      },
      tick: function(t, dt){
        if (!this.src){ this.src = document.querySelector(this.data.target); if (!this.src) return; }
        var so = this.src.object3D, o = this.el.object3D;
        if (!so) return;
        var now = (window.performance ? performance.now() : Date.now());
        if (!so.visible){
          // TRACK LOST. Coast with the phone orientation so it stays on the card.
          var canCoast = this.locked && this.cRefValid && devQ && (now - devSeen) < 1000 && (now - this.lastSeen) < COAST_MS;
          if (canCoast){
            o.visible = true;
            window.__ARSTATE__ = 'COASTING';
            // coastRot = cRef · devQ⁻¹  (undo the phone's rotation since the loss)
            this._cr.copy(devQ).invert().premultiply(this.cRef);
            o.quaternion.copy(this._cr).multiply(this.cQ);
            o.position.copy(this.cP).applyQuaternion(this._cr);
          } else {
            // No orientation (e.g. iOS w/o grant) or coast expired → hide rather
            // than freeze to the screen. Never "stuck to camera".
            if (o.visible) o.visible = false; this.locked = false;
            window.__ARSTATE__ = 'LOST';
          }
          return;
        }
        so.updateWorldMatrix(true, false);
        so.matrixWorld.decompose(this._p, this._q, this._s);
        o.visible = true; this.lastSeen = now; window.__ARSTATE__ = 'TRACKING';
        if (!this.locked){ // snap on (re)acquire — don't ease from a stale pose
          o.position.copy(this._p); o.quaternion.copy(this._q); o.scale.copy(this._s);
          this.locked = true;
        } else {
          var k = 1 - Math.exp(-((dt || 16) / 1000) / TAU);
          o.quaternion.slerp(this._q, k);
          o.position.lerp(this._p, k);
          o.scale.lerp(this._s, k);
        }
        // Refresh the coast snapshot every good frame: the displayed pose + the
        // phone orientation that goes with it.
        this.cP.copy(o.position); this.cQ.copy(o.quaternion);
        if (devQ){ this.cRef.copy(devQ); this.cRefValid = true; }
      }
    });
  }
  function fail(t){ log('fail:', t); if (pctEl) pctEl.textContent = t; statusEl.classList.remove('hide', 'done'); rnPost({ type: 'ar-error', message: t }); }
  function ready(){
    arReadyFired = true;
    setProg(100);
    rnPost({ type: 'ar-ready' });
    // Fade the branded loader out to reveal the live camera (no hard cut/black).
    statusEl.classList.add('done');
    setTimeout(function(){ statusEl.classList.add('hide'); }, 480);
  }

  function loadImage(url){
    return new Promise(function(res, rej){
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function(){ res(img); }; img.onerror = rej; img.src = url;
    });
  }

  // One soft round shadow texture (radial dark → transparent), generated once and
  // shared. A flat copy is laid on the card UNDER each 3D model so the model reads
  // as PLANTED on the card instead of floating beside it — the single biggest cue
  // that "it's sitting where I put it" at oblique viewing angles.
  var SHADOW_TEX = (function(){
    try {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d'); if (!g) return null;
      var rad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
      rad.addColorStop(0, 'rgba(0,0,0,0.42)');
      rad.addColorStop(0.55, 'rgba(0,0,0,0.20)');
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad; g.fillRect(0, 0, 128, 128);
      return c.toDataURL('image/png');
    } catch(e){ return null; }
  })();

  // A flat contact shadow for a model element, on the card plane (z≈0) under the
  // model's base. Sized to the model's footprint (auto-fit makes rendered size ≈
  // 0.3·scale card-widths). Not clickable; doesn't write depth (sits on the card).
  function buildShadow(el){
    if (el.type !== 'model' || !SHADOW_TEX) return null;
    var sc = Number(el.scale) > 0 ? Number(el.scale) : 1;
    var size = 0.36 * sc; if (size < 0.08) size = 0.08;
    var p = Array.isArray(el.position) ? el.position : [0, 0, 0];
    var sh = document.createElement('a-image');
    sh.setAttribute('src', SHADOW_TEX);
    sh.setAttribute('width', size); sh.setAttribute('height', size);
    sh.setAttribute('position', p[0] + ' ' + p[1] + ' 0.004');
    sh.setAttribute('material', 'transparent: true; depthWrite: false; opacity: 0.9');
    return sh;
  }

  function buildElement(el){
    var node;
    if (el.type === 'model' && el.url){
      node = document.createElement('a-gltf-model');
      node.setAttribute('src', el.url);
      if (el.animated) node.setAttribute('animation-mixer', 'loop: repeat');
    } else if (el.type === 'image' && el.url){
      node = document.createElement('a-image');
      node.setAttribute('src', el.url);
      node.setAttribute('width', 0.3); node.setAttribute('height', 0.3);
    } else if (el.type === 'social'){
      node = document.createElement('a-entity');
      var bg = document.createElement('a-plane');
      bg.setAttribute('width', 0.26); bg.setAttribute('height', 0.26);
      bg.setAttribute('color', el.color || '#0A66C2');
      bg.setAttribute('material', 'shader: flat');
      bg.setAttribute('geometry', 'primitive: plane');
      node.appendChild(bg);
      var t = document.createElement('a-text');
      t.setAttribute('value', el.label || 'Link'); t.setAttribute('align', 'center');
      t.setAttribute('color', '#ffffff'); t.setAttribute('width', 0.6);
      t.setAttribute('position', '0 0 0.01');
      node.appendChild(t);
    } else if (el.type === 'video' && el.url){
      node = document.createElement('a-video');
      node.setAttribute('src', el.url);
      node.setAttribute('width', 0.5); node.setAttribute('height', 0.3);
      node.setAttribute('autoplay', 'true'); node.setAttribute('loop', 'true');
      node.setAttribute('playsinline', 'true');
      // Mobile browsers block autoplay with sound — muted is required or the
      // video never starts. (Audio-on video would need a tap-to-unmute flow.)
      node.setAttribute('muted', 'true');
    } else if (el.type === 'text' && el.text){
      node = document.createElement('a-text');
      node.setAttribute('value', el.text);
      node.setAttribute('align', 'center');
      node.setAttribute('color', el.color || '#18181b');
      // Match the editor's fontSize 0.12 (drei Text): a-text glyph size ≈
      // width / wrapCount, so 1.4 / 16 ≈ 0.0875 → ~0.12 cap height. Without this
      // (width:1.2, default wrapCount 40) text rendered ~3× too small in AR.
      node.setAttribute('width', 1.4);
      node.setAttribute('wrap-count', 16);
      node.setAttribute('baseline', 'center');
      node.setAttribute('anchor', 'center');
    }
    if (!node) return null;
    var p = el.position || [0,0,0.15];
    node.setAttribute('position', p[0] + ' ' + p[1] + ' ' + p[2]);
    var rad2deg = function(r){ return (r || 0) * 180 / Math.PI; };
    node.setAttribute('rotation', rad2deg(el.rotationX) + ' ' + rad2deg(el.rotationY) + ' ' + rad2deg(el.rotationZ));
    // Effective scale = auto-fit base (1 on older cards) × user multiplier.
    var s = (el.baseScale || 1) * (el.scale || 1);
    node.setAttribute('scale', s + ' ' + s + ' ' + s);
    if (el.spin){
      node.setAttribute('animation__spin', 'property: rotation; to: 0 360 0; loop: true; dur: 6000; easing: linear');
    }
    if (el.link){
      node.classList.add('clickable');
      node.addEventListener('click', function(){ window.open(el.link, '_blank'); });
    }
    return node;
  }

  function start(targetSrc, count){
    var scene = document.createElement('a-scene');
    // maxTrack: 1 — a SINGLE tracking target (the chosen card side). We used to
    // register both sides; one target locks faster, can't mis-switch between two
    // similar-looking sides, and leaves more CPU per frame for a steadier pose.
    //
    // MindAR runs a One-Euro filter on the pose:
    //   cutoff = filterMinCF + filterBeta * |velocity|
    //   • filterMinCF → smoothing floor at LOW speed. This is the lag knob: too low
    //     and slow/moderate motion is smoothed with a multi-SECOND time constant
    //     (we shipped 0.0001 → the model crawled 3–4s behind a moving card). Back
    //     to MindAR's 0.001 default = responsive.
    //   • filterBeta  → how much it relaxes smoothing as the card moves. 1000
    //     (MindAR default) tracks hand-held motion well. (We tried 60 = laggy/float,
    //     5000 = jittery "bubbles"; the default is the balance.)
    // The render-rate stabilizer above adds a light extra smooth — tune THAT (TAU)
    // for stability vs snappiness, NOT these, so we never re-introduce second-scale
    // lag here. missTolerance back to 5 (default): MindAR should DECLARE the loss
    // quickly so our orientation-coast takes over (glued) — a high missTolerance
    // makes MindAR hold the last pose in SCREEN space ("stuck to camera") first.
    // Lever-arm note: content high off the card (big Z/scale) magnifies any
    // residual jitter — models near the surface look most glued.
    scene.setAttribute('mindar-image',
      'imageTargetSrc: ' + targetSrc + '; maxTrack: 1; uiScanning: no; uiLoading: no; uiError: no; ' +
      'filterMinCF: 0.001; filterBeta: 1000; missTolerance: 5; warmupTolerance: 2');
    scene.setAttribute('color-space', 'sRGB');
    // Proper multi-prop syntax (semicolons); alpha keeps the canvas transparent
    // so the MindAR camera feed shows behind the 3D content.
    // No physicallyCorrectLights: it interprets intensity in physical units and
    // left models looking dim in the WebView. Conventional lighting + the values
    // above reads much closer to the editor preview.
    // powerPreference + a capped pixel ratio (set on renderstart below): a single
    // glb over a video doesn't need 3× DPR fragment cost, and a steadier main-
    // thread frame rate means MindAR's pose updates get DRAWN sooner — the overlay
    // tracks more tightly, not just computed more accurately.
    scene.setAttribute('renderer', 'colorManagement: true; alpha: true; powerPreference: high-performance');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
    // We drive our own status overlay — kill A-Frame's default (blue, dotted)
    // loading screen so a stuck camera doesn't just sit on it forever.
    scene.setAttribute('loading-screen', 'enabled: false');

    var cam = document.createElement('a-camera');
    cam.setAttribute('position', '0 0 0');
    cam.setAttribute('look-controls', 'enabled: false');
    cam.setAttribute('cursor', 'rayOrigin: mouse');
    cam.setAttribute('raycaster', 'objects: .clickable');
    scene.appendChild(cam);

    // Scene brightness (owner-controlled in the editor). Default 1.2. Models
    // looked dark partly because there was too little fill light — add a
    // hemisphere + a back fill and scale everything by the chosen brightness.
    var B = (D.lighting && typeof D.lighting.intensity === 'number') ? D.lighting.intensity : 1.2;
    var light = document.createElement('a-entity');
    light.setAttribute('light', 'type: ambient; intensity: ' + (1.1 * B).toFixed(3));
    scene.appendChild(light);
    var hemi = document.createElement('a-entity');
    hemi.setAttribute('light', 'type: hemisphere; intensity: ' + (0.8 * B).toFixed(3) + '; color: #ffffff; groundColor: #b0b4bd');
    scene.appendChild(hemi);
    var dir = document.createElement('a-entity');
    dir.setAttribute('light', 'type: directional; intensity: ' + (1.1 * B).toFixed(3));
    dir.setAttribute('position', '1 2 1');
    scene.appendChild(dir);
    var fill = document.createElement('a-entity');
    fill.setAttribute('light', 'type: directional; intensity: ' + (0.5 * B).toFixed(3));
    fill.setAttribute('position', '-1 1 -1');
    scene.appendChild(fill);

    // One anchor per target index, each carrying its own copy of the scene
    // (DOM nodes can't be shared, so rebuild per anchor). When the stabilizer
    // registered, content rides a DECOUPLED stage that the stabilizer eases toward
    // the anchor (so the anchor's raw per-frame jitter never reaches the model);
    // otherwise content goes straight on the anchor (original behaviour).
    var hasStab = !!(window.AFRAME && AFRAME.components && AFRAME.components['card-stabilizer']);
    log('stabilizer ' + (hasStab ? 'on' : 'off'));
    // Persistence: only nag "Point at the card" if the target stays lost a while —
    // a quick blur/move must NOT flash the hint while the model is still shown.
    var lostTimer = null;
    function showHint(){ lostTimer = null; hintEl.textContent = 'Point at the card'; }
    function onFound(){ log('targetFound'); if (lostTimer){ clearTimeout(lostTimer); lostTimer = null; } hintEl.textContent = ''; }
    function onLost(){ log('targetLost'); if (lostTimer) clearTimeout(lostTimer); lostTimer = setTimeout(showHint, 2600); }
    for (var i = 0; i < count; i++){
      var anchor = document.createElement('a-entity');
      anchor.setAttribute('mindar-image-target', 'targetIndex: ' + i);
      anchor.addEventListener('targetFound', onFound);
      anchor.addEventListener('targetLost', onLost);
      if (hasStab){
        anchor.id = 'mindar-anchor-' + i;
        scene.appendChild(anchor);
        var stage = document.createElement('a-entity');
        (D.elements || []).forEach(function(el){ var sh = buildShadow(el); if (sh) stage.appendChild(sh); var n = buildElement(el); if (n) stage.appendChild(n); });
        scene.appendChild(stage);
        stage.setAttribute('card-stabilizer', 'target: #mindar-anchor-' + i);
      } else {
        (D.elements || []).forEach(function(el){ var sh = buildShadow(el); if (sh) anchor.appendChild(sh); var n = buildElement(el); if (n) anchor.appendChild(n); });
        scene.appendChild(anchor);
      }
    }

    document.getElementById('scene').appendChild(scene);
    log('scene appended, targets=' + count);
    // MindAR sizes the camera video + 3D projection from the container at init —
    // in a WebView the full height isn't ready yet, so it letterboxes (black band)
    // and the overlay lands off-card. Nudge it to recompute as the view settles.
    // A-Frame re-applies the FULL devicePixelRatio every time it handles a resize,
    // so capDpr runs at the tail of every relayout to keep the cap in force.
    function relayout(){ try { window.dispatchEvent(new Event('resize')); } catch(e){} capDpr(); }
    scene.addEventListener('loaded', function(){ log('scene loaded'); setProg(82); });
    // Cap render resolution to ~2× DPR. Phones report 3–3.5×; rendering the
    // transparent overlay that high is wasted GPU fill for one model and drags the
    // frame rate (which makes tracking updates land late = laggy feel). 2× is
    // still crisp. (Function declaration → hoisted, so relayout above can call it.)
    function capDpr(){ try { if (scene.renderer) scene.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch(e){} }
    scene.addEventListener('renderstart', function(){ log('renderstart'); setProg(92); relayout(); setTimeout(relayout, 500); });
    scene.addEventListener('arReady', function(){
      log('arReady');
      ready();
      hintEl.textContent = 'Point at the card';
      [100, 400, 900, 1800].forEach(function(ms){ setTimeout(relayout, ms); });
      // Probe the camera video + canvas so a black screen is diagnosable.
      setTimeout(function(){
        try {
          var v = document.querySelector('video');
          var c = document.querySelector('canvas.a-canvas') || document.querySelector('canvas');
          if (v){ var vs = getComputedStyle(v); log('video ' + v.videoWidth + 'x' + v.videoHeight + ' css=' + vs.width + 'x' + vs.height + ' fit=' + vs.objectFit + ' play=' + (!v.paused)); }
          else { log('video: none'); }
          if (c){ var cs = getComputedStyle(c); log('canvas css=' + cs.width + 'x' + cs.height + ' bg=' + cs.backgroundColor); }
        } catch(err){ log('probe err: ' + (err && err.message)); }
      }, 1500);
    });
    scene.addEventListener('arError', function(){ fail('Camera unavailable. Close and reopen, and make sure no other app is using the camera.'); });
    // Watchdog: if the camera/tracker never comes up, say so instead of hanging.
    setTimeout(function(){
      if (!arReadyFired) fail('Camera didn\\u2019t start. Close and reopen AR; if it keeps happening, fully close the app so the camera is free.');
    }, 18000);
  }

  async function init(){
    try {
      // WebView capability probe — MindAR's worker needs these; a missing one is
      // the usual cause of a masked worker "Script error." in an in-app WebView.
      log('env OffscreenCanvas=' + (typeof OffscreenCanvas !== 'undefined') +
          ' createImageBitmap=' + (typeof createImageBitmap !== 'undefined') +
          ' WASM=' + (typeof WebAssembly !== 'undefined') +
          ' Worker=' + (typeof Worker !== 'undefined'));
      log('ua=' + navigator.userAgent);
      log('init, targets=' + JSON.stringify(D.targets || []));
      if (!window.MINDAR || !window.MINDAR.IMAGE || !window.MINDAR.IMAGE.Compiler){ fail('AR engine failed to load.'); return; }
      setProg(10); // engine (A-Frame + MindAR) parsed

      // FAST PATH: a prebuilt .mind (compiled once in the editor) — just download
      // and start, skipping the multi-second on-device feature-extraction compile.
      // Any failure falls through to the runtime-compile path below.
      if (D.mindUrl){
        try {
          log('prebuilt mind: ' + D.mindUrl);
          var mResp = await fetch(D.mindUrl, { cache: 'force-cache' });
          if (!mResp.ok) throw new Error('http ' + mResp.status);
          setProg(45);
          var mBuf = await mResp.arrayBuffer();
          if (!mBuf || !mBuf.byteLength) throw new Error('empty');
          setProg(72);
          var mCount = (D.mindTargetCount && D.mindTargetCount > 0) ? D.mindTargetCount : ((D.targets || []).filter(Boolean).length || 1);
          log('prebuilt mind ' + mBuf.byteLength + 'B, targets=' + mCount + ' — starting scene');
          start(URL.createObjectURL(new Blob([mBuf])), mCount);
          return;
        } catch(me){ log('prebuilt mind failed (' + (me && me.message) + '), runtime-compiling'); setProg(10); }
      }

      var urls = (D.targets || []).filter(Boolean);
      if (!urls.length){ fail('This card isn\\u2019t set up for AR tracking yet.'); return; }
      log('loading ' + urls.length + ' target image(s)');
      // Resilient: one bad/missing photo URL shouldn't kill AR — track on
      // whichever targets load.
      var results = await Promise.allSettled(urls.map(loadImage));
      var imgs = results.filter(function(r){ return r.status === 'fulfilled'; }).map(function(r){ return r.value; });
      if (!imgs.length){ fail('Could not load the card image. Check your connection and try again.'); return; }
      log('loaded ' + imgs.length + '/' + urls.length + ', compiling');
      setProg(20); // card image(s) downloaded
      var compiler = new window.MINDAR.IMAGE.Compiler();
      // Feature extraction is the slow phase — drive the bar with its real
      // progress callback (0..1) across the 20–70% band so it never looks stuck.
      await compiler.compileImageTargets(imgs, function(p){
        var pp = Number(p) || 0; if (pp > 1) pp = pp / 100; // MindAR reports 0..1 or 0..100
        setProg(20 + pp * 50);
      });
      var buffer = await compiler.exportData();
      setProg(72);
      log('compiled, starting scene');
      start(URL.createObjectURL(new Blob([buffer])), imgs.length);
    } catch(e){ log('init error: ' + (e && e.message)); fail('Could not start AR. Make sure camera access is allowed.'); }
  }
  init();
})();
</script>
</body>
</html>`;
}
