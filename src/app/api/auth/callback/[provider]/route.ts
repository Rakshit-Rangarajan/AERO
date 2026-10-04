import { NextRequest, NextResponse } from "next/server";
import {
  consumeOAuthPending,
  createAuthSession,
  exchangeCodeForToken,
  fetchProviderProfile,
  isProvider,
  requestOrigin,
  SESSION_COOKIE,
  upsertOAuthUser,
} from "@/lib/auth";
import { recordAudit } from "@/lib/db";

export const runtime = "nodejs";

function failure(origin: string, reason: string) {
  return NextResponse.redirect(profileRedirect(origin, reason));
}

/** Nav lives in the hash, so the result goes in the query string and the page in the hash. */
function profileRedirect(origin: string, result: string, hash = "Profile") {
  const url = new URL(origin);
  url.searchParams.set("auth", result);
  url.hash = encodeURIComponent(hash);
  return url;
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = requestOrigin(request.headers.get("origin"));
  const error = request.nextUrl.searchParams.get("error");
  if (error) return failure(origin, `denied-${provider}`);
  if (!isProvider(provider)) return failure(origin, "unknown-provider");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return failure(origin, `incomplete-${provider}`);

  const pending = consumeOAuthPending(state);
  if (!pending || pending.provider !== provider) return failure(origin, `expired-${provider}`);

  try {
    const accessToken = await exchangeCodeForToken(provider, code, pending.codeVerifier, origin);
    const profile = await fetchProviderProfile(provider, accessToken);
    if (!profile.id) return failure(origin, `no-identity-${provider}`);
    const userId = upsertOAuthUser(provider, profile, accessToken);
    const session = createAuthSession(userId);
    recordAudit(null, "auth.signed_in", JSON.stringify({ provider, email: profile.email }));
    const target = new URL(pending.returnTo.startsWith("/") ? pending.returnTo : "/#Profile", origin);
    const redirect = profileRedirect(origin, "ok", target.hash ? decodeURIComponent(target.hash.slice(1)) : "Profile");
    const response = NextResponse.redirect(redirect);
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "Sign-in failed.";
    recordAudit(null, "auth.failed", JSON.stringify({ provider, detail }));
    return failure(origin, `failed-${provider}`);
  }
}