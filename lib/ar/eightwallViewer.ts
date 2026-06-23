/**
 * 8th Wall WebAR viewer (the premium engine). Renders the owner's composed scene
 * anchored on the printed card via 8th Wall's image targets + World Tracking
 * (SLAM) — the same engine family as the old paid 8th Wall / Kivicube, now free
 * and open-source (Niantic, Feb 2026). Unlike MindAR (pure per-frame vision, no
 * fusion) 8th Wall fuses the camera with the device IMU and a SLAM world map, so
 * content stays GLUED at oblique angles and doesn't shimmer.
 *
 * This is a standalone HTML document (served by app/ar/view/[cardId]) loaded by
 * the app's WebView, exactly like the MindAR viewer. The DOM/scene model is the
 * SAME A-Frame element set the editor produces, so element building is shared in
 * spirit with the MindAR path — only the tracking SYSTEM differs:
 *   MindAR:   <a-scene mindar-image>  +  <a-entity mindar-image-target>
 *   8th Wall: <a-scene xrweb>         +  <xrextras-named-image-target>
 *
 * Engine pieces (all already allowed by the /ar CSP):
 *  - 8frame 1.5.0  — 8th Wall's A-Frame build (self-hosted; no CDN exists). It
 *    bundles the xrweb/xrextras A-Frame integration vanilla A-Frame lacks.
 *  - @8thwall/engine-binary — the distributed engine (camera + SLAM). The
 *    `data-preload-chunks="slam"` attr pulls the SLAM chunk (xr-slam.js).
 *  - @8thwall/landing-page + @8thwall/xrextras — the official loading / camera +
 *    motion permission / unsupported-device flow (handles the iOS DeviceMotion
 *    grant that World Tracking needs).
 *
 * Image target: a PLANAR target built from the card photo's grayscale luminance
 * image (generated in the editor, lib/ar/compileTarget.ts). XR8.XrController is
 * configured with that target's JSON; the `name` must match the
 * xrextras-named-image-target's `name`.
 *
 * SAFETY: if 8th Wall can't start (unsupported, engine load failure, or it never
 * reaches realityready within the watchdog), the page redirects to the SAME url
 * with ?engine=mindar, which serves the proven MindAR viewer. So the worst case
 * is "falls back to today's working viewer", never a broken screen.
 */

const ENGINE = "https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js";
const LANDING = "https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1/dist/landing-page.js";
const XREXTRAS = "https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js";
// 8th Wall's A-Frame 1.5.0 build. No CDN/npm exists for it (it's Git-LFS in the
// example repo), so it's vendored into /public/ar8 and served same-origin.
const EIGHTFRAME = "/ar8/8frame-1.5.0.min.js";

export interface EightwallView {
  elements: unknown[];
  lighting: { intensity: number };
  target: { lumUrl: string; name: string; w: number; h: number };
  /** World Tracking (SLAM) on = content stays glued at all angles + after the
   *  card leaves frame. Needs DeviceMotion (auto on Android Chrome; iOS prompts
   *  via xrextras). Off = pure image tracking (still far steadier than MindAR,
   *  no motion permission needed). */
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
  html,body{margin:0;height:100%;background:#0b0d12;overflow:hidden;font-family:system-ui,sans-serif;color:#fff}
  #hint{position:fixed;top:16px;left:0;right:0;text-align:center;z-index:20;pointer-events:none;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  #dbg{position:fixed;top:8px;left:8px;z-index:40;display:none;font:600 12px/1.45 ui-monospace,Menlo,monospace;
    color:#7CFFB2;background:rgba(0,0,0,.62);padding:7px 9px;border-radius:8px;white-space:pre;pointer-events:none}
</style>
<script crossorigin="anonymous" src="${EIGHTFRAME}"></script>
<script src="${ENGINE}" async crossorigin="anonymous" data-preload-chunks="slam"></script>
<script src="${LANDING}" crossorigin="anonymous"></script>
<script src="${XREXTRAS}" crossorigin="anonymous"></script>
</head>
<body>
<div id="hint"></div>
<div id="dbg"></div>
<script>window.__AR__ = ${json};</script>
<script>
(function(){
  var D = window.__AR__ || {};
  var hintEl = document.getElementById('hint');
  var lastProg = 0, arReadyFired = false, fellBack = false;

  function log(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage('[ARView8] ' + Array.prototype.join.call(arguments, ' ')); } catch(e){} }
  window.__ARLOG__ = log;
  function rnPost(obj){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){} }
  function setProg(v){ v = Math.max(lastProg, Math.min(100, Math.round(v))); lastProg = v; rnPost({ type: 'ar-progress', value: v }); }
  function ready(){ if (arReadyFired) return; arReadyFired = true; setProg(100); rnPost({ type: 'ar-ready' }); }

  // SAFETY FALLBACK — if 8th Wall can't start, hand off to the MindAR viewer at
  // the same url. ?engine=mindar is terminal (it never falls back), so no loop.
  function fallbackToMindar(why){
    if (fellBack || arReadyFired) return; fellBack = true;
    log('fallback to MindAR: ' + why);
    try { var u = new URL(location.href); u.searchParams.set('engine', 'mindar'); location.replace(u.toString()); }
    catch(e){ location.replace(location.pathname + '?engine=mindar'); }
  }
  window.addEventListener('error', function(e){ log('window error:', e.message, (e.filename||'') + ':' + (e.lineno||'')); });
  window.addEventListener('unhandledrejection', function(e){ log('promise rejection:', (e.reason && (e.reason.message || e.reason.name || e.reason)) || 'unknown'); });
  // If the engine global never appears, the CDN/engine failed → fall back.
  setTimeout(function(){ if (!window.XR8 && !arReadyFired) fallbackToMindar('XR8 never loaded'); }, 12000);
  // If we never reach realityready (e.g. permission denied, unsupported), fall back.
  setTimeout(function(){ if (!arReadyFired) fallbackToMindar('realityready timeout'); }, 22000);

  setProg(8);
  log('tier capture: 8th Wall; worldTracking=' + (D.worldTracking ? 'on' : 'off'));

  // Diagnostic HUD (?debug=1): build tag + tracking state + fps.
  (function(){
    try {
      if (!/[?&]debug/i.test(location.search)) return;
      var el = document.getElementById('dbg'); if (!el) return;
      el.style.display = 'block';
      var frames = 0, t0 = (window.performance ? performance.now() : Date.now()), fps = 0;
      (function loop(){
        frames++; var t = (window.performance ? performance.now() : Date.now());
        if (t - t0 >= 500){ fps = Math.round(frames * 1000 / (t - t0)); frames = 0; t0 = t; }
        el.textContent = 'build: 8thwall-v1\\n' + 'engine: 8th Wall (SLAM ' + (D.worldTracking ? 'on' : 'off') + ')\\n' +
          'render fps: ' + fps + '\\n' + 'state: ' + (window.__ARSTATE__ || 'starting');
        requestAnimationFrame(loop);
      })();
    } catch(e){}
  })();

  // ── Configure the image target on the engine (XR8) ─────────────────────────
  // The PLANAR target is built from the card photo's luminance image. Its "name"
  // MUST match the xrextras-named-image-target below. The engine loads imagePath,
  // extracts features, and matches them against the camera feed.
  function configureTargets(){
    try {
      var t = D.target || {};
      window.XR8.XrController.configure({
        imageTargetData: [{
          type: 'PLANAR',
          properties: { top: 0, left: 0, width: t.w, height: t.h, isRotated: false, originalWidth: t.w, originalHeight: t.h },
          imagePath: t.lumUrl,
          metadata: null,
          name: t.name,
          resources: { originalImage: '', croppedImage: '', thumbnailImage: '', luminanceImage: '' },
          created: Date.now(), updated: Date.now()
        }]
      });
      log('image target configured: ' + t.name);
    } catch(e){ log('configure err: ' + (e && e.message)); }
  }
  window.XR8 ? configureTargets() : window.addEventListener('xrloaded', function(){ setProg(35); configureTargets(); });

  // ── Shared scene helpers (same look as the MindAR viewer) ──────────────────
  function whenAframe(cb){ if (window.AFRAME) return cb(); window.addEventListener('load', function(){ if (window.AFRAME) cb(); }); }

  whenAframe(function(){
    // animation-mixer: A-Frame core has none (aframe-extras crashed init before),
    // so the same tiny inline component as the MindAR viewer loops GLB clips.
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

    // gltf-brightness: model-specific brightness adjustments
    if (AFRAME.registerComponent && !AFRAME.components['gltf-brightness']){
      AFRAME.registerComponent('gltf-brightness', {
        schema: { type: 'number', default: 1.2 },
        init: function(){
          var self = this;
          this.el.addEventListener('model-loaded', function(e){
            var model = e.detail && e.detail.model;
            if (!model) return;
            model.traverse(function(node){
              if (node.isMesh && node.material){
                var mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach(function(mat){
                  if (!mat.__origColor) {
                    mat.__origColor = mat.color ? mat.color.clone() : new AFRAME.THREE.Color('#ffffff');
                  }
                  if (mat.color) {
                    var factor = self.data / 1.2;
                    mat.color.copy(mat.__origColor).multiplyScalar(factor);
                  }
                });
              }
            });
          });
        },
        update: function(){
          var self = this;
          var model = this.el.getObject3D('mesh');
          if (!model) return;
          model.traverse(function(node){
            if (node.isMesh && node.material){
              var mats = Array.isArray(node.material) ? node.material : [node.material];
              mats.forEach(function(mat){
                if (mat.__origColor && mat.color){
                  var factor = self.data / 1.2;
                  mat.color.copy(mat.__origColor).multiplyScalar(factor);
                }
              });
            }
          });
        }
      });
    }

    // Soft round contact shadow (radial dark → transparent), shared, so models
    // read as PLANTED on the card.
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
      sh.setAttribute('src', SHADOW_TEX);
      sh.setAttribute('width', size); sh.setAttribute('height', size);
      sh.setAttribute('position', p[0] + ' ' + p[1] + ' 0.004');
      sh.setAttribute('material', 'transparent: true; depthWrite: false; opacity: 0.9');
      return sh;
    }
    function rad2deg(r){ return (r || 0) * 180 / Math.PI; }
    function buildElement(el){
      var node;
      if (el.type === 'model' && el.url){
        node = document.createElement('a-gltf-model');
        node.setAttribute('src', el.url);
        if (el.animated) node.setAttribute('animation-mixer', 'loop: repeat');
        if (typeof el.brightness === 'number') node.setAttribute('gltf-brightness', el.brightness);
      } else if (el.type === 'image' && el.url){
        node = document.createElement('a-image');
        node.setAttribute('src', el.url); node.setAttribute('width', 0.3); node.setAttribute('height', 0.3);
      } else if (el.type === 'social'){
        node = document.createElement('a-entity');
        var bg = document.createElement('a-plane');
        bg.setAttribute('width', 0.26); bg.setAttribute('height', 0.26);
        bg.setAttribute('color', el.color || '#0A66C2'); bg.setAttribute('material', 'shader: flat');
        node.appendChild(bg);
        var tx = document.createElement('a-text');
        tx.setAttribute('value', el.label || 'Link'); tx.setAttribute('align', 'center');
        tx.setAttribute('color', '#ffffff'); tx.setAttribute('width', 0.6); tx.setAttribute('position', '0 0 0.01');
        node.appendChild(tx);
      } else if (el.type === 'video' && el.url){
        node = document.createElement('a-video');
        node.setAttribute('src', el.url); node.setAttribute('width', 0.5); node.setAttribute('height', 0.3);
        node.setAttribute('autoplay', 'true'); node.setAttribute('loop', 'true');
        node.setAttribute('playsinline', 'true'); node.setAttribute('muted', 'true');
      } else if (el.type === 'text' && el.text){
        node = document.createElement('a-text');
        node.setAttribute('value', el.text); node.setAttribute('align', 'center');
        node.setAttribute('color', el.color || '#18181b');
        node.setAttribute('width', 1.4); node.setAttribute('wrap-count', 16);
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

    buildScene(buildElement, buildShadow);
  });

  function buildScene(buildElement, buildShadow){
    var scene = document.createElement('a-scene');
    // Official 8th Wall A-Frame combo: gesture detector (taps), landing page
    // (unsupported-device fallback), loading + runtime-error UI (also drives the
    // camera + iOS DeviceMotion permission prompt that World Tracking needs).
    scene.setAttribute('xrextras-gesture-detector', '');
    scene.setAttribute('landing-page', '');
    scene.setAttribute('xrextras-loading', '');
    scene.setAttribute('xrextras-runtime-error', '');
    scene.setAttribute('renderer', 'colorManagement: true');
    // xrweb = the 8th Wall camera + tracking system. World Tracking (SLAM) on by
    // default; flip off (image-target only, no IMU needed) via ?worldtracking=0.
    scene.setAttribute('xrweb', D.worldTracking ? '' : 'disableWorldTracking: true');
    scene.setAttribute('vr-mode-ui', 'enabled: false');

    var cam = document.createElement('a-camera');
    cam.setAttribute('position', '0 0 0');
    cam.setAttribute('raycaster', 'objects: .clickable');
    cam.setAttribute('cursor', 'fuse: false; rayOrigin: mouse');
    scene.appendChild(cam);

    // Lighting — standard scene lighting defaults (equivalent to B = 1.2)
    var B = 1.2;
    function light(attr){ var e = document.createElement('a-entity'); e.setAttribute('light', attr); return e; }
    scene.appendChild(light('type: ambient; intensity: ' + (1.1 * B).toFixed(3)));
    scene.appendChild(light('type: hemisphere; intensity: ' + (0.8 * B).toFixed(3) + '; color: #ffffff; groundColor: #b0b4bd'));
    var dir = light('type: directional; intensity: ' + (1.1 * B).toFixed(3)); dir.setAttribute('position', '1 2 1'); scene.appendChild(dir);
    var fill = light('type: directional; intensity: ' + (0.5 * B).toFixed(3)); fill.setAttribute('position', '-1 1 -1'); scene.appendChild(fill);

    // The image-target anchor. Content rides a calibration wrapper so a single
    // scalar can correct any unit mismatch vs the editor's convention. For a
    // LANDSCAPE card both MindAR (width=1) and 8th Wall (longer-side=1) normalise
    // by the same (long) edge, so 1.0 should already line up; tune if device
    // testing shows the model too big/small.
    var UNIT = 1.0;
    var anchor = document.createElement('xrextras-named-image-target');
    anchor.setAttribute('name', (D.target && D.target.name) || 'card');
    var lostTimer = null;
    function showHint(){ lostTimer = null; hintEl.textContent = 'Point at the card'; }
    anchor.addEventListener('xrextrasfound', function(){ window.__ARSTATE__ = 'TRACKING'; if (lostTimer){ clearTimeout(lostTimer); lostTimer = null; } hintEl.textContent = ''; });
    anchor.addEventListener('xrextraslost', function(){ window.__ARSTATE__ = 'LOST'; if (lostTimer) clearTimeout(lostTimer); lostTimer = setTimeout(showHint, 2600); });

    var wrap = document.createElement('a-entity');
    wrap.setAttribute('scale', UNIT + ' ' + UNIT + ' ' + UNIT);
    (D.elements || []).forEach(function(el){ var sh = buildShadow(el); if (sh) wrap.appendChild(sh); var n = buildElement(el); if (n) wrap.appendChild(n); });
    anchor.appendChild(wrap);
    scene.appendChild(anchor);

    scene.addEventListener('xrextrasloaded', function(){ log('xrextras loaded'); setProg(55); });
    scene.addEventListener('realityready', function(){ log('realityready'); window.__ARSTATE__ = 'READY'; ready(); hintEl.textContent = 'Point at the card'; });
    scene.addEventListener('camerastatuschange', function(e){ log('camera status: ' + (e && e.detail && e.detail.status)); });

    document.body.appendChild(scene);
    log('8th Wall scene appended');
  }
})();
</script>
</body>
</html>`;
}
