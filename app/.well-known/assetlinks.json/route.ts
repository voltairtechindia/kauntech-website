import { NextResponse } from "next/server";

/**
 * Android App Links (Digital Asset Links) manifest.
 *
 * Lets an Android phone open https://kauntech.com/card/<uuid> straight in
 * KaunTech instead of the browser — the link an NFC business card carries, and
 * the one in a shared card. Without this file the app's autoVerify intent
 * filter stays unverified and Android shows a chooser (or the browser).
 *
 * NFC tag dispatch does NOT depend on this: a tapped tag matches the app's
 * NDEF_DISCOVERED filter regardless. This only affects clicked/typed links.
 *
 * Two fingerprints, because a build can be signed by either key:
 *
 *   1. The upload/release keystore (kauntech-keys/release.keystore) — what a
 *      locally-signed APK is signed with.
 *   2. The Play App Signing certificate — what Google re-signs the AAB with
 *      before serving it, i.e. what every Play install actually carries.
 *      Play Console → Test and release → App integrity → App signing key
 *      certificate → SHA-256. Set it as ANDROID_PLAY_SIGNING_SHA256 in the
 *      Netlify environment; until it is set, Play installs stay unverified.
 */
const PACKAGE = "com.kauntech.bizcard";

const UPLOAD_CERT_SHA256 =
  "9A:7F:D1:36:8D:59:D9:19:FE:A4:7E:DC:51:93:11:CE:10:06:8A:EE:38:08:23:B6:03:3A:AE:39:C1:14:C6:D2";

const SHA256_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export const dynamic = "force-dynamic";

export function GET() {
  const playCert = (process.env.ANDROID_PLAY_SIGNING_SHA256 || "").toUpperCase().trim();

  // A malformed fingerprint invalidates the whole statement, so drop anything
  // that isn't a colon-separated SHA-256 rather than publishing it.
  const fingerprints = [UPLOAD_CERT_SHA256];
  if (SHA256_RE.test(playCert) && !fingerprints.includes(playCert)) {
    fingerprints.push(playCert);
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Content-Type": "application/json" } },
  );
}
