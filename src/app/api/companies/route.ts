import { NextResponse } from "next/server";
import { getDb, recordAudit } from "@/lib/db";

export const runtime = "nodejs";

type CompanyRow = {
  id: string; name: string; description: string; jiraUrl: string; jiraProjects: string;
  confluenceUrl: string; confluenceSpaces: string; azureDevOpsUrl: string; azureProject: string;
  documentationUrl: string; ciUrl: string; defaultBranch: string; createdAt: string; updatedAt: string;
};
type RepositoryInput = { name?: unknown; remoteUrl?: unknown; provider?: unknown; defaultBranch?: unknown };

function getCompanyState() {
  const db = getDb();
  const companies = db.prepare(`SELECT id,name,description,jira_url AS jiraUrl,jira_projects AS jiraProjects,
    confluence_url AS confluenceUrl,confluence_spaces AS confluenceSpaces,
    azure_devops_url AS azureDevOpsUrl,azure_project AS azureProject,
    documentation_url AS documentationUrl,ci_url AS ciUrl,default_branch AS defaultBranch,
    created_at AS createdAt,updated_at AS updatedAt FROM companies ORDER BY name COLLATE NOCASE`).all() as unknown as CompanyRow[];
  const repositories = db.prepare(`SELECT id,company_id AS companyId,name,remote_url AS remoteUrl,provider,
    default_branch AS defaultBranch,created_at AS createdAt FROM company_repositories ORDER BY name COLLATE NOCASE`).all() as Array<{ id: string; companyId: string; name: string; remoteUrl: string; provider: string; defaultBranch: string; createdAt: string }>;
  const active = db.prepare("SELECT value FROM workspace_settings WHERE key='active_company_id'").get() as { value: string } | undefined;
  return {
    activeCompanyId: active?.value ?? companies[0]?.id ?? null,
    companies: companies.map(company => ({ ...company, repositories: repositories.filter(repository => repository.companyId === company.id) })),
  };
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validWebUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

function validRepositoryRemote(value: string) {
  if (/^git@[A-Za-z0-9.-]+:[A-Za-z0-9_./-]+(?:\.git)?$/.test(value)) return true;
  try {
    const url = new URL(value);
    return Boolean(url.hostname) && !url.password && (url.protocol === "https:" ? !url.username : url.protocol === "ssh:" && Boolean(url.username));
  } catch { return false; }
}

export async function GET() {
  return NextResponse.json(getCompanyState());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; description?: unknown } | null;
  const name = cleanText(body?.name, 100);
  if (!name) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    db.prepare("INSERT INTO companies(id,name,description,default_branch,created_at,updated_at) VALUES(?,?,?,?,?,?)")
      .run(id, name, cleanText(body?.description, 500), "main", now, now);
    db.prepare(`INSERT INTO workspace_settings(key,value,updated_at) VALUES('active_company_id',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(id, now);
  } catch {
    return NextResponse.json({ error: "A company with that name already exists." }, { status: 409 });
  }
  recordAudit(null, "company.created", JSON.stringify({ companyId: id, name }));
  return NextResponse.json(getCompanyState(), { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const companyId = cleanText(body?.companyId, 80);
  if (!companyId) return NextResponse.json({ error: "Choose a company." }, { status: 400 });
  const db = getDb();
  const company = db.prepare("SELECT id FROM companies WHERE id=?").get(companyId);
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
  const now = new Date().toISOString();

  if (body?.action === "select") {
    db.prepare(`INSERT INTO workspace_settings(key,value,updated_at) VALUES('active_company_id',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(companyId, now);
    recordAudit(null, "company.selected", JSON.stringify({ companyId }));
    return NextResponse.json(getCompanyState());
  }

  const name = cleanText(body?.name, 100);
  const description = cleanText(body?.description, 500);
  const jiraUrl = cleanText(body?.jiraUrl, 500);
  const jiraProjects = cleanText(body?.jiraProjects, 500);
  const confluenceUrl = cleanText(body?.confluenceUrl, 500);
  const confluenceSpaces = cleanText(body?.confluenceSpaces, 500);
  const azureDevOpsUrl = cleanText(body?.azureDevOpsUrl, 500);
  const azureProject = cleanText(body?.azureProject, 150);
  const documentationUrl = cleanText(body?.documentationUrl, 500);
  const ciUrl = cleanText(body?.ciUrl, 500);
  const defaultBranch = cleanText(body?.defaultBranch, 100) || "main";
  const repositories = body?.repositories;
  if (!name) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  if (![jiraUrl, confluenceUrl, azureDevOpsUrl, documentationUrl, ciUrl].every(validWebUrl)) {
    return NextResponse.json({ error: "Company links must be valid HTTP or HTTPS URLs without embedded credentials." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9._/-]{1,100}$/.test(defaultBranch) || defaultBranch.startsWith("-") || defaultBranch.includes("..")) {
    return NextResponse.json({ error: "Enter a valid default branch name." }, { status: 400 });
  }
  if (!Array.isArray(repositories) || repositories.length > 30) {
    return NextResponse.json({ error: "Add up to 30 repositories." }, { status: 400 });
  }
  const cleanedRepositories = repositories.map((repository: RepositoryInput) => ({
    name: cleanText(repository.name, 100), remoteUrl: cleanText(repository.remoteUrl, 500),
    provider: cleanText(repository.provider, 40) || "Other",
    defaultBranch: cleanText(repository.defaultBranch, 100) || defaultBranch,
  }));
  if (cleanedRepositories.some(repository => !repository.name || !repository.remoteUrl || !validRepositoryRemote(repository.remoteUrl) || !/^[A-Za-z0-9._/-]{1,100}$/.test(repository.defaultBranch) || repository.defaultBranch.includes(".."))) {
    return NextResponse.json({ error: "Each repository needs a name, a valid HTTPS/SSH/SSH-alias remote, and a valid branch." }, { status: 400 });
  }
  if (new Set(cleanedRepositories.map(repository => repository.name.toLowerCase())).size !== cleanedRepositories.length) {
    return NextResponse.json({ error: "Repository names must be unique within a company." }, { status: 400 });
  }

  try {
    db.exec("BEGIN IMMEDIATE");
    db.prepare(`UPDATE companies SET name=?,description=?,jira_url=?,jira_projects=?,confluence_url=?,confluence_spaces=?,
      azure_devops_url=?,azure_project=?,documentation_url=?,ci_url=?,default_branch=?,updated_at=? WHERE id=?`)
      .run(name, description, jiraUrl, jiraProjects, confluenceUrl, confluenceSpaces, azureDevOpsUrl, azureProject, documentationUrl, ciUrl, defaultBranch, now, companyId);
    db.prepare("DELETE FROM company_repositories WHERE company_id=?").run(companyId);
    const insertRepository = db.prepare(`INSERT INTO company_repositories(id,company_id,name,remote_url,provider,default_branch,created_at)
      VALUES(?,?,?,?,?,?,?)`);
    for (const repository of cleanedRepositories) insertRepository.run(crypto.randomUUID(), companyId, repository.name, repository.remoteUrl, repository.provider, repository.defaultBranch, now);
    db.exec("COMMIT");
  } catch {
    db.exec("ROLLBACK");
    return NextResponse.json({ error: "Company name or repository settings conflict with an existing record." }, { status: 409 });
  }
  recordAudit(null, "company.updated", JSON.stringify({ companyId, repositories: cleanedRepositories.length }));
  return NextResponse.json(getCompanyState());
}
