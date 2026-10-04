import { NextRequest, NextResponse } from "next/server";
import { destroyAuthSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ signedOut: true });
  destroyAuthSession(request.cookies.get(SESSION_COOKIE)?.value ?? "");
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}