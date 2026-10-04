import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  const results = {
    azure: false,
    gcloud: false,
    gcpProject: null as string | null
  };
  
  // Check Azure CLI
  try {
    const { stdout } = await execAsync("az account show");
    if (stdout && stdout.includes("environmentName")) {
      results.azure = true;
    }
  } catch (e) {
    // Azure CLI not installed or not logged in
  }
  
  // Check Google Cloud CLI (Vertex AI)
  try {
    const { stdout } = await execAsync("gcloud config get-value project");
    const project = stdout.trim();
    if (project && !project.includes("WARNING")) {
      results.gcloud = true;
      results.gcpProject = project;
    }
  } catch (e) {
    // gcloud not installed or not logged in
  }

  return NextResponse.json(results);
}
