"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

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
type Profile = {
  id: string;
  provider: ProviderId;
  email: string;
  name: string;
  pictureUrl: string;
  title: string;
  bio: string;
  timezone: string;
  phone: string;
  createdAt: string;
};
type Notice = { tone: "error" | "success"; text: string } | null;

const AUTH_MESSAGES: Record<string, string> = {
  ok: "Signed in. Your profile was fetched from the provider.",
  "missing-google": "Google sign-in needs a client ID and secret in Settings first.",
  "missing-microsoft": "Outlook sign-in needs a client ID and secret in Settings first.",
  "denied-google": "Google sign-in was cancelled.",
  "denied-microsoft": "Outlook sign-in was cancelled.",
  "expired-google": "The Google sign-in attempt expired. Try again.",
  "expired-microsoft": "The Outlook sign-in attempt expired. Try again.",
  "failed-google": "Google sign-in failed. Check the credentials in Settings.",
  "failed-microsoft": "Outlook sign-in failed. Check the credentials in Settings.",
  "unknown-provider": "That sign-in provider is not supported.",
};

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "?";
const field = (value: string, limit: number) => value.trim().slice(0, limit);

export function ProfilePanel() {
  const [user, setUser] = useState<Profile | null>(null);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({ name: "", title: "", bio: "", timezone: "", phone: "" });

  const load = useCallback(async () => {
    const [session, providerList] = await Promise.all([
      fetch("/api/auth/session").then(response => response.json()).catch(() => null) as Promise<{ user: Profile | null } | null>,
      fetch("/api/auth/providers").then(response => response.json()).catch(() => null) as Promise<{ providers: ProviderSummary[] } | null>,
    ]);
    setUser(session?.user ?? null);
    setProviders(providerList?.providers ?? []);
    setForm(details => (session?.user ? {
      name: session.user.name,
      title: session.user.title,
      bio: session.user.bio,
      timezone: session.user.timezone,
      phone: session.user.phone,
    } : details));
    setLoading(false);
  }, []);

  useEffect(() => {
    const start = () => { void load(); };
    start();
  }, [load]);

  useEffect(() => {
    const readResult = () => {
      const result = new URLSearchParams(window.location.search).get("auth");
      if (!result) return;
      const text = AUTH_MESSAGES[result];
      if (text) setNotice({ tone: result === "ok" ? "success" : "error", text });
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url);
    };
    readResult();
  }, []);

  async function saveDetails() {
    setBusy("save");
    setNotice(null);
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: field(form.name, 120),
        title: field(form.title, 120),
        bio: field(form.bio, 600),
        timezone: field(form.timezone, 60),
        phone: field(form.phone, 40),
      }),
    });
    const result = await response.json().catch(() => null) as { user?: Profile; error?: string } | null;
    setBusy("");
    if (!response.ok || !result?.user) { setNotice({ tone: "error", text: result?.error ?? "Your details could not be saved." }); return; }
    setUser(result.user);
    setNotice({ tone: "success", text: "Profile details saved to this workspace." });
  }

  async function refreshFromProvider() {
    setBusy("refresh");
    setNotice(null);
    const response = await fetch("/api/auth/profile/refresh", { method: "POST" });
    const result = await response.json().catch(() => null) as { user?: Profile; error?: string } | null;
    setBusy("");
    if (!response.ok || !result?.user) { setNotice({ tone: "error", text: result?.error ?? "The provider could not be reached." }); return; }
    setUser(result.user);
    setForm(details => ({ ...details, name: result.user!.name }));
    setNotice({ tone: "success", text: "Details fetched from your provider." });
  }

  async function signOut() {
    setBusy("signout");
    const response = await fetch("/api/auth/signout", { method: "POST" });
    setBusy("");
    if (!response.ok) { setNotice({ tone: "error", text: "Sign-out failed." }); return; }
    setUser(null);
    setNotice({ tone: "success", text: "Signed out. AERO keeps working without an account." });
  }

  return (
    <div className="profile-page">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><UserRound size={15}/></span>
          <div><h2>Your profile</h2><p>Sign in with Google or Outlook, then keep your engineering details in this workspace.</p></div>
        </div>
        <span className="status-chip"><span/> {user ? "SIGNED IN" : "LOCAL ONLY"}</span>
      </div>

      {notice && (
        <div className={`profile-notice ${notice.tone}`} role="alert">
          {notice.tone === "success" ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="activity-empty"><span className="activity-pulse"><UserRound size={15}/></span><div><strong>Checking your session</strong><p>Looking for an existing sign-in on this machine.</p></div></div>
      ) : user ? (
        <div className="profile-signed-in">
          <section className="profile-card">
            <div className="profile-identity">
              {user.pictureUrl
                ? <img className="profile-avatar-img" src={user.pictureUrl} alt="" referrerPolicy="no-referrer"/>
                : <span className="profile-avatar">{initials(user.name)}</span>}
              <div className="profile-identity-copy">
                <strong>{user.name || user.email}</strong>
                <small>{user.email || "No email returned"}</small>
                <span className="profile-provider-badge">{user.provider === "google" ? "Google" : "Outlook"}</span>
              </div>
            </div>
            <div className="profile-card-actions">
              <button className="profile-button" disabled={busy === "refresh"} onClick={() => void refreshFromProvider()}>
                <RefreshCw size={13} className={busy === "refresh" ? "spin" : ""}/> {busy === "refresh" ? "Fetching…" : "Fetch from provider"}
              </button>
              <button className="profile-button" disabled={busy === "signout"} onClick={() => void signOut()}>
                <LogOut size={13}/> {busy === "signout" ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-section-title"><ShieldCheck size={13}/> DETAILS STORED IN THIS WORKSPACE</div>
            <div className="profile-form">
              <div className="profile-field profile-field-wide">
                <label htmlFor="profile-name">DISPLAY NAME</label>
                <input id="profile-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ada Nwosu"/>
              </div>
              <div className="profile-field">
                <label htmlFor="profile-title">ROLE</label>
                <input id="profile-title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Principal Engineer"/>
              </div>
              <div className="profile-field">
                <label htmlFor="profile-timezone">TIMEZONE</label>
                <input id="profile-timezone" value={form.timezone} onChange={event => setForm({ ...form, timezone: event.target.value })} placeholder="Europe/Lisbon"/>
              </div>
              <div className="profile-field profile-field-wide">
                <label htmlFor="profile-phone">PHONE</label>
                <input id="profile-phone" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="+351 ..."/>
              </div>
              <div className="profile-field profile-field-wide">
                <label htmlFor="profile-bio">ABOUT</label>
                <textarea id="profile-bio" rows={3} value={form.bio} onChange={event => setForm({ ...form, bio: event.target.value })} placeholder="What you work on in AERO."/>
              </div>
            </div>
            <div className="profile-save-row">
              <span>Signing in is optional. Everything else in AERO works without an account.</span>
              <button className="primary-button" disabled={busy === "save"} onClick={() => void saveDetails()}>
                <Save size={13}/> {busy === "save" ? "Saving…" : "Save details"}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="profile-signed-out">
          <div className="profile-intro">
            <strong>AERO works without an account.</strong>
            <p>Sign in only if you want your name and details attached to what you do here. Providers need a client ID and secret first, which you can paste into Settings.</p>
          </div>
          <div className="profile-provider-grid">
            {providers.map(provider => (
              <section className="profile-provider" key={provider.id}>
                <div className="profile-provider-head">
                  <strong>{provider.label}</strong>
                  <span className="profile-provider-state" data-ready={provider.configured}>{provider.configured ? "READY" : "NOT CONFIGURED"}</span>
                </div>
                <p>{provider.hint}</p>
                <label>REDIRECT URI TO REGISTER</label>
                <code>{provider.redirectUri}</code>
                {provider.configured ? (
                  <a className="profile-signin" href={`/api/auth/providers/${provider.id}?returnTo=/%23Profile`}>
                    Sign in with {provider.label}
                  </a>
                ) : (
                  <button className="profile-signin disabled" disabled>
                    Add credentials in Settings
                  </button>
                )}
                {!provider.configured && <small>Missing: {provider.missing.join(", ")}</small>}
              </section>
            ))}
          </div>
          <button className="profile-settings-link" onClick={() => { window.location.hash = "Settings"; }}>
            Open settings <ExternalLink size={12}/>
          </button>
        </div>
      )}
    </div>
  );
}