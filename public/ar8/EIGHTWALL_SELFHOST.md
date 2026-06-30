# Self-hosted 8th Wall engine (survives the platform shutdown)

8th Wall's **hosted platform was retired Feb 28, 2026**; cloud-hosted experiences
stop Feb 28, 2027. The engine itself is now a **MIT open-source** release (Niantic
Spatial, 8thwall.org). KaunTech's `/ar` viewer uses 8th Wall, so to make sure
**published AR cards keep working after the shutoff** we self-host the whole engine
here and removed every call to 8th Wall's servers.

## Files (`public/ar8/`)
- `8frame-1.5.0.min.js` — 8th Wall's A-Frame build.
- `engine/xr.js`, `xr-slam.js`, `xrextras.js` — the engine (patched). xr.js loads
  its SLAM chunk + `resources/` relative to itself.
- `engine/resources/` — workers, UI assets, + the vendored **Draco** chain
  (`draco-worker-…js`, `draco_wasm_wrapper-…js`, `draco_decoder.wasm`), all patched
  to load from `/ar8/engine/resources/` instead of `cdn.8thwall.com` / `gstatic`.
- `qrcode.js` — qrcode-generator (vendored; the desktop gate's QR).
- `aframe/fonts/Roboto-msdf.json` + `.png` — A-Frame's default text/button font
  (vendored); the viewer sets `window.AFRAME_CDN_ROOT="/ar8/aframe/"` before 8frame
  loads so text elements never fetch `cdn.aframe.io`.

Trimmed the unused face + semantic-segmentation chunks (we only use image targets
+ SLAM). Sourced from `npm pack @8thwall/engine-binary@1` (MIT). `lib/ar/eightwallViewer.ts`
points at `/ar8/engine/xr.js` + `/ar8/engine/xrextras.js` + `/ar8/qrcode.js`.

## Audit result
At runtime the viewer fetches only same-origin (`/ar8/...`) + Supabase (GLBs /
target images) + any external media URL an owner pasted. **Nothing from
`*.8thwall.com`.** Residual `apps.8thwall.com` / `docs.8thwall.com` strings are the
unused Niantic-VPS code path + a `console.warn` (no blocking request). The app-key
license gate is gone in the open-source build.

> Note: the `/ar/play` debug route still loads `jsQR` from jsDelivr — that's a
> separate, stable CDN unaffected by the 8th Wall shutdown, so it's left as-is.
