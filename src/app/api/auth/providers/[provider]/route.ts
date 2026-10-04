import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  createPkcePair,
  isProvider,
  providerSummary,
  randomToken,
  requestOrigin,
  storeOAuthPending,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = requestOrigin(request.headers.get("origin"));
  const profileRedirect = (result: string) => {
    const url = new URL(origin);
    url.searchParams.set("auth", result);
    url.hash = encodeURIComponent("Profile");
    return NextResponse.redirect(url);
  };
  if (!isProvider(provider)) return profileRedirect("unknown-provider");
  const summary = providerSummary(provider, origin);
  if (!summary.configured) return profileRedirect(`missing-${provider}`);
  const state = randomToken(24);
  const { verifier, challenge } = createPkcePair();
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? `/#${encodeURIComponent("Profile")}`;
  storeOAuthPending(provider, state, verifier, returnTo);
  return NextResponse.redirect(buildAuthorizeUrl(provider, { state, challenge, origin, loginHint: request.nextUrl.searchParams.get("loginHint") ?? undefined }));
}