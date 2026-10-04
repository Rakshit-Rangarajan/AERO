import { NextRequest, NextResponse } from "next/server";
import { clearProviderCredentials, isProvider, providerSummary, requestOrigin, saveProviderCredentials } from "@/lib/auth";
import { recordAudit } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null) as { provider?: string; clientId?: string; clientSecret?: string } | null;
  if (!body?.provider || !isProvider(body.provider)) {
    return NextResponse.json({ error: "Choose Google or Outlook." }, { status: 400 });
  }
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Both a client ID and a client secret are required." }, { status: 400 });
  }
  saveProviderCredentials(body.provider, clientId, clientSecret);
  recordAudit(null, "auth.provider_configured", JSON.stringify({ provider: body.provider }));
  const origin = requestOrigin(request.headers.get("origin"));
  return NextResponse.json({ provider: providerSummary(body.provider, origin) });
}

export async function DELETE(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");
  if (!provider || !isProvider(provider)) return NextResponse.json({ error: "Choose Google or Outlook." }, { status: 400 });
  clearProviderCredentials(provider);
  recordAudit(null, "auth.provider_cleared", JSON.stringify({ provider }));
  return NextResponse.json({ cleared: provider });
}