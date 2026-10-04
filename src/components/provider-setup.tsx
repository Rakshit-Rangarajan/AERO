"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, KeyRound, LoaderCircle, ShieldCheck, UploadCloud, WandSparkles } from "lucide-react";

type Provider = "local" | "openai-compatible" | "vertex-ai";
type SetupState = { provider: Provider; baseUrl: string; model: string; projectId: string; location: string; hasCredential: boolean; configured: boolean; setupComplete: boolean };
const initial: SetupState = { provider: "local", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", projectId: "", location: "us-central1", hasCredential: false, configured: true, setupComplete: false };

export function ProviderSetup() {
  const [config, setConfig] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Auto-detect GCP credentials for Vertex AI
    if (config.provider === "local" && !config.setupComplete) {
      fetch("/api/integrations/auto-detect").then(res => res.json()).then(data => {
        if (data.gcloud && data.gcpProject) {
          setConfig(prev => ({
            ...prev,
            provider: "vertex-ai",
            projectId: data.gcpProject,
            hasCredential: true
          }));
          setMessage("Auto-detected Google Cloud authentication. Vertex AI is ready.");
        }
      }).catch(() => {});
    }
  }, []);
  const [credentialFileName, setCredentialFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/setup", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(result => {
      if (active && result) setConfig({ ...initial, ...result });
    });
    return () => { active = false; };
  }, []);

  function payload() {
    return { provider: config.provider, baseUrl: config.baseUrl, apiKey, model: config.model, projectId: config.projectId, location: config.location };
  }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", config: payload() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save provider settings.");
      setConfig({ ...config, ...result.config }); setApiKey("");
      setMessage(config.provider === "local" ? "Local mode is ready. No provider credentials are used." : "Provider settings saved locally. Run a connection check before using agents.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save provider settings."); }
    finally { setBusy(false); }
  }

  async function testConnection() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test", config: payload() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The provider connection failed.");
      setMessage(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The provider connection failed."); }
    finally { setBusy(false); }
  }

  async function importEnv(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (!file.name.toLowerCase().endsWith(".env") && !file.name.toLowerCase().endsWith(".txt")) throw new Error("Choose a .env file.");
      if (file.size > 128_000) throw new Error("The .env file must be smaller than 128 KB.");
      const envText = await file.text();
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import", envText }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not import this .env file.");
      setConfig({ ...config, ...result.config }); setApiKey(""); setCredentialFileName(file.name);
      setMessage("Settings imported and saved. Test the provider connection before chatting.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not import this .env file."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const vertex = config.provider === "vertex-ai";
  const external = config.provider !== "local";

  return <section className="setup-page panel">
    <header className="setup-heading"><span className="setup-icon"><WandSparkles size={16}/></span><div><span className="setup-eyebrow">FIRST RUN · BYOK</span><h2>Set up AERO</h2><p>Choose how agents answer. Use local demo mode, your own compatible API key, or Google Vertex AI.</p></div><span className={`setup-state ${config.provider === "local" ? "local" : "ready"}`}><i/>{config.provider === "local" ? "LOCAL MODE" : `${vertex ? "VERTEX AI" : "BYOK"} SELECTED`}</span></header>

    {error && <div className="setup-alert error" role="alert"><AlertTriangle size={14}/>{error}</div>}
    {message && <div className="setup-alert success" role="status"><Check size={14}/>{message}</div>}

    <div className="setup-section"><div className="setup-section-title"><span>01</span><div><h3>Choose an AI provider</h3><p>Your agents keep their personas and response signatures across providers.</p></div></div>
      <div className="provider-choice-grid">
        <button type="button" className={`provider-choice ${config.provider === "local" ? "selected" : ""}`} onClick={() => { setConfig({ ...config, provider: "local", hasCredential: false }); setApiKey(""); }}><span className="provider-radio"/><strong>Local demo</strong><small>No external calls or API key. Agent responses remain in demo mode.</small></button>
        <button type="button" className={`provider-choice ${config.provider === "openai-compatible" ? "selected" : ""}`} onClick={() => { setConfig({ ...config, provider: "openai-compatible", hasCredential: false }); setApiKey(""); }}><span className="provider-radio"/><strong>OpenAI-compatible</strong><small>Bring your own key for OpenAI or a compatible endpoint.</small></button>
        <button type="button" className={`provider-choice ${vertex ? "selected" : ""}`} onClick={() => { setConfig({ ...config, provider: "vertex-ai", hasCredential: false }); setApiKey(""); }}><span className="provider-radio"/><strong>Google Vertex AI</strong><small>Use your Cloud project, location, model, and service account.</small></button>
      </div>
    </div>

    <div className="setup-section"><div className="setup-section-title"><span>02</span><div><h3>Connect your account</h3><p>Import settings or enter provider details. Credentials stay on this AERO instance.</p></div><a className="setup-download" href="/sample.env" download="sample.env"><Download size={13}/> Download sample.env</a></div>
      <div className="env-import"><span className="env-import-icon"><UploadCloud size={15}/></span><div><strong>Import a .env file</strong><small>{credentialFileName ? `Imported ${credentialFileName}` : "Your file is read by this app and is not sent to an AI provider."}</small></div><input ref={fileRef} type="file" accept=".env,text/plain" aria-label="Choose a .env file" onChange={event => void importEnv(event.target.files?.[0])}/><button type="button" disabled={busy} onClick={() => fileRef.current?.click()}><UploadCloud size={13}/> Import .env</button></div>
      {external && (vertex ? <div className="setup-fields">
        <label><span>GOOGLE CLOUD PROJECT ID</span><input value={config.projectId} onChange={event => setConfig({ ...config, projectId: event.target.value })} placeholder="brandbuilder-prod" autoComplete="off"/></label>
        <label><span>VERTEX AI LOCATION</span><input value={config.location} onChange={event => setConfig({ ...config, location: event.target.value })} placeholder="us-central1" autoComplete="off"/></label>
        <label className="setup-field-wide"><span>MODEL ID</span><input value={config.model} onChange={event => setConfig({ ...config, model: event.target.value })} placeholder="gemini-2.5-flash" autoComplete="off"/></label>
        <div className={`setup-credential ${config.hasCredential ? "saved" : "missing"}`}><KeyRound size={14}/><span><strong>{config.hasCredential ? "Service account credential saved" : "Service account credential required"}</strong><small>{config.hasCredential ? "Imported from the .env file. Secret JSON is hidden from this form." : "Set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 in your .env file. Download sample.env for the format."}</small></span></div>
      </div> : <div className="setup-fields">
        <label className="setup-field-wide"><span>API BASE URL</span><input value={config.baseUrl} onChange={event => setConfig({ ...config, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" autoComplete="url"/></label>
        <label><span>MODEL</span><input value={config.model} onChange={event => setConfig({ ...config, model: event.target.value })} placeholder="gpt-4o-mini" autoComplete="off"/></label>
        <label><span>API KEY</span><input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={config.hasCredential ? "Saved · enter a new key to replace" : "Paste your API key"} autoComplete="new-password"/></label>
        {config.hasCredential && <div className="setup-credential saved"><KeyRound size={14}/><span><strong>API key saved</strong><small>The key is never returned to the browser. Leave the field blank to keep it.</small></span></div>}
      </div>)}
      {!external && <div className="setup-local-note"><ShieldCheck size={15}/><span>Local demo mode sends no requests to an AI provider. You can switch providers whenever you are ready.</span></div>}
    </div>

    <div className="setup-section setup-finish"><div className="setup-section-title"><span>03</span><div><h3>Save and verify</h3><p>Test sends one short request using your selected model and may incur provider charges.</p></div></div><div className="setup-actions"><span><ShieldCheck size={13}/> Local-only config; stored in plain text under data/ai-provider.json.</span><div>{external && <button type="button" className="setup-test" disabled={busy || (vertex ? !config.hasCredential : !config.hasCredential && !apiKey.trim())} onClick={() => void testConnection()}>{busy ? <LoaderCircle size={13} className="setup-spin"/> : <Check size={13}/>} Test connection</button>}<button type="button" className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle size={13} className="setup-spin"/> : <Check size={13}/>} {config.provider === "local" ? "Use local mode" : "Save provider"}</button></div></div></div>
    <footer className="setup-footer"><span>AI usage and charges are billed by your provider.</span><span>Config file: <code>data/ai-provider.json</code></span></footer>
  </section>;
}
