/**
 * 8th Wall WebAR viewer — the ONLY engine (the MindAR fallback was removed).
 * Renders the owner's composed scene anchored on the printed card via 8th Wall's
 * image targets + World Tracking (SLAM) with IMU fusion, so content stays glued
 * at oblique angles and doesn't shimmer (the old paid 8th Wall / Kivicube tech,
 * free + open-source since Niantic, Feb 2026).
 *
 * Standalone HTML loaded by the app's WebView. Scene model = the SAME A-Frame
 * element set the editor produces; only the tracking SYSTEM differs from before:
 *   <a-scene xrweb>  +  a custom kt-image-anchor entity.
 *
 * The anchor is OUR component (kt-image-anchor, defined in buildScene), NOT
 * xrextras-named-image-target: the xrextras one hides content the instant the
 * image is lost and hard-copies the raw pose every frame (= flashing + shimmer,
 * and the model "slips" the moment the card leaves frame). Ours smooths the pose,
 * rejects lone outlier frames, and — with World Tracking on — holds the model in
 * place via SLAM through image losses, so it stays glued at oblique angles and
 * never blinks out. It listens to the same low-level engine events
 * (xrimagefound/updated/lost), so it needs no extra library.
 *
 * Engine pieces (all allowed by the /ar CSP):
 *  - 8frame 1.5.0 — 8th Wall's A-Frame build (vendored to /ar8; bundles the xrweb
 *    integration vanilla A-Frame lacks).
 *  - @8thwall/engine-binary — camera + SLAM ("data-preload-chunks=slam"), and the
 *    source of the xrimagefound/updated/lost scene events kt-image-anchor consumes.
 *  - @8thwall/xrextras — still loaded for its scene plumbing, but we no longer use
 *    its named-image-target or its off-theme loading / landing-page / runtime-error
 *    UI: this page draws its own KaunTech-themed loader + permission gate instead.
 *
 * CROSS-DEVICE START: World Tracking needs the device IMU. Android Chrome grants
 * DeviceMotion silently, but iOS (incl. in WKWebView) requires a USER GESTURE to
 * call DeviceMotionEvent.requestPermission(). So on iOS we show a themed "Tap to
 * start" button and post {type:'ar-awaiting-tap'} so the app reveals the WebView
 * (its opaque loader would otherwise swallow the tap). On tap we request motion +
 * orientation, then start the AR pipeline. Android/desktop start automatically.
 *
 * Image target: built in the browser. The viewer loads the target image, reads
 * its real dimensions, and configures a PLANAR target with imagePath = that image
 * (a grayscale luminance when the editor precompiled one, else the card photo).
 */

const ENGINE = "https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js";
const XREXTRAS = "https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js";
// 8th Wall's A-Frame 1.5.0 build — no CDN/npm exists, vendored, served same-origin.
const EIGHTFRAME = "/ar8/8frame-1.5.0.min.js";

export interface EightwallView {
  elements: unknown[];
  lighting: { intensity: number };
  /** The card's image target. The viewer reads its real pixel dimensions. */
  target: { imageUrl: string; name: string };
  /** World Tracking (SLAM) on = glued at all angles + survives the card leaving
   *  frame; needs the IMU. Off = pure image tracking (no motion permission). */
  worldTracking: boolean;
}

export function eightwallViewerHtml(view: EightwallView): string {
  const json = JSON.stringify(view).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>AR Card</title>
<style>
  html,body{margin:0;height:100%;background:#0B0D12;overflow:hidden;font-family:-apple-system,system-ui,"Segoe UI",sans-serif;color:#fff}
  /* KaunTech-themed loader / start gate — matches the in-app loader (dark base,
     orange accent). Fades out once AR is live. */
  #status{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;z-index:30;
    background:radial-gradient(120% 80% at 50% 0%, #15110a 0%, #0B0D12 60%);transition:opacity .45s ease}
  #status.done{opacity:0}
  #status.hide{display:none}
  .ld{width:min(300px,82vw);display:flex;flex-direction:column;align-items:center}
  .ld-logo{font-size:18px;font-weight:600;letter-spacing:.3px;margin-bottom:22px}
  .ld-logo b{color:#F59E0B;font-weight:700}
  .ld-track{width:100%;height:6px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden}
  .ld-bar{height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#F59E0B,#fbbf24);transition:width .3s ease}
  .ld-pct{margin-top:12px;font-size:13px;color:#9AA3B2;font-variant-numeric:tabular-nums}
  /* Start gate (iOS motion permission needs a tap) */
  #startbox{display:none;flex-direction:column;align-items:center}
  #startbox.show{display:flex}
  /* Base styles live HERE, not inline: an inline style:display:flex would beat the
     .hide class (inline > class specificity), so the loader could never be hidden
     and showed UNDER the iOS "Tap to start" gate / the desktop gate. */
  #loadbox{width:100%;display:flex;flex-direction:column;align-items:center}
  #loadbox.hide{display:none}
  .st-sub{font-size:14px;color:#9AA3B2;line-height:1.5;margin-bottom:22px;max-width:260px}
  .st-btn{appearance:none;border:none;cursor:pointer;background:#F59E0B;color:#1A1206;font-size:16px;font-weight:700;
    padding:14px 30px;border-radius:14px;box-shadow:0 6px 20px rgba(245,158,11,.35);transition:transform .12s ease}
  .st-btn:active{transform:scale(.96)}
  .st-cam{width:46px;height:46px;border-radius:50%;background:rgba(245,158,11,.14);display:flex;align-items:center;justify-content:center;margin-bottom:18px}
  /* Error state */
  #err{display:none;flex-direction:column;align-items:center}
  #err.show{display:flex}
  .er-msg{font-size:15px;color:#E6EDF3;line-height:1.5;margin-bottom:20px;max-width:280px}
  /* Desktop gate (AR is a phone/tablet experience) */
  #desktop{display:none;flex-direction:column;align-items:center}
  #desktop.show{display:flex}
  .dk-icon{width:54px;height:54px;border-radius:16px;background:rgba(245,158,11,.14);display:flex;align-items:center;justify-content:center;margin-bottom:18px}
  .dk-title{font-size:20px;font-weight:700;margin-bottom:10px}
  .dk-sub{font-size:14px;color:#9AA3B2;line-height:1.55;max-width:300px;margin-bottom:20px}
  .dk-qr{background:#fff;padding:12px;border-radius:14px;line-height:0;min-width:80px;min-height:80px;margin-bottom:14px}
  .dk-qr img{display:block;width:184px;height:184px;image-rendering:pixelated}
  .dk-url{font-size:12px;color:#6B7280;word-break:break-all;max-width:300px}
  #hint{position:fixed;top:16px;left:0;right:0;text-align:center;z-index:20;pointer-events:none;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  #dbg{position:fixed;top:8px;left:8px;z-index:40;display:none;font:600 12px/1.45 ui-monospace,Menlo,monospace;
    color:#7CFFB2;background:rgba(0,0,0,.62);padding:7px 9px;border-radius:8px;white-space:pre;pointer-events:none}
</style>
<script crossorigin="anonymous" src="${EIGHTFRAME}"></script>
<script src="${ENGINE}" async crossorigin="anonymous" data-preload-chunks="slam"></script>
<script src="${XREXTRAS}" crossorigin="anonymous"></script>
</head>
<body>
<div id="status"><div class="ld">
  <div class="ld-logo">KaunTech <b>AR</b></div>
  <div id="loadbox">
    <div class="ld-track"><div id="bar" class="ld-bar"></div></div>
    <div id="pct" class="ld-pct">Starting…</div>
  </div>
  <div id="startbox">
    <div class="st-cam" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    </div>
    <div class="st-sub">Allow camera &amp; motion, then point at the card.</div>
    <button id="startbtn" class="st-btn">Tap to start AR</button>
  </div>
  <div id="err">
    <div id="ermsg" class="er-msg">AR couldn’t start.</div>
    <button id="retrybtn" class="st-btn">Try again</button>
  </div>
  <div id="desktop">
    <div class="dk-icon" aria-hidden>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
    </div>
    <div class="dk-title">Open on your phone</div>
    <div class="dk-sub">This AR card comes to life on a phone or tablet — point its camera at the printed KaunTech card. Scan this code to open it on your phone.</div>
    <div id="qr" class="dk-qr"></div>
    <div id="dkurl" class="dk-url"></div>
  </div>
</div></div>
<div id="hint"></div>
<div id="dbg"></div>
<script>window.__AR__ = ${json};</script>
<script>
(function(){
  var D = window.__AR__ || {};
  var statusEl = document.getElementById('status');
  var loadBox = document.getElementById('loadbox');
  var startBox = document.getElementById('startbox');
  var errBox = document.getElementById('err');
  var barEl = document.getElementById('bar');
  var pctEl = document.getElementById('pct');
  var hintEl = document.getElementById('hint');
  var startBtn = document.getElementById('startbtn');
  var retryBtn = document.getElementById('retrybtn');
  var ermsgEl = document.getElementById('ermsg');
  var lastProg = 0, arReadyFired = false, started = false, awaiting = false;
  // Effective world-tracking for THIS run. Starts from the server's choice but can
  // drop to false (image-only) if motion is denied or SLAM doesn't come up, so AR
  // still works on every device.
  var wt = !!D.worldTracking;

  // The loaded target image's real pixel size (set once dims resolve). Used to
  // decide the orientation correction below.
  var targetDims = null;
  // ── Editor↔viewer orientation calibration ──────────────────────────────────
  // The editor composes the scene on the card lying in its own X-Y plane (content
  // floating out along +Z). 8th Wall canonicalizes a LANDSCAPE planar target to
  // portrait before tracking (its isRotated behaviour), so authored content lands
  // turned 90° about the card normal vs what the owner arranged in the editor — a
  // portrait target needs no such turn (8th Wall's own flyer example overlays
  // content at rotation 0). So we spin the whole content group back about the card
  // normal (Z) for landscape targets, making the published view match the editor
  // exactly. ?cal=<deg> forces a specific angle for on-device sign-checking.
  var calParam = (function(){ var m = /[?&]cal=(-?\d+(?:\.\d+)?)/i.exec(location.search); return m ? parseFloat(m[1]) : null; })();
  function targetCorrectionZ(){
    if (calParam !== null) return calParam;
    var d = targetDims || {};
    if (d.w && d.h && d.w > d.h) return -90; // landscape → undo 8th Wall's +90° canonical turn
    return 0;                                 // portrait/square → already aligned
  }

  function log(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage('[ARView8] ' + Array.prototype.join.call(arguments, ' ')); } catch(e){} }
  function rnPost(obj){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){} }
  function setProg(v){ v = Math.max(lastProg, Math.min(100, Math.round(v))); lastProg = v; if (barEl) barEl.style.width = v + '%'; if (pctEl) pctEl.textContent = v < 100 ? v + '%' : 'Ready'; rnPost({ type: 'ar-progress', value: v }); }
  function ready(){
    if (arReadyFired) return; arReadyFired = true; setProg(100);
    rnPost({ type: 'ar-ready' });
    statusEl.classList.add('done'); setTimeout(function(){ statusEl.classList.add('hide'); }, 480);
  }
  function showError(msg){
    if (ermsgEl) ermsgEl.textContent = msg || 'AR couldn’t start.';
    loadBox.classList.add('hide'); startBox.classList.remove('show'); errBox.classList.add('show');
    statusEl.classList.remove('done', 'hide');
    rnPost({ type: 'ar-error', message: msg });
  }
  if (retryBtn) retryBtn.addEventListener('click', function(){ location.reload(); });

  // ── Mobile-only gate ────────────────────────────────────────────────────────
  // AR needs the rear camera (+ motion) — pointless on a desktop PC/Mac. Detect
  // CLIENT-SIDE (not via the UA header) so a phone/tablet in "Request Desktop Site"
  // mode still passes: its UA is spoofed to a desktop string, but the device still
  // reports multi-touch, which no conventional PC/Mac does.
  function isMobileDevice(){
    try {
      if (/[?&]force=1/i.test(location.search)) return true;   // dev/test bypass
      if (window.ReactNativeWebView) return true;              // the KaunTech app (phone-only)
      var ua = navigator.userAgent || '';
      if (/Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
      var uad = navigator.userAgentData;
      if (uad && uad.mobile === true) return true;
      // Touch-first device (incl. iPadOS/Android desktop-mode, where the UA lies):
      // multi-touch + a coarse primary pointer = a real phone/tablet, not a PC/Mac.
      var touch = (navigator.maxTouchPoints || 0) > 1;
      var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      if (touch && coarse) return true;
      // iPadOS in desktop mode reports as "Macintosh" but is multi-touch (no Mac is).
      if (/Macintosh/i.test(ua) && touch) return true;
      return false;
    } catch(e){ return true; } // never hard-block on a detection error
  }
  function showDesktopGate(){
    try {
      window.__ARSTATE__ = 'DESKTOP';
      rnPost({ type: 'ar-desktop' });
      loadBox.classList.add('hide');
      if (startBox) startBox.classList.remove('show');
      if (errBox) errBox.classList.remove('show');
      statusEl.classList.remove('done', 'hide');
      var dk = document.getElementById('desktop'); if (dk) dk.classList.add('show');
      var urlEl = document.getElementById('dkurl'); if (urlEl) urlEl.textContent = location.host + location.pathname;
      // QR of this exact URL so a desktop visitor can jump to it on their phone.
      // qrcode-generator (jsDelivr — already allowed by the /ar script-src) renders
      // to a data-URI <img> (allowed by img-src data:), so no CSP change is needed.
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
      s.crossOrigin = 'anonymous';
      s.onload = function(){
        // Encode the CLEAN card URL (no internal ?worldtracking/?debug/etc.) so the
        // phone gets the full default experience.
        try { var qr = window.qrcode(0, 'M'); qr.addData(location.origin + location.pathname); qr.make();
          var box = document.getElementById('qr'); if (box) box.innerHTML = qr.createImgTag(5, 0); } catch(e){}
      };
      document.head.appendChild(s);
    } catch(e){}
  }
  if (!isMobileDevice()){ showDesktopGate(); return; }

  setProg(6);
  log('engine: 8th Wall; worldTracking=' + (D.worldTracking ? 'on' : 'off'));

  // Diagnostic HUD (?debug=1).
  (function(){
    try {
      if (!/[?&]debug/i.test(location.search)) return;
      var el = document.getElementById('dbg'); if (!el) return; el.style.display = 'block';
      var frames = 0, t0 = (window.performance ? performance.now() : Date.now()), fps = 0;
      (function loop(){
        frames++; var t = (window.performance ? performance.now() : Date.now());
        if (t - t0 >= 500){ fps = Math.round(frames * 1000 / (t - t0)); frames = 0; t0 = t; }
        el.textContent = 'build: 8thwall-v2\\n' + 'SLAM: ' + (D.worldTracking ? 'on' : 'off') + '\\n' +
          'fps: ' + fps + '\\n' + 'state: ' + (window.__ARSTATE__ || 'starting') + '\\n' +
          'corrZ: ' + targetCorrectionZ() + '°';
        requestAnimationFrame(loop);
      })();
    } catch(e){}
  })();

  // ── readiness primitives ───────────────────────────────────────────────────
  function whenXR8(cb){ if (window.XR8) cb(); else window.addEventListener('xrloaded', cb); }
  function whenAframe(cb){
    if (window.AFRAME) return cb();
    var iv = setInterval(function(){ if (window.AFRAME){ clearInterval(iv); cb(); } }, 50);
  }
  // Load the target image to read its real pixel size (the PLANAR target's
  // originalWidth/Height). Falls back to a business-card default if it can't load,
  // so startup never blocks on a slow/bad image.
  function loadDims(url){
    return new Promise(function(res){
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function(){ res({ w: im.naturalWidth || 1440, h: im.naturalHeight || 823 }); };
      im.onerror = function(){ log('target image failed to load: ' + url); res({ w: 1440, h: 823 }); };
      im.src = url;
    });
  }
  function configureTargets(dims){
    try {
      var t = D.target || {};
      window.XR8.XrController.configure({
        imageTargetData: [{
          type: 'PLANAR',
          properties: { top: 0, left: 0, width: dims.w, height: dims.h, isRotated: false, originalWidth: dims.w, originalHeight: dims.h },
          imagePath: t.imageUrl,
          metadata: null,
          name: t.name,
          resources: { originalImage: '', croppedImage: '', thumbnailImage: '', luminanceImage: '' },
          created: Date.now(), updated: Date.now()
        }]
      });
      log('image target configured: ' + t.name + ' (' + dims.w + 'x' + dims.h + ')');
    } catch(e){ log('configure err: ' + (e && e.message)); }
  }

  // Engine load watchdog → themed error (no silent hang).
  setTimeout(function(){ if (!window.XR8 && !arReadyFired) showError('Couldn’t load the AR engine. Check your connection and try again.'); }, 14000);

  // Reload in IMAGE-ONLY mode (no IMU/SLAM). The route reads ?worldtracking and
  // serves D.worldTracking=false, so this is terminal — image-only never reloads
  // again, it just errors if even that fails.
  function reloadImageOnly(){
    try { var u = new URL(location.href); u.searchParams.set('worldtracking', '0'); location.replace(u.toString()); }
    catch(e){ showError('Couldn’t start AR. Please try again.'); }
  }

  var dimsP = loadDims((D.target || {}).imageUrl || '').then(function(d){ setProg(28); return d; });
  var xr8P = new Promise(function(res){ whenXR8(function(){ setProg(46); res(); }); });

  Promise.all([dimsP, xr8P]).then(function(r){
    targetDims = r[0]; configureTargets(r[0]); setProg(60); gateStart();
  });

  // ── start gate (motion permission on iOS) ──────────────────────────────────
  function gateStart(){
    var DOE = window.DeviceMotionEvent;
    var needsTap = wt && DOE && typeof DOE.requestPermission === 'function';
    if (needsTap){
      awaiting = true;
      loadBox.classList.add('hide'); startBox.classList.add('show');
      rnPost({ type: 'ar-awaiting-tap' }); // app reveals the WebView so the tap lands
      log('awaiting start tap (iOS motion permission)');
      startBtn.addEventListener('click', onStartTap, { once: true });
    } else {
      startScene();
    }
  }
  function onStartTap(){
    awaiting = false;
    startBox.classList.remove('show'); loadBox.classList.remove('hide');
    setProg(66);
    var reqs = [];
    try { if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) reqs.push(DeviceMotionEvent.requestPermission().catch(function(){ return 'denied'; })); } catch(e){}
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) reqs.push(DeviceOrientationEvent.requestPermission().catch(function(){ return 'denied'; })); } catch(e){}
    (reqs.length ? Promise.all(reqs) : Promise.resolve([])).then(function(res){
      // Motion denied → run image-only so AR still works (just no SLAM glue).
      if (res && res.length && res.indexOf('granted') === -1){ wt = false; log('motion not granted -> image-only'); }
      startScene();
    }, function(){ wt = false; startScene(); });
  }

  function startScene(){
    if (started) return; started = true; setProg(72);
    // Per-mode watchdog. If SLAM never comes up, auto-retry IMAGE-ONLY (works
    // without the IMU) so AR succeeds on any device; if image-only also fails,
    // show the themed error.
    if (wt){
      setTimeout(function(){ if (!arReadyFired){ log('SLAM did not start -> reloading image-only'); reloadImageOnly(); } }, 16000);
    } else {
      setTimeout(function(){ if (!arReadyFired) showError('Couldn’t start the camera. Close and reopen AR, and make sure no other app is using it.'); }, 16000);
    }
    whenAframe(buildScene);
  }

  // ── A-Frame scene (same look as before; xrweb tracking) ─────────────────────
  function buildScene(){
    // animation-mixer: A-Frame core has none, so this tiny component loops GLB clips.
    if (AFRAME.registerComponent && !AFRAME.components['animation-mixer']){
      AFRAME.registerComponent('animation-mixer', {
        schema: { clip: { default: '*' }, loop: { default: 'repeat' }, timeScale: { default: 1 } },
        init: function(){
          var self = this; this.mixer = null;
          this.el.addEventListener('model-loaded', function(e){
            try {
              var model = e.detail && e.detail.model; var clips = model && model.animations;
              if (!model || !clips || !clips.length) return;
              self.mixer = new AFRAME.THREE.AnimationMixer(model);
              clips.forEach(function(c){ self.mixer.clipAction(c).reset().play(); });
            } catch(err){ log('mixer err: ' + (err && err.message)); }
          });
        },
        // timeScale multiplies playback rate (set per-element from animationSpeed).
        tick: function(t, dt){ if (this.mixer && dt) this.mixer.update((dt / 1000) * (this.data.timeScale || 1)); }
      });
    }

    // kt-image-anchor — our OWN image-target anchor (replaces xrextras-named-image-
    // target). xrextras hides content the instant the image is lost and hard-copies
    // the raw pose every frame; that is exactly the flashing + shimmer and it means
    // content is NOT actually held by SLAM at oblique angles. This instead:
    //  - SMOOTHS the pose with a velocity-adaptive low-pass (heavy when nearly still
    //    to kill jitter, light when moving to stay responsive) so it doesn't shimmer;
    //  - REJECTS lone outlier frames (2-frame confirm before a big jump) so a single
    //    tracking glitch can't pop the model across the scene;
    //  - PERSISTS through image loss when World Tracking is on — SLAM keeps the world
    //    pose, so the model stays glued and never blinks out / "slips" when the card
    //    leaves frame or you look from a steep angle. It only re-snaps to correct
    //    drift when the image is re-acquired;
    //  - in image-only mode (no IMU) keeps the model for a short GRACE window after a
    //    loss before hiding, so brief losses (motion blur, a finger) don't flash.
    // It listens to the same low-level scene events xrextras consumes
    // (xrimagefound/updated/lost, emitted by the 8th Wall engine), and re-emits
    // xrextrasfound/xrextraslost so the existing hint UI keeps working — but it only
    // emits "lost" when the content is ACTUALLY hidden, so SLAM persistence never
    // nags "point at the card" while the model is happily glued.
    if (AFRAME.registerComponent && !AFRAME.components['kt-image-anchor']){
      AFRAME.registerComponent('kt-image-anchor', {
        schema: {
          name:      { default: 'card' },
          persist:   { default: true },   // World Tracking on -> hold pose through loss
          grace:     { default: 600 },    // image-only: ms to keep showing after loss
          tauMove:   { default: 55 },     // ms low-pass time-constant while moving
          tauStill:  { default: 170 },    // ms low-pass while near-still (kills jitter)
          snap:      { default: 0.18 },   // m jump that forces a re-snap (2-frame confirm)
          cardGrace: { default: 600 }     // ms after the IMAGE is lost before media is
                                          // declared off-card (pause+hide), even when
                                          // SLAM is persisting the 3D content
        },
        init: function(){
          var THREE = AFRAME.THREE;
          this.tPos = new THREE.Vector3();
          this.tQuat = new THREE.Quaternion();
          this.tScale = 1;
          this.has = false;        // have a target pose yet
          this.shown = false;      // content currently visible
          this.snapNext = false;   // copy (no lerp) on next applied pose
          this.outliers = 0;       // consecutive big-jump frames seen
          this.hideAt = 0;         // ts to hide at (image-only grace); 0 = none
          // Raw card-in-view state, tracked SEPARATELY from the SLAM content
          // persistence above. The 3D content stays glued through image loss (persist),
          // but flat media (video / photo / audio) is card-bound: these signal when the
          // printed card is genuinely on screen so the media can pause + hide when it
          // leaves view even while the models stay put.
          this.imgPresent = false;   // image tracked this frame
          this.cardVisible = false;  // debounced "card on screen" (drives media)
          this.cardHideAt = 0;       // ts to declare the card off-screen (cardGrace)
          this.el.object3D.visible = false; // hidden until first acquisition
          var self = this, sc = this.el.sceneEl;
          this.onPose = function(e){
            var d = e && e.detail; if (!d || d.name !== self.data.name || !d.position) return;
            if (self.has && !self.snapNext){
              var dist = self.tPos.distanceTo(d.position); // vs last TARGET, not displayed
              if (dist > self.data.snap){
                if (++self.outliers < 2) return; // lone glitch frame -> ignore entirely
                self.snapNext = true;            // confirmed real jump -> snap to it
              } else { self.outliers = 0; }
            }
            self.tPos.copy(d.position);
            if (d.rotation) self.tQuat.copy(d.rotation);
            if (typeof d.scale === 'number') self.tScale = d.scale;
            self.hideAt = 0;
            window.__ARSTATE__ = 'TRACKING';
            // Raw card presence (for media): cancel any pending off-card timer and
            // signal "card visible" on the rising edge — even in SLAM-persist mode.
            self.imgPresent = true; self.cardHideAt = 0;
            if (!self.cardVisible){ self.cardVisible = true; self.el.emit('ktcardvisible', {}, false); }
            if (!self.shown){ self.shown = true; self.el.object3D.visible = true; self.snapNext = true; self.el.emit('xrextrasfound', {}, false); }
            self.has = true;
          };
          this.onLost = function(e){
            var d = e && e.detail; if (!d || d.name !== self.data.name) return;
            // Media is card-bound regardless of SLAM: arm the off-card timer so the
            // video / photo / audio pause + hide shortly after the card actually
            // leaves view (the short cardGrace rides out motion-blur / partial-frame
            // losses so it doesn't flicker).
            self.imgPresent = false;
            if (self.cardVisible && !self.cardHideAt) self.cardHideAt = performance.now() + self.data.cardGrace;
            if (self.data.persist){ window.__ARSTATE__ = 'PERSIST'; return; } // SLAM holds the 3D content
            if (self.shown && !self.hideAt) self.hideAt = performance.now() + self.data.grace;
          };
          sc.addEventListener('xrimagefound', this.onPose);
          sc.addEventListener('xrimageupdated', this.onPose);
          sc.addEventListener('xrimagelost', this.onLost);
        },
        tick: function(t, dt){
          if (!this.has) return;
          var now = performance.now();
          // Off-card debounce for media — runs in EVERY mode, including while SLAM
          // persists the 3D content, so a glued model never keeps its video / audio
          // playing once the printed card itself has left the frame.
          if (this.cardHideAt && now >= this.cardHideAt){
            this.cardHideAt = 0; this.cardVisible = false; this.el.emit('ktcardhidden', {}, false);
          }
          var o = this.el.object3D;
          if (this.hideAt && now >= this.hideAt){
            this.hideAt = 0; this.shown = false; o.visible = false;
            window.__ARSTATE__ = 'LOST'; this.el.emit('xrextraslost', {}, false);
            return;
          }
          if (!o.visible) return;
          if (this.snapNext){
            o.position.copy(this.tPos); o.quaternion.copy(this.tQuat);
            o.scale.set(this.tScale, this.tScale, this.tScale);
            this.snapNext = false; return;
          }
          var ms = dt || 16;
          var tau = o.position.distanceTo(this.tPos) < 0.004 ? this.data.tauStill : this.data.tauMove;
          var a = 1 - Math.exp(-ms / tau); if (a > 1) a = 1; else if (a < 0) a = 0;
          o.position.lerp(this.tPos, a);
          o.quaternion.slerp(this.tQuat, a);
          var s = o.scale.x + (this.tScale - o.scale.x) * a;
          o.scale.set(s, s, s);
        },
        remove: function(){
          var sc = this.el.sceneEl;
          sc.removeEventListener('xrimagefound', this.onPose);
          sc.removeEventListener('xrimageupdated', this.onPose);
          sc.removeEventListener('xrimagelost', this.onLost);
        }
      });
    }

    var SHADOW_TEX = (function(){
      try {
        var c = document.createElement('canvas'); c.width = c.height = 128;
        var g = c.getContext('2d'); if (!g) return null;
        var rad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
        rad.addColorStop(0, 'rgba(0,0,0,0.42)'); rad.addColorStop(0.55, 'rgba(0,0,0,0.20)'); rad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rad; g.fillRect(0, 0, 128, 128); return c.toDataURL('image/png');
      } catch(e){ return null; }
    })();
    function buildShadow(el){
      if (el.type !== 'model' || !SHADOW_TEX) return null;
      var sc = Number(el.scale) > 0 ? Number(el.scale) : 1;
      var size = 0.36 * sc; if (size < 0.08) size = 0.08;
      var p = Array.isArray(el.position) ? el.position : [0, 0, 0];
      var sh = document.createElement('a-image');
      sh.setAttribute('src', SHADOW_TEX); sh.setAttribute('width', size); sh.setAttribute('height', size);
      sh.setAttribute('position', p[0] + ' ' + p[1] + ' 0.004');
      sh.setAttribute('material', 'transparent: true; depthWrite: false; opacity: 0.9');
      return sh;
    }
    function rad2deg(r){ return (r || 0) * 180 / Math.PI; }
    // Flat media (image/video) plane size from its stored aspect (w/h), longest
    // side = base. Mirrors flatPlaneSize() in scene.ts so the AR view matches the
    // editor — no square crop, no stretch.
    function flatSize(aspect, base){ var a = Number(aspect) > 0 ? Number(aspect) : 1; return a >= 1 ? [base, base / a] : [base * a, base]; }
    // Per-model brightness: multiply each material's base color by brightness/1.2
    // (1.2 = the neutral baseline the editor preview uses), so a model that looks
    // dark in AR can be lifted — matching the editor's Model Brightness slider.
    // Materials are CLONED first so two elements sharing a GLB can't tint each other.
    function applyBrightness(node, brightness){
      var f = (Number(brightness) > 0 ? Number(brightness) : 1.2) / 1.2;
      if (Math.abs(f - 1) < 0.001) return; // neutral -> nothing to do
      node.addEventListener('model-loaded', function(e){
        try {
          var root = e.detail && e.detail.model; if (!root || !root.traverse) return;
          root.traverse(function(o){
            if (!o.isMesh || !o.material) return;
            var mats = Array.isArray(o.material) ? o.material : [o.material];
            var out = mats.map(function(m){
              var c = m.clone(); if (c.color && c.color.multiplyScalar) c.color.multiplyScalar(f); return c;
            });
            o.material = Array.isArray(o.material) ? out : out[0];
          });
        } catch(err){ log('brightness err: ' + (err && err.message)); }
      });
    }
    function buildElement(el){
      var node;
      if (el.type === 'model' && el.url){
        node = document.createElement('a-gltf-model'); node.setAttribute('src', el.url);
        if (el.animated) node.setAttribute('animation-mixer', 'loop: repeat; timeScale: ' + (Number(el.animationSpeed) > 0 ? el.animationSpeed : 1));
        applyBrightness(node, el.brightness);
      } else if (el.type === 'image' && el.url){
        node = document.createElement('a-image'); node.setAttribute('src', el.url);
        var isz = flatSize(el.aspect, 0.3); node.setAttribute('width', isz[0]); node.setAttribute('height', isz[1]);
        node.setAttribute('material', 'side', 'double'); // visible from behind the card
        // Card-bound like video: the photo shows only while the card is on screen
        // (starts hidden; ktSyncMediaVisible reveals it on the card-found event).
        node.setAttribute('data-kt-cardbound', '1'); node.setAttribute('visible', 'false');
      } else if (el.type === 'social'){
        node = document.createElement('a-entity');
        var bg = document.createElement('a-plane'); bg.setAttribute('width', 0.26); bg.setAttribute('height', 0.26);
        bg.setAttribute('color', el.color || '#0A66C2'); bg.setAttribute('material', 'shader: flat'); node.appendChild(bg);
        var tx = document.createElement('a-text'); tx.setAttribute('value', el.label || 'Link'); tx.setAttribute('align', 'center');
        tx.setAttribute('color', '#ffffff'); tx.setAttribute('width', 0.6); tx.setAttribute('position', '0 0 0.01'); node.appendChild(tx);
      } else if (el.type === 'video' && el.url){
        node = document.createElement('a-video'); node.setAttribute('src', el.url);
        var vsz = flatSize(el.aspect, 0.5); node.setAttribute('width', vsz[0]); node.setAttribute('height', vsz[1]);
        // NO autoplay, and CARD-BOUND: the clip plays + shows only while the printed
        // card is actually on screen and pauses + hides the moment it leaves — even in
        // SLAM-persist mode (started/stopped from the kt-image-anchor card-presence
        // events, see playFoundMedia / pauseLostMedia below). __ktPlayable stays false
        // until the probe confirms the source is a real, decodable clip.
        node.setAttribute('data-kt-cardbound', '1'); node.__ktPlayable = false;
        node.setAttribute('autoplay', 'false'); node.setAttribute('loop', el.loop === false ? 'false' : 'true');
        // Start muted — browsers block sound-on play until a gesture; the Start-AR
        // tap is that gesture, so playFoundMedia un-mutes when the card is found.
        node.setAttribute('playsinline', 'true'); node.setAttribute('muted', 'true');
        node.setAttribute('material', 'side', 'double'); // visible from behind the card
        // Sound settings, applied to the real <video> a-frame builds for the clip.
        var vVol = (typeof el.volume === 'number') ? Math.max(0, Math.min(1, el.volume)) : 1;
        var vRate = (Number(el.playbackRate) > 0) ? Number(el.playbackRate) : 1;
        node.setAttribute('data-kt-video', '1');
        node.__ktWantSound = el.muted !== true && vVol > 0; // author wants it audible
        node.__ktVol = vVol; node.__ktRate = vRate; node.__ktForceMute = el.muted === true;
        // Reach the underlying media element and apply volume / speed (and keep it
        // hard-muted if the author chose silent). Fires when a-frame loads the clip.
        function ktApplyVid(){
          try {
            var m = node.components && node.components.material;
            var img = m && m.material && m.material.map && m.material.map.image;
            if (img && img.tagName === 'VIDEO'){
              node.__ktVideo = img;
              try { img.playbackRate = vRate; } catch(e){}
              img.volume = vVol;
              if (node.__ktForceMute) img.muted = true;
              if (window.__KT_CARD_VISIBLE__){
                ktStartVideo(node, img); // loaded while the card is already shown
              } else {
                // Hold until the card is found — a-frame may try to play on load.
                try { img.pause(); img.currentTime = 0; } catch(e){}
              }
            }
          } catch(e){}
        }
        node.addEventListener('materialvideoloadeddata', ktApplyVid);
        node.addEventListener('loaded', ktApplyVid);
        // Show the plane ONLY if the clip is genuinely playable. We probe the URL
        // with our own <video>: a YouTube/Vimeo page, a 404, a CORS-blocked file or
        // a bad codec all fire 'error' (and a cross-origin file with no CORS can't
        // be used as a WebGL texture anyway), so we drop the plane instead of
        // showing a dead black rectangle. A clip that loads metadata stays and
        // plays. crossOrigin matches a-video's own texture requirement.
        node.setAttribute('visible', 'false');
        (function(n, url){
          var probe = document.createElement('video');
          probe.muted = true; probe.preload = 'metadata'; probe.crossOrigin = 'anonymous';
          probe.setAttribute('playsinline', ''); probe.setAttribute('webkit-playsinline', '');
          var done = false;
          function ok(){ if (done) return; done = true; n.__ktPlayable = true; ktSyncMediaVisible(); log('video ok: ' + url); }
          function drop(){ if (done) return; done = true; try { if (n.parentNode) n.parentNode.removeChild(n); } catch(e){} log('video dropped (unplayable): ' + url); }
          probe.addEventListener('loadedmetadata', ok);
          probe.addEventListener('canplay', ok);
          probe.addEventListener('error', drop);
          setTimeout(function(){ if (!done) drop(); }, 12000); // never hang on a stalled URL
          try { probe.src = url; } catch(e){ drop(); }
        })(node, el.url);
      } else if (el.type === 'audio' && el.url){
        // Audio is an INVISIBLE, card-gated soundtrack — NO on-card chip or control
        // (matches the editor, which draws nothing for it). It simply plays while the
        // card is in view and pauses when it leaves, via playFoundMedia /
        // pauseLostMedia (keyed off data-kt-audio). __ktWantPlay carries the editor's
        // "play automatically" choice; a clip with autoplay off stays silent (there's
        // no on-card control by design — preview/check is in the editor's right panel).
        // Web Audio needs a gesture to make sound: the iOS Start-AR tap and the global
        // tap-to-resume listener cover that.
        node = document.createElement('a-entity');
        node.setAttribute('data-kt-audio', '1');
        node.setAttribute('sound', 'src: url(' + el.url + '); loop: ' + (el.loop === false ? 'false' : 'true') + '; positional: false; autoplay: false; volume: 1');
        node.__ktPlayable = false;
        node.__ktWantPlay = el.autoplay !== false;
        // a-frame's playSound() is a NO-OP until the buffer finishes loading, so an
        // autoplay clip whose buffer lands AFTER the card was first found would stay
        // silent (playFoundMedia already ran). Start it once the buffer is ready if
        // the card is up — the audio mirror of the video's materialvideoloadeddata.
        node.addEventListener('sound-loaded', function(){
          try {
            node.__ktPlayable = true;
            if (node.__ktWantPlay && !node.__ktPlaying && window.__KT_CARD_VISIBLE__){
              resumeAudioCtx();
              var s = node.components && node.components.sound;
              if (s){ s.playSound(); node.__ktPlaying = true; }
            }
          } catch(e){}
        });
        // Graceful skip: drop the element if the URL isn't a real, playable file (a
        // streaming-page link / 404 / CORS failure all fire 'error') so a dead URL
        // doesn't sit silently in the scene. A clip that loads metadata stays + plays.
        (function(n, url){
          var probe = document.createElement('audio');
          probe.muted = true; probe.preload = 'metadata'; probe.crossOrigin = 'anonymous';
          var done = false;
          function ok(){ if (done) return; done = true; n.__ktPlayable = true; log('audio ok: ' + url); }
          function drop(){ if (done) return; done = true; try { if (n.parentNode) n.parentNode.removeChild(n); } catch(e){} log('audio dropped (unplayable): ' + url); }
          probe.addEventListener('loadedmetadata', ok);
          probe.addEventListener('canplay', ok);
          probe.addEventListener('error', drop);
          setTimeout(function(){ if (!done) drop(); }, 12000);
          try { probe.src = url; } catch(e){ drop(); }
        })(node, el.url);
      } else if (el.type === 'text' && el.text){
        node = document.createElement('a-text'); node.setAttribute('value', el.text); node.setAttribute('align', 'center');
        node.setAttribute('color', el.color || '#18181b'); node.setAttribute('width', 1.4); node.setAttribute('wrap-count', 16);
        node.setAttribute('baseline', 'center'); node.setAttribute('anchor', 'center');
        node.setAttribute('side', 'double'); // readable from behind the card
      }
      if (!node) return null;
      var p = el.position || [0, 0, 0.15];
      node.setAttribute('position', p[0] + ' ' + p[1] + ' ' + p[2]);
      // Effective tilt = baseRotationX (code-level stand-up baseline) + rotationX
      // (the user's offset). Legacy elements have no baseRotationX (0) and keep the
      // tilt baked into rotationX, so both schemes render upright.
      node.setAttribute('rotation', rad2deg((el.rotationX || 0) + (el.baseRotationX || 0)) + ' ' + rad2deg(el.rotationY) + ' ' + rad2deg(el.rotationZ));
      var s = (el.baseScale || 1) * (el.scale || 1);
      node.setAttribute('scale', s + ' ' + s + ' ' + s);
      // Self-rotate: spin Y only, PRESERVING the element's tilt (X) and roll (Z).
      // (The old 'to: 0 360 0' animated the whole vector, flattening any tilt to 0
      // mid-spin — very visible now that every model is tilted 90° by default.)
      if (el.spin){
        var rx = rad2deg((el.rotationX || 0) + (el.baseRotationX || 0));
        var ry = rad2deg(el.rotationY);
        var rz = rad2deg(el.rotationZ);
        var spinDur = Math.max(200, Math.round(6000 / (Number(el.animationSpeed) > 0 ? el.animationSpeed : 1)));
        node.setAttribute('animation__spin', 'property: rotation; from: ' + rx + ' ' + ry + ' ' + rz + '; to: ' + rx + ' ' + (ry + 360) + ' ' + rz + '; loop: true; dur: ' + spinDur + '; easing: linear');
      }
      if (el.link){ node.classList.add('clickable'); node.addEventListener('click', function(){ window.open(el.link, '_blank'); }); }
      return node;
    }

    var scene = document.createElement('a-scene');
    scene.setAttribute('renderer', 'colorManagement: true; alpha: true');
    // xrweb = 8th Wall camera + tracking. World Tracking (SLAM) per the effective
    // mode (dropped to image-only if motion was denied / SLAM didn't start).
    scene.setAttribute('xrweb', wt ? '' : 'disableWorldTracking: true');
    scene.setAttribute('vr-mode-ui', 'enabled: false');

    var cam = document.createElement('a-camera');
    cam.setAttribute('position', '0 0 0');
    cam.setAttribute('raycaster', 'objects: .clickable');
    cam.setAttribute('cursor', 'fuse: false; rayOrigin: mouse');
    scene.appendChild(cam);

    var B = (D.lighting && typeof D.lighting.intensity === 'number') ? D.lighting.intensity : 1.2;
    function light(attr){ var e = document.createElement('a-entity'); e.setAttribute('light', attr); return e; }
    scene.appendChild(light('type: ambient; intensity: ' + (1.1 * B).toFixed(3)));
    scene.appendChild(light('type: hemisphere; intensity: ' + (0.8 * B).toFixed(3) + '; color: #ffffff; groundColor: #b0b4bd'));
    var dir = light('type: directional; intensity: ' + (1.1 * B).toFixed(3)); dir.setAttribute('position', '1 2 1'); scene.appendChild(dir);
    var fill = light('type: directional; intensity: ' + (0.5 * B).toFixed(3)); fill.setAttribute('position', '-1 1 -1'); scene.appendChild(fill);

    // Soft image-based lighting (IBL) so glossy/metallic models (e.g. a car body)
    // get believable reflections instead of flat shading — MATCHING the editor
    // preview, which uses a drei <Environment>. Built ONCE from an in-memory
    // gradient (no HDR download): canvas equirect -> PMREM -> scene.environment.
    // Best-effort; any failure just leaves the analytic lights (slightly flatter,
    // never broken). Runs on realityready, when 8th Wall's renderer exists.
    function applyEnv(){
      try {
        if (scene.__envDone) return;
        var renderer = scene.renderer; if (!renderer) return;
        var THREE = AFRAME.THREE; if (!THREE || !THREE.PMREMGenerator) return;
        scene.__envDone = true;
        var c = document.createElement('canvas'); c.width = 64; c.height = 32;
        var g = c.getContext('2d'); if (!g) return;
        var grd = g.createLinearGradient(0, 0, 0, 32);
        grd.addColorStop(0.0, '#ffffff');   // overhead key
        grd.addColorStop(0.45, '#e8edf5');
        grd.addColorStop(0.75, '#aab2c0');
        grd.addColorStop(1.0, '#6b7280');   // ground
        g.fillStyle = grd; g.fillRect(0, 0, 64, 32);
        var tex = new THREE.CanvasTexture(c);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        var pmrem = new THREE.PMREMGenerator(renderer);
        var rt = pmrem.fromEquirectangular(tex);
        scene.object3D.environment = rt.texture;
        tex.dispose(); pmrem.dispose();
        log('env (IBL) applied');
      } catch(e){ log('env err: ' + (e && e.message)); }
    }

    // Image-target anchor (our kt-image-anchor — see component above). Calibration
    // wrapper (UNIT) corrects any unit mismatch vs the editor; for a LANDSCAPE card
    // MindAR (width=1) and 8th Wall (longer-side=1) agree, so 1.0 should line up.
    // persist = effective world-tracking (SLAM holds the model through image loss).
    // The smoothing/grace/snap params are tunable on-device via query string
    // (?taumove= ?taustill= ?grace= ?snap= ?persist=) so they can be dialled in
    // without a redeploy, same pattern as ?cal= / ?debug=.
    var UNIT = 1.0;
    var qNum = function(k){ try { var m = new RegExp('[?&]' + k + '=(-?\\d+(?:\\.\\d+)?)', 'i').exec(location.search); return m ? parseFloat(m[1]) : null; } catch(e){ return null; } };
    var pOv = qNum('persist');
    var anchorCfg = 'name: ' + ((D.target && D.target.name) || 'card') +
      '; persist: ' + ((pOv !== null ? pOv : (wt ? 1 : 0)) ? 'true' : 'false');
    var ov = { grace: qNum('grace'), tauMove: qNum('taumove'), tauStill: qNum('taustill'), snap: qNum('snap'), cardGrace: qNum('cardgrace') };
    Object.keys(ov).forEach(function(k){ if (ov[k] !== null) anchorCfg += '; ' + k + ': ' + ov[k]; });
    var anchor = document.createElement('a-entity');
    anchor.setAttribute('kt-image-anchor', anchorCfg);
    var lostTimer = null;
    function showHint(){ lostTimer = null; hintEl.textContent = 'Point at the card'; }
    // The component emits "found" on (re)acquire and "lost" ONLY when content is
    // actually hidden — so in SLAM-persist mode the model stays put and this nag
    // never fires; in image-only mode it appears shortly after the model hides.
    anchor.addEventListener('xrextrasfound', function(){ if (lostTimer){ clearTimeout(lostTimer); lostTimer = null; } hintEl.textContent = ''; });
    anchor.addEventListener('xrextraslost', function(){ if (lostTimer) clearTimeout(lostTimer); lostTimer = setTimeout(showHint, 800); });

    var wrap = document.createElement('a-entity');
    wrap.setAttribute('scale', UNIT + ' ' + UNIT + ' ' + UNIT);
    // Spin the whole authored scene back about the card normal so it reads the way
    // the owner arranged it in the editor (see targetCorrectionZ). Rotates content
    // AND positions together about the card centre, so the layout stays intact.
    var corrZ = targetCorrectionZ();
    if (corrZ) wrap.setAttribute('rotation', '0 0 ' + corrZ);
    log('orientation correction: ' + corrZ + '° (target ' + ((targetDims && targetDims.w) || '?') + 'x' + ((targetDims && targetDims.h) || '?') + ')');
    (D.elements || []).forEach(function(el){ var sh = buildShadow(el); if (sh) wrap.appendChild(sh); var n = buildElement(el); if (n) wrap.appendChild(n); });
    anchor.appendChild(wrap);
    scene.appendChild(anchor);

    // ── Media playback (video + audio) ───────────────────────────────────────
    // Media must behave like the 3D content: it plays ONLY while the card is on
    // screen, and pauses when it leaves — never before the first detect. (Earlier
    // the video autoplayed muted on load and un-muted on the Start-AR tap, so its
    // sound was heard well before the card was ever shown.) Web Audio starts
    // SUSPENDED until a gesture, so we resume the context on any tap; the Start-AR
    // tap is sticky, so by first-found the browser also allows un-muted video.
    function resumeAudioCtx(){
      try {
        var THREE = AFRAME.THREE;
        var ctx = THREE && THREE.AudioContext && THREE.AudioContext.getContext ? THREE.AudioContext.getContext() : null;
        if (ctx && ctx.state === 'suspended') ctx.resume();
      } catch(e){}
    }
    window.addEventListener('touchstart', resumeAudioCtx, { passive: true });
    window.addEventListener('click', resumeAudioCtx);

    // Resolve the real <video> a-frame built for an a-video element (loads late).
    function ktVideoOf(n){
      if (n.__ktVideo) return n.__ktVideo;
      try {
        var m = n.components && n.components.material;
        var img = m && m.material && m.material.map && m.material.map.image;
        if (img && img.tagName === 'VIDEO'){ n.__ktVideo = img; return img; }
      } catch(e){}
      return null;
    }

    // Start ONE video: apply speed, un-mute if the author wanted sound, then play
    // (own function so the async play().catch closure binds THIS clip — a var in
    // the caller's loop would all share the last element).
    function ktStartVideo(n, v){
      try { v.playbackRate = n.__ktRate; } catch(e){}
      if (n.__ktWantSound){ try { v.muted = false; v.volume = n.__ktVol; } catch(e){} }
      try {
        var p = v.play();
        if (p && p.catch) p.catch(function(){ try { v.muted = true; v.play(); } catch(e){} });
      } catch(e){ try { v.muted = true; v.play(); } catch(e2){} }
    }

    // Show/hide the card-bound flat media (video + photo) to match the current
    // card-in-view state. A video only shows once its source is confirmed playable
    // (__ktPlayable); a photo has no probe so it shows whenever the card is up.
    // (Audio is NOT in this set — it's invisible, with no on-card element.) Called on
    // every card found/lost AND when a probe confirms a clip (so a slow-loading clip
    // pops in correctly if the card is already shown).
    function ktSyncMediaVisible(){
      var on = !!window.__KT_CARD_VISIBLE__;
      var els = scene.querySelectorAll('[data-kt-cardbound]');
      for (var i = 0; i < els.length; i++){
        var n = els[i];
        var playable = n.__ktPlayable !== false; // image: undefined -> playable
        n.setAttribute('visible', (on && playable) ? 'true' : 'false');
      }
    }

    // Card came into view: reveal + start the card-bound clips. Videos un-mute if
    // the author left sound on (falling back to muted playback if the browser still
    // blocks it); audio set to play automatically (the editor's autoplay choice,
    // carried in __ktWantPlay) starts. Audio with autoplay off stays silent (there's
    // no on-card control by design).
    function playFoundMedia(){
      window.__KT_CARD_VISIBLE__ = true;
      resumeAudioCtx();
      ktSyncMediaVisible();
      var vs = scene.querySelectorAll('[data-kt-video]');
      for (var i = 0; i < vs.length; i++){
        var n = vs[i], v = ktVideoOf(n); if (!v) continue;
        ktStartVideo(n, v);
      }
      var as = scene.querySelectorAll('[data-kt-audio]');
      for (var j = 0; j < as.length; j++){
        var an = as[j];
        // Skip clips not meant to play, already playing, or not yet probe-confirmed
        // playable (the sound-loaded handler starts those once their buffer lands).
        if (!an.__ktWantPlay || an.__ktPlaying || an.__ktPlayable === false) continue;
        var s = an.components && an.components.sound;
        if (s){ try { s.playSound(); an.__ktPlaying = true; } catch(e){} }
      }
    }

    // Card left the view: pause + hide every card-bound clip so nothing plays or
    // floats off-card — even in SLAM-persist mode, where the 3D models stay glued in
    // place. Audio keeps its intended state (__ktWantPlay) so re-finding the card
    // resumes exactly what the listener had going.
    function pauseLostMedia(){
      window.__KT_CARD_VISIBLE__ = false;
      var vs = scene.querySelectorAll('[data-kt-video]');
      for (var i = 0; i < vs.length; i++){ var v = ktVideoOf(vs[i]); if (v){ try { v.pause(); } catch(e){} } }
      var as = scene.querySelectorAll('[data-kt-audio]');
      for (var j = 0; j < as.length; j++){
        var an = as[j];
        if (!an.__ktPlaying) continue;
        var s = an.components && an.components.sound;
        if (s){ try { s.pauseSound(); } catch(e){} an.__ktPlaying = false; }
      }
      ktSyncMediaVisible();
    }

    // Media is wired to the RAW card-presence events (kt-image-anchor emits these
    // whenever the printed card enters / leaves the frame), NOT the content show/hide
    // events — so in SLAM-persist mode, where the 3D content deliberately never hides,
    // the video / photo still pause + hide and the audio still pauses the instant the
    // card leaves view.
    anchor.addEventListener('ktcardvisible', playFoundMedia);
    anchor.addEventListener('ktcardhidden', pauseLostMedia);

    scene.addEventListener('realityready', function(){ log('realityready'); window.__ARSTATE__ = 'READY'; ready(); applyEnv(); hintEl.textContent = 'Point at the card'; });
    scene.addEventListener('camerastatuschange', function(e){ var s = e && e.detail && e.detail.status; log('camera status: ' + s); if (s === 'failed' || s === 'blocked') showError('Camera access is blocked. Allow the camera and reopen AR.'); });

    document.body.appendChild(scene);
    log('8th Wall scene appended');
  }
})();
</script>
</body>
</html>`;
}
