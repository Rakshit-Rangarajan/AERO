import { NextRequest, NextResponse } from "next/server";
import { isProvider, providerSummary, requestOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request.headers.get("origin"));
  const providers = (["google", "microsoft"] as const)
    .filter(isProvider)
    .map(provider => providerSummary(provider, origin));
  return NextResponse.json({ origin, providers });
}