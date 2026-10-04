"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type Company = { id: string; name: string };
type CompanyState = { activeCompanyId: string | null; companies: Company[] };

export function CompanySwitcher() {
  const [data, setData] = useState<CompanyState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/companies").then(response => response.ok ? response.json() : null).then(result => { if (result) setData(result); });
  }, []);

  async function selectCompany(companyId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/companies", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "select", companyId }) });
      const result = await response.json();
      if (response.ok) { setData(result); window.dispatchEvent(new Event("aero:company-change")); }
    } finally { setBusy(false); }
  }

  const active = data?.companies.find(company => company.id === data.activeCompanyId);
  const initials = active?.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "CO";

  return <label className="workspace-switch company-switch"><span className="workspace-avatar">{initials}</span><span className="workspace-copy"><span className="company-select-wrap"><select aria-label="Choose company" value={data?.activeCompanyId ?? ""} disabled={busy || !data?.companies.length} onChange={event => void selectCompany(event.target.value)}>{data?.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select><ChevronDown size={12}/></span><small>Active company</small></span><ChevronDown className="company-switch-chevron" size={14}/></label>;
}
