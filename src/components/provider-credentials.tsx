"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Save, Trash2 } from "lucide-react";

type ProviderId = "google" | "microsoft";
type ProviderSummary = {
  id: ProviderId;
  label: string;
  configured: boolean;
  redirectUri: string;
  scope: string;
  hint: string;
  missing: string[];
};
type Notice = { tone: "error" | "success"; text: string } | null;

const BLANK: Record<ProviderId, { clientId: string; clientSecret: string }> = {
  google: { clientId: "", clientSecret: "" },
  microsoft: { clientId: "", clientSecret: "" },
};

export function ProviderCredentials() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    const result = await fetch("/api/auth/providers").then(response => response.json()).catch(() => null) as { providers: ProviderSummary[] } | null;
    setProviders(result?.providers ?? []);
  }, []);

  useEffect(() => {
    const start = () => { void load(); };
    start();
  }, [load]);

  async function save(provider: ProviderId) {
    setBusy(provider);
    setNotice(null);
    const response = await fetch("/api/auth/credentials", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, clientId: form[provider].clientId, clientSecret: form[provider].clientSecret }),
    });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    setBusy("");
    if (!response.ok) { setNotice({ tone: "error", text: result?.error ?? "Those credentials could not be saved." }); return; }
    setForm(current => ({ ...current, [provider]: { clientId: "", clientSecret: "" } }));
    await load();
    setNotice({ tone: "success", text: "Sign-in credentials saved to this workspace only." });
  }

  async function clear(provider: ProviderId) {
    setBusy(provider);
    setNotice(null);
    const response = await fetch(`/api/auth/credentials?provider=${provider}`, { method: "DELETE" });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    setBusy("");
    if (!response.ok) { setNotice({ tone: "error", text: result?.error ?? "Those credentials could not be cleared." }); return; }
    setForm(current => ({ ...current, [provider]: { clientId: "", clientSecret: "" } }));
    await load();
    setNotice({ tone: "success", text: "Credentials removed from this workspace." });
  }

  return (
    <section className="profile-card provider-credentials">
      <div className="profile-section-title"><KeyRound size={13}/> SIGN-IN PROVIDERS</div>
      <p className="profile-credentials-help">
        Credentials are stored in this workspace on this machine. They can also come from <code>AERO_GOOGLE_CLIENT_ID</code>,
        {" "}<code>AERO_GOOGLE_CLIENT_SECRET</code>, <code>AERO_MICROSOFT_CLIENT_ID</code> and <code>AERO_MICROSOFT_CLIENT_SECRET</code> in your environment.
      </p>

      {notice && (
        <div className={`profile-notice ${notice.tone}`} role="alert">
          {notice.tone === "success" ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
          {notice.text}
        </div>
      )}

      {providers.map(provider => (
        <div className="provider-credential-row" key={provider.id}>
          <div className="provider-credential-head">
            <strong>{provider.label}</strong>
            <span className="profile-provider-state" data-ready={provider.configured}>{provider.configured ? "READY" : "NOT CONFIGURED"}</span>
          </div>
          <p>{provider.hint}</p>
          <label>REDIRECT URI</label>
          <code>{provider.redirectUri}</code>
          <div className="provider-credential-fields">
            <input value={form[provider.id].clientId} onChange={event => setForm({ ...form, [provider.id]: { ...form[provider.id], clientId: event.target.value } })} placeholder="Client ID" aria-label={`${provider.label} client ID`}/>
            <input type="password" value={form[provider.id].clientSecret} onChange={event => setForm({ ...form, [provider.id]: { ...form[provider.id], clientSecret: event.target.value } })} placeholder="Client secret" aria-label={`${provider.label} client secret`}/>
          </div>
          <div className="provider-credential-actions">
            <button className="primary-button" disabled={busy === provider.id || !form[provider.id].clientId.trim() || !form[provider.id].clientSecret.trim()} onClick={() => void save(provider.id)}>
              <Save size={13}/> {busy === provider.id ? "Saving…" : `Save ${provider.label}`}
            </button>
            {provider.configured && (
              <button className="profile-button" disabled={busy === provider.id} onClick={() => void clear(provider.id)}>
                <Trash2 size={13}/> Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}