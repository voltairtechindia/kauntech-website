import { NextResponse } from "next/server";

/**
 * Apple Universal Links manifest.
 *
 * Lets an iPhone that already has KaunTech installed open referral links
 * (https://kauntech.com/r/<code>) directly in the app instead of Safari. When
 * the app isn't installed, iOS ignores this and the link falls through to the
 * normal /r/[code] web page, which redirects to the App Store.
 *
 * `appID` = "<Apple Team ID>.<bundle id>". Bundle id is com.kauntech.bizcard;
 * the Team ID (developer.apple.com → Membership details) is 67HQV24JQ7. The
 * env var can override it. A non-10-char value returns 404 so a broken manifest
 * is never published (a malformed AASA silently disables Universal Links).
 */
const TEAM_ID = process.env.IOS_APP_TEAM_ID || "67HQV24JQ7";
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
