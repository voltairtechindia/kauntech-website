/**
 * AR playground: a full-screen camera that looks for a KaunTech card QR and,
 * when it finds one, hands off to that card's WebAR viewer (/ar/view/<id>).
 * Opened from the app's dedicated AR button. Standalone HTML (no studio chrome).
 *
 * QR detection uses jsQR (no WASM); the per-card viewer (/ar/view) does the
 * MindAR image tracking. Same family of tech as MyWebAR / Kivicube / 8th Wall.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSQR = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";

export async function GET() {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>AR Playground</title>
<style>
  html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;color:#fff}
  video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
  #frame{position:fixed;z-index:2;top:50%;left:50%;transform:translate(-50%,-50%);width:min(72vw,320px);height:min(72vw,320px);border-radius:24px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.85)}
  #frame::before,#frame::after{content:'';position:absolute;width:34px;height:34px;border:3px solid #F59E0B}
  #frame::before{top:-2px;left:-2px;border-right:0;border-bottom:0;border-top-left-radius:24px}
  #frame::after{bottom:-2px;right:-2px;border-left:0;border-top:0;border-bottom-right-radius:24px}
  #hint{position:fixed;z-index:3;left:0;right:0;bottom:11%;text-align:center;font-size:15px;text-shadow:0 1px 4px rgba(0,0,0,.7);padding:0 24px}
  #err{position:fixed;inset:0;z-index:5;display:none;align-items:center;justify-content:center;text-align:center;padding:28px;background:#0a0a0a}
</style>
</head>
<body>
<video id="v" autoplay muted playsinline></video>
<div id="frame"></div>
<div id="hint">Point at a KaunTech card’s QR code</div>
<div id="err"><div><p id="errmsg">Camera access is needed for AR.</p></div></div>
<script src="${JSQR}"></script>
<script>
(function(){
  var KT = /kauntech\\.com\\/card\\/([a-f0-9-]{36})/i;
  var video = document.getElementById('v');
  var hint = document.getElementById('hint');
  var errEl = document.getElementById('err');
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var done = false;

  function fail(msg){ document.getElementById('errmsg').textContent = msg; errEl.style.display = 'flex'; }

  function tick(){
    if (done) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR){
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data){
          var m = code.data.match(KT);
          if (m){
            done = true;
            hint.textContent = 'Opening AR…';
            location.href = '/ar/view/' + m[1];
            return;
          }
        }
      } catch(e){}
    }
    requestAnimationFrame(tick);
  }

  function boot(){
    errEl.style.display = 'none';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      fail('Camera needs a secure (https) connection.');
      return;
    }
    // Try the back camera first, then fall back to any camera — some WebViews
    // and emulators reject the strict facingMode constraint.
    var attempts = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false }
    ];
    (function tryNext(i){
      if (i >= attempts.length){ fail('Allow camera access, then tap to retry.'); return; }
      navigator.mediaDevices.getUserMedia(attempts[i])
        .then(function(stream){
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          return video.play();
        })
        .then(function(){ requestAnimationFrame(tick); })
        .catch(function(){ tryNext(i + 1); });
    })(0);
  }

  errEl.style.cursor = 'pointer';
  errEl.addEventListener('click', boot);
  boot();
})();
</script>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
