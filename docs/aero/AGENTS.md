# Agents

## Profile layout

Every built-in profile has its own module under [`src/agents`](../../src/agents). The shared shape lives in `types.ts`; `index.ts` is the explicit registry and prompt builder. Keep each profile's name, role, persona, voice, signature response, specialties, instructions, and grants in its individual module. Add registry coverage when adding a profile.

## Named profiles

| Role | Name | Signature response |
| --- | --- | --- |
| Architect | Ada Meridian | Shape / Boundaries / Trade-offs / Decision |
| Principal Engineer | Gideon Vale | Call / Cost / Failure mode / First move |
| Engineering Manager | Mara Chen | Outcome / Owner / Blocker / Checkpoint |
| Developer | Theo Park | Change / Why / Verify |
| Frontend Engineer | Leila Santos | Interaction / State / Accessibility / Polish |
| Backend Engineer | Ishan Rao | Contract / Data / Failure / Safeguard |
| Full Stack Engineer | Nia Okafor | User path / Touchpoints / Edge case / End-to-end check |
| QA Engineer | Priya Nand | Risk / Scenario / Evidence / Exit |
| Security Engineer | Omar Haddad | Asset / Attack path / Impact / Control |
| Performance Engineer | Vivian Brooks | Budget / Hot path / Measure / Optimize |
| SRE / Operations | Elias Ward | Signal / Blast radius / Recovery / Guardrail |
| Product Manager | Sofia Alvarez | User / Outcome / Scope / Acceptance |
| UX/UI Agent | Ren Ito | Hierarchy / Friction / Better path / Detail |
| Research Agent | Farah Qureshi | Question / Evidence / Confidence / Unknowns |
| RCA Agent | Kofi Mensah | Timeline / Conditions / Causal link / Prevention |
| Release Agent | Helena Costa | Readiness / Evidence / Gate / Rollback |
| Executive Agent | Marcus Bell | Impact / Exposure / Decision / Ask |
| Round Table Moderator | Noor Bennett | Agreements / Tensions / Synthesis / Open decision |

## Runtime and permissions

The API accepts an agent ID from the server-owned registry; it does not trust arbitrary prompt text or role names supplied by the browser. Each configured model call receives the selected profile's persona, voice, signature instructions, and an explicit boundary statement. Only public profile information is returned to the UI; private instructions remain server-side.

Every profile currently has narrow chat-only grants: read the current submitted message and relevant excerpts selected from the workspace knowledge base, write one reply, execute no tools. Retrieved document text is untrusted reference data and is never treated as instructions. Specialties describe response focus, not actual access to Jira, Git, files, web search, deployments, or any other tool. The UI reports “Session chat only.” The local adapter does not invoke an LLM; it explains that limitation in its reply.

Before giving an agent tools, add capability-specific grants, authorization checks at each tool boundary, workflow approval gates, and audit evidence. Persona is not authorization.
