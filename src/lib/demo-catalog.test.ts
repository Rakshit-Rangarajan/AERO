import { describe, expect, it } from "vitest";
import { demoWorkflows } from "./demo-catalog";

describe("demo workbench catalogue", () => {
  it("has unique feature routes and action keys", () => {
    expect(new Set(demoWorkflows.map(workflow => workflow.id)).size).toBe(demoWorkflows.length);
    expect(new Set(demoWorkflows.map(workflow => workflow.nav)).size).toBe(demoWorkflows.length);
    for (const workflow of demoWorkflows) {
      expect(workflow.actions.length, workflow.id).toBeGreaterThan(0);
      expect(new Set(workflow.actions.map(action => action.id)).size, workflow.id).toBe(workflow.actions.length);
    }
  });

  it("labels every fixture result as a simulation and resolves all gates", () => {
    for (const workflow of demoWorkflows) {
      for (const action of workflow.actions) {
        expect(action.output, `${workflow.id}:${action.id}`).toContain("MOCK MODE");
        if (action.requires) {
          const requiredWorkflow = demoWorkflows.find(item => item.id === action.requires?.workflowId);
          expect(requiredWorkflow, `${workflow.id}:${action.id} workflow gate`).toBeDefined();
          expect(requiredWorkflow?.actions.some(item => item.id === action.requires?.actionId), `${workflow.id}:${action.id} action gate`).toBe(true);
        }
      }
    }
  });

  it("keeps coding, testing, pull request, and environment actions behind approval gates", () => {
    const actions = (id: string) => demoWorkflows.find(workflow => workflow.id === id)?.actions ?? [];
    expect(actions("development").every(action => action.requires?.workflowId === "plans" && action.requires.actionId === "approve")).toBe(true);
    expect(actions("code-review")[0]?.requires?.workflowId).toBe("development");
    expect(actions("testing")[0]?.requires?.workflowId).toBe("development");
    expect(actions("pull-requests")[0]?.requires?.workflowId).toBe("testing");
    expect(actions("environments").every(action => action.requires?.workflowId === "release" && action.requires.actionId === "manual-deploy")).toBe(true);
  });
});


describe("complete demo branch coverage", () => {
  it("exposes every core presentation area", () => {
    const required = ["Integrations","Work items","Confluence","Azure DevOps","Repositories","Analysis","Round table","Plans","Development","Development cycle","Reviews","Testing","Pull requests","Releases","Environments","Failure analysis","Knowledge intelligence","Documents","Ingestion","Model routing","Workflow controls","Observability","Security","Sessions","Agents","Group chats","Companies","OKRs","Feature flags","Incidents","Analytics","Estimation","Agent memory","Profile","Setup & AI","Document library","Release notes","Command center"];
    const available = new Set(demoWorkflows.map(item => item.nav));
    for (const name of required) expect(available.has(name), name).toBe(true);
  });
});
