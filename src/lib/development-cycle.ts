export const cycleStages = [
  { id:"intake", label:"Ticket intake", owner:"Product", evidence:"Ticket, acceptance criteria, links" },
  { id:"quick-analysis", label:"Quick analysis", owner:"Research", evidence:"Initial impact and unknowns" },
  { id:"standard-analysis", label:"Standard analysis", owner:"Architect", evidence:"Dependencies, code map, risks" },
  { id:"deep-analysis", label:"Deep architecture analysis", owner:"Architect", evidence:"Alternatives, security, performance" },
  { id:"research", label:"Research and historical RCA", owner:"Knowledge", evidence:"Related tickets, KB references and hypotheses" },
  { id:"round-table", label:"Multi-agent Round Table", owner:"Moderator", evidence:"Agent opinions and open questions" },
  { id:"estimate", label:"Dev/QA estimation", owner:"Engineering lead", evidence:"Story points and separate Dev/QA hours" },
  { id:"plan-approval", label:"Human approves plan", owner:"Human", evidence:"Explicit review decision" },
  { id:"branch", label:"Branch and implementation", owner:"Developer", evidence:"Proposed branch, changes, commits" },
  { id:"code-review", label:"Code review", owner:"Reviewer", evidence:"Diff findings and response" },
  { id:"unit-tests", label:"Unit and integration testing", owner:"QA", evidence:"Test commands, reports, coverage" },
  { id:"playwright", label:"Playwright E2E", owner:"QA automation", evidence:"Browser artifacts, screenshots, traces" },
  { id:"quality-approval", label:"Human quality approval", owner:"Human", evidence:"Reviewed code and test evidence" },
  { id:"pull-request", label:"PR creation and checks", owner:"Release", evidence:"PR URL and branch checks" },
  { id:"stage", label:"Stage deployment and validation", owner:"Release", evidence:"Build fingerprint and smoke tests" },
  { id:"release-approval", label:"Human release approval", owner:"Human", evidence:"Release authorisation" },
  { id:"production", label:"Production release", owner:"Release", evidence:"Change ticket and rollback plan" },
  { id:"knowledge", label:"RCA and knowledge capture", owner:"Knowledge", evidence:"Source-linked lessons and runbook" },
] as const;
export type CycleStageId = typeof cycleStages[number]["id"];
export const humanGates: readonly CycleStageId[] = ["plan-approval","quality-approval","release-approval"];
export function cycleTransition(stage: number, approved: boolean, evidence: string) {
 if (!Number.isInteger(stage) || stage < 0 || stage >= cycleStages.length) throw new Error("Invalid cycle stage.");
 if (!evidence.trim() || evidence.length>4000) throw new Error("Add a short evidence note (maximum 4000 characters).");
 if (humanGates.includes(cycleStages[stage].id) && !approved) throw new Error("An explicit human approval is required at this gate.");
 return { nextStage: stage+1, stageId: cycleStages[stage].id, decision: humanGates.includes(cycleStages[stage].id)?"approved":"recorded" };
}
