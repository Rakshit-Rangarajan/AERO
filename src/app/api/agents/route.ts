import { NextResponse } from "next/server";
import { agents, toPublicAgent } from "@/agents";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ agents: agents.map(toPublicAgent) });
}
