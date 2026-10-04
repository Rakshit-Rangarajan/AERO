import { NextRequest, NextResponse } from "next/server";
import { readAuthSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = readAuthSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session.user, expiresAt: session.expiresAt });
}