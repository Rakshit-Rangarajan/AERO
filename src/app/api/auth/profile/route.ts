import { NextRequest, NextResponse } from "next/server";
import { readAuthSession, SESSION_COOKIE, updateUserProfile } from "@/lib/auth";
import { recordAudit } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const session = readAuthSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "A profile update body is required." }, { status: 400 });
  const text = (key: string, limit: number) => {
    const value = body[key];
    return typeof value === "string" ? value.trim().slice(0, limit) : undefined;
  };
  const user = updateUserProfile(session.user.id, {
    name: text("name", 120),
    title: text("title", 120),
    bio: text("bio", 600),
    timezone: text("timezone", 60),
    phone: text("phone", 40),
  });
  if (!user) return NextResponse.json({ error: "The profile could not be saved." }, { status: 500 });
  recordAudit(null, "auth.profile_updated", JSON.stringify({ userId: user.id }));
  return NextResponse.json({ user });
}