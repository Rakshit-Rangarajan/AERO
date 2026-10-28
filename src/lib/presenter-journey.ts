/** Presenter-safe journey across the existing deterministic demo catalogue. */
import { demoWorkflows } from "./demo-catalog";

export const presenterJourney = [
  { workflowId: "jira-analysis", actionId: "ticket", takeaway: "Start with the incoming work item and its acceptance criteria." },
  { workflowId: "jira-analysis", actionId: "context", takeaway: "Show how source context is assembled before analysis." },
  { workflowId: "analysis", actionId: "deep", takeaway: "Compare detailed risk and dependency analysis." },
  { workflowId: "round-table", actionId: "select", takeaway: "Select the architecture, engineering, QA and security reviewers." },
  { workflowId: "round-table", actionId: "deliberate", takeaway: "Present discipline-specific tradeoffs." },
  { workflowId: "round-table", actionId: "synthesis", takeaway: "Converge on a recommended implementation approach." },
  { workflowId: "plans", actionId: "draft", takeaway: "Review the proposed plan before execution." },
  { workflowId: "plans", actionId: "approve", takeaway: "Demonstrate the explicit human approval gate." },
  { workflowId: "development", actionId: "implementation", takeaway: "Review an illustrative implementation summary." },
  { workflowId: "code-review", actionId: "review", takeaway: "Inspect example review findings." },
  { workflowId: "testing", actionId: "discover", takeaway: "Identify tests relevant to the change." },
  { workflowId: "testing", actionId: "run", takeaway: "Show a simulated report that includes a failure, not a fabricated perfect pass." },
  { workflowId: "failure-analysis", actionId: "collect", takeaway: "Collect synthetic failure evidence for investigation." },
  { workflowId: "pull-requests", actionId: "preview", takeaway: "Prepare a PR preview, without creating a remote PR." },
  { workflowId: "release", actionId: "candidate", takeaway: "Inspect release readiness and stop for human deployment." },
  { workflowId: "release", actionId: "manual-deploy", takeaway: "Record only a simulated manual deployment." },
  { workflowId: "environments", actionId: "dev", takeaway: "Review simulated environment validation checks." },
  { workflowId: "knowledge-intelligence", actionId: "capture", takeaway: "Close the loop by capturing a reusable learning." },
] as const;

export function presenterSteps() {
  return presenterJourney.map((item, index) => {
    const workflow = demoWorkflows.find(entry => entry.id === item.workflowId);
    const action = workflow?.actions.find(entry => entry.id === item.actionId);
    if (!workflow || !action) throw new Error(`Invalid presenter step ${index}`);
    return { ...item, workflow, action };
  });
}

export function presenterProgress(runs: ReadonlyArray<{ workflowId: string; actionId: string }>) {
  const complete = new Set(runs.map(run => `${run.workflowId}:${run.actionId}`));
  const steps = presenterSteps();
  return { total: steps.length, completed: steps.filter(step => complete.has(`${step.workflowId}:${step.actionId}`)).length,
    next: steps.find(step => !complete.has(`${step.workflowId}:${step.actionId}`)) ?? null };
}
