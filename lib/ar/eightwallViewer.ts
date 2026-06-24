/**
 * 8th Wall WebAR viewer — the ONLY engine (the MindAR fallback was removed).
 * Renders the owner's composed scene anchored on the printed card via 8th Wall's
 * image targets + World Tracking (SLAM) with IMU fusion, so content stays glued
 * at oblique angles and doesn't shimmer (the old paid 8th Wall / Kivicube tech,
 * free + open-source since Niantic, Feb 2026).
 *
 * Standalone HTML loaded by the app's WebView. Scene model = the SAME A-Frame
 * element set the editor produces; only the tracking SYSTEM differs from before:
 *   <a-scene xrweb>  +  <xrextras-named-image-target>.
 *
 * Engine pieces (all allowed by the /ar CSP):
 *  - 8frame 1.5.0 — 8th Wall's A-Frame build (vendored to /ar8; bundles the xrweb
 *    integration vanilla A-Frame lacks).
 *  - @8thwall/engine-binary — camera + SLAM ("data-preload-chunks=slam").
 *  - @8thwall/xrextras — provides xrextras-named-image-target. We do NOT use its
 *    off-theme loading / landing-page / runtime-error UI: this page draws its own
 *    KaunTech-themed loader + permission gate instead.
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
  <div id="loadbox" style="width:100%;display:flex;flex-direction:column;align-items:center">
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
        schema: { clip: { default: '*' }, loop: { default: 'repeat' } },
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
        tick: function(t, dt){ if (this.mixer && dt) this.mixer.update(dt / 1000); }
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
    function buildElement(el){
      var node;
      if (el.type === 'model' && el.url){
        node = document.createElement('a-gltf-model'); node.setAttribute('src', el.url);
        if (el.animated) node.setAttribute('animation-mixer', 'loop: repeat');
      } else if (el.type === 'image' && el.url){
        node = document.createElement('a-image'); node.setAttribute('src', el.url); node.setAttribute('width', 0.3); node.setAttribute('height', 0.3);
      } else if (el.type === 'social'){
        node = document.createElement('a-entity');
        var bg = document.createElement('a-plane'); bg.setAttribute('width', 0.26); bg.setAttribute('height', 0.26);
        bg.setAttribute('color', el.color || '#0A66C2'); bg.setAttribute('material', 'shader: flat'); node.appendChild(bg);
        var tx = document.createElement('a-text'); tx.setAttribute('value', el.label || 'Link'); tx.setAttribute('align', 'center');
        tx.setAttribute('color', '#ffffff'); tx.setAttribute('width', 0.6); tx.setAttribute('position', '0 0 0.01'); node.appendChild(tx);
      } else if (el.type === 'video' && el.url){
        node = document.createElement('a-video'); node.setAttribute('src', el.url); node.setAttribute('width', 0.5); node.setAttribute('height', 0.3);
        node.setAttribute('autoplay', 'true'); node.setAttribute('loop', 'true'); node.setAttribute('playsinline', 'true'); node.setAttribute('muted', 'true');
      } else if (el.type === 'text' && el.text){
        node = document.createElement('a-text'); node.setAttribute('value', el.text); node.setAttribute('align', 'center');
        node.setAttribute('color', el.color || '#18181b'); node.setAttribute('width', 1.4); node.setAttribute('wrap-count', 16);
        node.setAttribute('baseline', 'center'); node.setAttribute('anchor', 'center');
      }
      if (!node) return null;
      var p = el.position || [0, 0, 0.15];
      node.setAttribute('position', p[0] + ' ' + p[1] + ' ' + p[2]);
      node.setAttribute('rotation', rad2deg(el.rotationX) + ' ' + rad2deg(el.rotationY) + ' ' + rad2deg(el.rotationZ));
      var s = (el.baseScale || 1) * (el.scale || 1);
      node.setAttribute('scale', s + ' ' + s + ' ' + s);
      if (el.spin) node.setAttribute('animation__spin', 'property: rotation; to: 0 360 0; loop: true; dur: 6000; easing: linear');
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

    // Image-target anchor. Calibration wrapper (UNIT) corrects any unit mismatch
    // vs the editor; for a LANDSCAPE card MindAR (width=1) and 8th Wall
    // (longer-side=1) agree, so 1.0 should line up.
    var UNIT = 1.0;
    var anchor = document.createElement('xrextras-named-image-target');
    anchor.setAttribute('name', (D.target && D.target.name) || 'card');
    var lostTimer = null;
    function showHint(){ lostTimer = null; hintEl.textContent = 'Point at the card'; }
    anchor.addEventListener('xrextrasfound', function(){ window.__ARSTATE__ = 'TRACKING'; if (lostTimer){ clearTimeout(lostTimer); lostTimer = null; } hintEl.textContent = ''; });
    anchor.addEventListener('xrextraslost', function(){ window.__ARSTATE__ = 'LOST'; if (lostTimer) clearTimeout(lostTimer); lostTimer = setTimeout(showHint, 2600); });

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

    scene.addEventListener('realityready', function(){ log('realityready'); window.__ARSTATE__ = 'READY'; ready(); hintEl.textContent = 'Point at the card'; });
    scene.addEventListener('camerastatuschange', function(e){ var s = e && e.detail && e.detail.status; log('camera status: ' + s); if (s === 'failed' || s === 'blocked') showError('Camera access is blocked. Allow the camera and reopen AR.'); });

    document.body.appendChild(scene);
    log('8th Wall scene appended');
  }
})();
</script>
</body>
</html>`;
}
