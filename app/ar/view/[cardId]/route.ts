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
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
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
  const sceneCard = (m.scene && typeof m.scene === "object" ? (m.scene as any).card : null) ?? {};
  let targets: string[] = [sceneCard.frontUrl, sceneCard.backUrl].filter(isHttp);
  if (targets.length === 0 && isHttp(m.reference_image_path)) targets = [m.reference_image_path];
  targets = Array.from(new Set(targets));

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
        rotationY: Number(el.rotationY) || 0,
        scale: Number(el.scale) || 1,
        animated: !!el.animated,
        spin: !!el.spin,
      };
    });

  if (targets.length === 0) return fallback("This card isn’t set up for AR tracking yet.");

  return page(viewerHtml({ targets, elements }));
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
  html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,sans-serif;color:#fff}
  #status{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;z-index:30;background:#0a0a0a}
  #status.hide{display:none}
  .spin{width:34px;height:34px;border:3px solid rgba(255,255,255,.2);border-top-color:#F59E0B;border-radius:50%;animation:r 1s linear infinite;margin:0 auto 14px}
  @keyframes r{to{transform:rotate(360deg)}}
  #hint{position:fixed;top:16px;left:0;right:0;text-align:center;z-index:20;pointer-events:none;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  /* MindAR injects + sizes the camera <video> itself; we only keep the WebGL
     canvas transparent and above it so the live feed shows through. Don't resize
     the video here — MindAR aligns the 3D overlay to its own video dimensions. */
  .a-canvas{background-color:transparent !important;z-index:1 !important}
  video{z-index:0 !important}
</style>
</head>
<body>
<div id="status"><div><div class="spin"></div><div id="msg">Preparing AR…</div></div></div>
<div id="hint"></div>
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
})();
</script>
<script src="${AFRAME}" crossorigin="anonymous"></script>
<script src="${MINDAR}" crossorigin="anonymous"></script>
<script>
(function(){
  var D = window.__AR__ || {};
  var statusEl = document.getElementById('status');
  var msgEl = document.getElementById('msg');
  var hintEl = document.getElementById('hint');
  var arReadyFired = false;
  var log = window.__ARLOG__ || function(){};

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
  function fail(t){ log('fail:', t); msgEl.textContent = t; statusEl.classList.remove('hide'); }
  function ready(){ arReadyFired = true; statusEl.classList.add('hide'); }

  function loadImage(url){
    return new Promise(function(res, rej){
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function(){ res(img); }; img.onerror = rej; img.src = url;
    });
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
      node.setAttribute('width', 1.2);
      node.setAttribute('baseline', 'center');
    }
    if (!node) return null;
    var p = el.position || [0,0,0.15];
    node.setAttribute('position', p[0] + ' ' + p[1] + ' ' + p[2]);
    node.setAttribute('rotation', '0 ' + ((el.rotationY || 0) * 180 / Math.PI) + ' 0');
    var s = el.scale || 1;
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
    // maxTrack: 1 — only one side is ever visible at a time; we still register
    // every card photo as a target so AR fires for whichever one is shown.
    scene.setAttribute('mindar-image', 'imageTargetSrc: ' + targetSrc + '; maxTrack: 1; uiScanning: no; uiLoading: no; uiError: no');
    scene.setAttribute('color-space', 'sRGB');
    // Proper multi-prop syntax (semicolons); alpha keeps the canvas transparent
    // so the MindAR camera feed shows behind the 3D content.
    scene.setAttribute('renderer', 'colorManagement: true; physicallyCorrectLights: true; alpha: true');
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

    var light = document.createElement('a-entity');
    light.setAttribute('light', 'type: ambient; intensity: 1');
    scene.appendChild(light);
    var dir = document.createElement('a-entity');
    dir.setAttribute('light', 'type: directional; intensity: 0.6');
    dir.setAttribute('position', '1 2 1');
    scene.appendChild(dir);

    // One anchor per target index, each carrying its own copy of the scene
    // (DOM nodes can't be shared, so rebuild per anchor).
    for (var i = 0; i < count; i++){
      var anchor = document.createElement('a-entity');
      anchor.setAttribute('mindar-image-target', 'targetIndex: ' + i);
      (D.elements || []).forEach(function(el){ var n = buildElement(el); if (n) anchor.appendChild(n); });
      anchor.addEventListener('targetFound', function(){ hintEl.textContent = ''; });
      anchor.addEventListener('targetLost', function(){ hintEl.textContent = 'Point at the card'; });
      scene.appendChild(anchor);
    }

    document.getElementById('scene').appendChild(scene);
    log('scene appended, targets=' + count);
    scene.addEventListener('loaded', function(){ log('scene loaded'); });
    scene.addEventListener('renderstart', function(){ log('renderstart'); });
    scene.addEventListener('arReady', function(){
      log('arReady');
      ready();
      hintEl.textContent = 'Point at the card';
      // Probe the camera video + canvas so a black screen is diagnosable.
      setTimeout(function(){
        try {
          var v = document.querySelector('video');
          var c = document.querySelector('canvas.a-canvas') || document.querySelector('canvas');
          if (v){ var vs = getComputedStyle(v); log('video ' + v.videoWidth + 'x' + v.videoHeight + ' play=' + (!v.paused) + ' disp=' + vs.display + ' vis=' + vs.visibility + ' z=' + vs.zIndex + ' op=' + vs.opacity); }
          else { log('video: none'); }
          if (c){ var cs = getComputedStyle(c); log('canvas bg=' + cs.backgroundColor + ' z=' + cs.zIndex + ' op=' + cs.opacity); }
        } catch(err){ log('probe err: ' + (err && err.message)); }
      }, 800);
    });
    scene.addEventListener('arError', function(){ fail('Camera unavailable. Close and reopen, and make sure no other app is using the camera.'); });
    // Watchdog: if the camera/tracker never comes up, say so instead of hanging.
    setTimeout(function(){
      if (!arReadyFired) fail('Camera didn\\u2019t start. Close and reopen AR; if it keeps happening, fully close the app so the camera is free.');
    }, 11000);
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
      var urls = (D.targets || []).filter(Boolean);
      if (!urls.length){ fail('This card isn\\u2019t set up for AR tracking yet.'); return; }
      log('loading ' + urls.length + ' target image(s)');
      // Resilient: one bad/missing photo URL shouldn't kill AR — track on
      // whichever targets load.
      var results = await Promise.allSettled(urls.map(loadImage));
      var imgs = results.filter(function(r){ return r.status === 'fulfilled'; }).map(function(r){ return r.value; });
      if (!imgs.length){ fail('Could not load the card image. Check your connection and try again.'); return; }
      log('loaded ' + imgs.length + '/' + urls.length + ', compiling');
      var compiler = new window.MINDAR.IMAGE.Compiler();
      await compiler.compileImageTargets(imgs, function(){});
      var buffer = await compiler.exportData();
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
