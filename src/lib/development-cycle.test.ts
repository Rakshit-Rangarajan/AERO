import { describe,it,expect } from "vitest";
import { cycleStages,cycleTransition,humanGates } from "./development-cycle";
describe("development cycle human approval boundaries",()=>{
 it("has ordered unique stages and three explicit checkpoints",()=>{
 expect(new Set(cycleStages.map(s=>s.id)).size).toBe(cycleStages.length);
 expect(humanGates).toEqual(["plan-approval","quality-approval","release-approval"]);
 });
 it("rejects unapproved human gates",()=>{
 for(const gate of humanGates){ const index=cycleStages.findIndex(s=>s.id===gate);
 expect(()=>cycleTransition(index,false,"evidence")).toThrow("human approval");}
 });
 it("rejects empty evidence and invalid stages",()=>{
 expect(()=>cycleTransition(0,false," ")).toThrow("evidence");
 expect(()=>cycleTransition(-1,false,"test")).toThrow("Invalid");
 });
 it("allows recorded evidence and approved gate",()=>{
 expect(cycleTransition(0,false,"requirements")).toMatchObject({nextStage:1,decision:"recorded"});
 const i=cycleStages.findIndex(s=>s.id==="plan-approval");
 expect(cycleTransition(i,true,"Reviewed estimate and risks")).toMatchObject({nextStage:i+1,decision:"approved"});
 });
});
