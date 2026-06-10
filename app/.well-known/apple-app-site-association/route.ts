import { NextResponse } from "next/server";

/**
 * Apple Universal Links manifest.
 *
 * Lets an iPhone that already has KaunTech installed open referral links
 * (https://kauntech.com/r/<code>) directly in the app instead of Safari. When
 * the app isn't installed, iOS ignores this and the link falls through to the
 * normal /r/[code] web page, which redirects to the App Store.
 *
 * `appID` = "<Apple Team ID>.<bundle id>". The bundle id is com.kauntech.bizcard;
 * the 10-char Team ID lives in App Store Connect → Membership (or run
 * `eas credentials`). Set it via the IOS_APP_TEAM_ID env var, or replace the
 * placeholder below. Until it's a real Team ID we return 404 so a broken
 * manifest is never published (a malformed AASA silently disables Universal
 * Links for everyone).
 */
const TEAM_ID = process.env.IOS_APP_TEAM_ID || "TEAMID"; // e.g. "ABCDE12345"
const BUNDLE_ID = "com.kauntech.bizcard";

export const dynamic = "force-dynamic";

export function GET() {
  if (!/^[A-Z0-9]{10}$/.test(TEAM_ID)) {
    return new NextResponse("Universal Links not configured", { status: 404 });
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${TEAM_ID}.${BUNDLE_ID}`,
            // Only referral invite links open the app — everything else on
            // kauntech.com stays in the browser.
            paths: ["/r/*"],
          },
        ],
      },
    },
    { headers: { "Content-Type": "application/json" } },
  );
}
