import { NextRequest, NextResponse } from "next/server";
import { readAuthSession, refreshProviderProfile, SESSION_COOKIE } from "@/lib/auth";
import { recordAudit } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = readAuthSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Sign in to refresh your profile." }, { status: 401 });
  try {
    const user = await refreshProviderProfile(session.user.id);
    if (!user) return NextResponse.json({ error: "The profile could not be refreshed." }, { status: 500 });
    recordAudit(null, "auth.profile_refreshed", JSON.stringify({ userId: user.id, provider: user.provider }));
    return NextResponse.json({ user });
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "The profile could not be refreshed.";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}