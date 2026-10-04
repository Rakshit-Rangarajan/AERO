import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { command, args, env } = body;

    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const transport = new StdioClientTransport({
      command,
      args: args || [],
      env: { ...process.env, ...env }
    });

    const client = new Client(
      { name: "aero-verifier", version: "1.0.0" },
      { capabilities: {} }
    );

    // Timeout logic to prevent hanging
    const connectPromise = async () => {
      await client.connect(transport);
      const tools = await client.listTools();
      return tools;
    };

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Connection timed out after 15 seconds")), 15000);
    });

    const toolsResult = await Promise.race([connectPromise(), timeoutPromise]);
    
    // Disconnect after verifying
    try {
      await transport.close();
    } catch (e) {
      // Ignore close errors
    }

    return NextResponse.json({ success: true, tools: (toolsResult as any).tools });
  } catch (error: any) {
    console.error("MCP Verify Error:", error);
    return NextResponse.json({ error: error.message || "Failed to connect to MCP server" }, { status: 500 });
  }
}
