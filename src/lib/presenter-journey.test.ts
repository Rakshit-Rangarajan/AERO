import { describe, expect, it } from "vitest";
import { presenterProgress, presenterSteps } from "./presenter-journey";
describe("presenter journey", () => {
 it("references existing demo actions and orders dependency gates", () => {
  const steps = presenterSteps();
  const seen = new Set<string>();
  for (const step of steps) {
   if (step.action.requires) expect(seen.has(`${step.action.requires.workflowId}:${step.action.requires.actionId}`), step.action.label).toBe(true);
   seen.add(`${step.workflowId}:${step.actionId}`);
  }
  expect(new Set(steps.map(step => `${step.workflowId}:${step.actionId}`)).size).toBe(steps.length);
 });
 it("reports progress and first unfinished step independent of ordering of run records", () => {
  const steps = presenterSteps();
  const records = steps.slice(0, 2).reverse().map(step => ({workflowId:step.workflowId,actionId:step.actionId}));
  expect(presenterProgress(records).completed).toBe(2);
  expect(presenterProgress(records).next?.actionId).toBe(steps[2].actionId);
  expect(presenterProgress(steps).next).toBeNull();
 });
});
