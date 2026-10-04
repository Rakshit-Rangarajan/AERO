"use client";

import { useEffect, useState } from "react";
import { Building2, Check, CircleAlert, ExternalLink, Plus, Save, Trash2 } from "lucide-react";

type Repository = { id?: string; name: string; remoteUrl: string; provider: string; defaultBranch: string };
type Company = {
  id: string; name: string; description: string; jiraUrl: string; jiraProjects: string;
  confluenceUrl: string; confluenceSpaces: string; azureDevOpsUrl: string; azureProject: string;
  documentationUrl: string; ciUrl: string; defaultBranch: string; repositories: Repository[];
};
type CompanyState = { activeCompanyId: string | null; companies: Company[] };
type TextField = Exclude<keyof Company, "id" | "repositories">;

const linkFields: Array<{ key: TextField; label: string; placeholder: string; kind: "url" | "text" }> = [
  { key: "jiraUrl", label: "Jira site URL", placeholder: "https://brandbuilder.atlassian.net", kind: "url" },
  { key: "jiraProjects", label: "Jira project keys", placeholder: "PAY, PLATFORM", kind: "text" },
  { key: "confluenceUrl", label: "Confluence URL", placeholder: "https://brandbuilder.atlassian.net/wiki", kind: "url" },
  { key: "confluenceSpaces", label: "Confluence spaces", placeholder: "ENG, ARCH", kind: "text" },
  { key: "azureDevOpsUrl", label: "Azure DevOps organization", placeholder: "https://dev.azure.com/brandbuilder", kind: "url" },
  { key: "azureProject", label: "Azure DevOps project", placeholder: "Payments", kind: "text" },
  { key: "documentationUrl", label: "Engineering docs / runbooks", placeholder: "https://docs.brandbuilder.com/engineering", kind: "url" },
  { key: "ciUrl", label: "CI / build dashboard", placeholder: "https://ci.brandbuilder.com", kind: "url" },
];

export function CompanySettings() {
  const [data, setData] = useState<CompanyState | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const reload = () => fetch("/api/companies").then(response => response.ok ? response.json() : null).then(result => { if (active && result) setData(result); });
    void reload();
    window.addEventListener("aero:company-change", reload);
    return () => { active = false; window.removeEventListener("aero:company-change", reload); };
  }, []);

  const company = data?.companies.find(item => item.id === data.activeCompanyId);

  function updateField(key: TextField, value: string) {
    setData(current => current ? { ...current, companies: current.companies.map(item => item.id === current.activeCompanyId ? { ...item, [key]: value } : item) } : current);
  }

  function updateRepository(index: number, key: keyof Repository, value: string) {
    setData(current => current ? { ...current, companies: current.companies.map(item => item.id === current.activeCompanyId ? { ...item, repositories: item.repositories.map((repository, row) => row === index ? { ...repository, [key]: value } : repository) } : item) } : current);
  }

  async function createCompany(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/companies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newName }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create company.");
      setData(result); setNewName(""); setNotice("Company created and selected.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create company."); }
    finally { setBusy(false); }
  }

  async function selectCompany(companyId: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/companies", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "select", companyId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not switch company.");
      setData(result); window.dispatchEvent(new Event("aero:company-change"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not switch company."); }
    finally { setBusy(false); }
  }

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault();
    if (!company) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/companies", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...company, repositories: company.repositories }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save company settings.");
      setData(result); setNotice(`Saved ${company.name} and ${company.repositories.length} repository link${company.repositories.length === 1 ? "" : "s"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save company settings."); }
    finally { setBusy(false); }
  }

  if (!data || !company) return <section className="company-page panel"><div className="company-heading"><Building2 size={17}/><div><h2>Companies</h2><p>Loading company profiles…</p></div></div></section>;

  return <section className="company-page panel">
    <header className="company-heading"><span className="company-heading-icon"><Building2 size={16}/></span><div><span className="company-eyebrow">WORKSPACE CONFIGURATION</span><h2>Company profile & links</h2><p>Keep each company’s project links and repository list together. Choose the active company from the workspace switcher.</p></div><label className="company-active-wrap"><span>ACTIVE COMPANY</span><select aria-label="Active company" disabled={busy} value={data.activeCompanyId ?? ""} onChange={event => void selectCompany(event.target.value)}>{data.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className="company-count">{data.companies.length} total</span></header>
    <div className="company-scope-note"><CircleAlert size={15}/><span><strong>Configuration only.</strong> Links are saved locally and are not connected or authenticated. Existing sessions and knowledge remain shared in this single-user workspace; selecting a company does not currently partition that data.</span></div>
    {error && <div className="company-alert error" role="alert"><CircleAlert size={14}/>{error}</div>}
    {notice && <div className="company-alert success" role="status"><Check size={14}/>{notice}</div>}

    <form className="company-create" onSubmit={createCompany}><label htmlFor="new-company-name"><span>ADD A COMPANY</span><input id="new-company-name" value={newName} onChange={event => setNewName(event.target.value)} maxLength={100} placeholder="e.g. BrandBuilder"/></label><button type="submit" disabled={busy || !newName.trim()}><Plus size={14}/> Create & select</button></form>

    <form onSubmit={saveCompany}>
      <div className="company-section"><div className="company-section-title"><span>01</span><div><h3>Company details</h3><p>Basic identity and default branch context.</p></div></div><div className="company-form-grid"><label><span>COMPANY NAME</span><input required value={company.name} onChange={event => updateField("name", event.target.value)} maxLength={100}/></label><label><span>DEFAULT BRANCH</span><input value={company.defaultBranch} onChange={event => updateField("defaultBranch", event.target.value)} maxLength={100} placeholder="main"/></label><label className="company-field-wide"><span>TEAM CONTEXT</span><textarea value={company.description} onChange={event => updateField("description", event.target.value)} maxLength={500} rows={2} placeholder="Product area, team, or engineering context"/></label></div></div>

      <div className="company-section"><div className="company-section-title"><span>02</span><div><h3>Related systems</h3><p>URLs and project identifiers for future adapters.</p></div></div><div className="company-form-grid">{linkFields.map(field => <label key={field.key}><span>{field.label.toUpperCase()}</span><input type={field.kind === "url" ? "url" : "text"} value={company[field.key]} onChange={event => updateField(field.key, event.target.value)} maxLength={500} placeholder={field.placeholder}/></label>)}</div></div>

      <div className="company-section"><div className="company-section-title company-repo-title"><span>03</span><div><h3>Repositories</h3><p>Add multiple repositories for this company. Links are references only; AERO does not clone or scan them.</p></div><button type="button" className="company-add-repo" onClick={() => setData(current => current ? { ...current, companies: current.companies.map(item => item.id === current.activeCompanyId ? { ...item, repositories: [...item.repositories, { name: "", remoteUrl: "", provider: "GitHub", defaultBranch: item.defaultBranch || "main" }] } : item) } : current)}><Plus size={13}/> Add repository</button></div>
        {company.repositories.length === 0 ? <div className="company-repo-empty">No repository links yet. Add one or more repositories to this company.</div> : <div className="company-repository-list">{company.repositories.map((repository, index) => <div className="company-repository-row" key={repository.id ?? `new-${index}`}><label><span>REPOSITORY NAME</span><input value={repository.name} onChange={event => updateRepository(index, "name", event.target.value)} placeholder="payments-service" maxLength={100}/></label><label><span>REMOTE URL</span><input value={repository.remoteUrl} onChange={event => updateRepository(index, "remoteUrl", event.target.value)} placeholder="https://github.com/brandbuilder/payments-service.git" maxLength={500}/></label><label><span>PROVIDER</span><select value={repository.provider} onChange={event => updateRepository(index, "provider", event.target.value)}><option>GitHub</option><option>Azure DevOps</option><option>GitLab</option><option>Bitbucket</option><option>Other</option></select></label><label><span>DEFAULT BRANCH</span><input value={repository.defaultBranch} onChange={event => updateRepository(index, "defaultBranch", event.target.value)} placeholder="main" maxLength={100}/></label><button type="button" className="company-remove-repo" aria-label={`Remove ${repository.name || "repository"}`} onClick={() => setData(current => current ? { ...current, companies: current.companies.map(item => item.id === current.activeCompanyId ? { ...item, repositories: item.repositories.filter((_, row) => row !== index) } : item) } : current)}><Trash2 size={14}/></button></div>)}</div>}
      </div>

      <footer className="company-save-row"><span><ExternalLink size={13}/> URLs are stored as configuration; no sign-in or connection is performed.</span><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : <><Save size={14}/> Save company settings</>}</button></footer>
    </form>
  </section>;
}
