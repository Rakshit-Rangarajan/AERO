import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "aero_session";
const SESSION_TTL_DAYS = 30;
const PKCE_TTL_MINUTES = 10;

export type AuthProviderId = "google" | "microsoft";

export type ProviderConfig = {
  id: AuthProviderId;
  label: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  hint: string;
};

export type ProviderSummary = {
  id: AuthProviderId;
  label: string;
  configured: boolean;
  redirectUri: string;
  scope: string;
  hint: string;
  missing: string[];
};

export type AuthUser = {
  id: string;
  provider: AuthProviderId;
  email: string;
  name: string;
  pictureUrl: string;
  title: string;
  bio: string;
  timezone: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

const PROVIDER_META: Record<AuthProviderId, Omit<ProviderConfig, "clientId" | "clientSecret">> = {
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    hint: "Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Desktop app.",
  },
  microsoft: {
    id: "microsoft",
    label: "Outlook",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scope: "openid profile email User.Read",
    hint: "Microsoft Entra admin center → App registrations → Personal Microsoft accounts.",
  },
};

function setting(key: string) {
  const row = getDb().prepare("SELECT value FROM workspace_settings WHERE key=?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

function saveSetting(key: string, value: string) {
  getDb().prepare(`INSERT INTO workspace_settings(key,value,updated_at) VALUES(?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
    .run(key, value, new Date().toISOString());
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

export function providerRedirectPath(provider: AuthProviderId) {
  return `/api/auth/callback/${provider}`;
}

export function requestOrigin(requestOriginHeader?: string | null) {
  const configured = envValue("AERO_AUTH_ORIGIN");
  if (configured) return configured.replace(/\/$/, "");
  if (requestOriginHeader) return requestOriginHeader;
  return "http://127.0.0.1:3000";
}

export function providerConfig(provider: AuthProviderId, _origin?: string | null): ProviderConfig {
  const meta = PROVIDER_META[provider];
  const config: ProviderConfig = {
    ...meta,
    id: provider,
    clientId: setting(`auth_${provider}_client_id`) || envValue(`AERO_${provider.toUpperCase()}_CLIENT_ID`),
    clientSecret: setting(`auth_${provider}_client_secret`) || envValue(`AERO_${provider.toUpperCase()}_CLIENT_SECRET`),
    scope: meta.scope,
  };
  return config;
}

export function redirectUriFor(provider: AuthProviderId, origin: string) {
  return `${origin.replace(/\/$/, "")}${providerRedirectPath(provider)}`;
}

export function providerSummary(provider: AuthProviderId, origin: string): ProviderSummary {
  const config = providerConfig(provider);
  const missing: string[] = [];
  if (!config.clientId) missing.push("Client ID");
  if (!config.clientSecret) missing.push("Client secret");
  return {
    id: provider,
    label: config.label,
    configured: missing.length === 0,
    redirectUri: redirectUriFor(provider, origin),
    scope: config.scope,
    hint: config.hint,
    missing,
  };
}

export function isProvider(provider: string): provider is AuthProviderId {
  return provider === "google" || provider === "microsoft";
}

export function saveProviderCredentials(provider: AuthProviderId, clientId: string, clientSecret: string) {
  const now = new Date().toISOString();
  saveSetting(`auth_${provider}_client_id`, clientId.trim());
  saveSetting(`auth_${provider}_client_secret`, clientSecret.trim());
  saveSetting(`auth_${provider}_updated_at`, now);
}

export function clearProviderCredentials(provider: AuthProviderId) {
  saveSetting(`auth_${provider}_client_id`, "");
  saveSetting(`auth_${provider}_client_secret`, "");
}

export function base64Url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32) {
  return base64Url(randomBytes(bytes));
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPkcePair() {
  const verifier = randomToken(48);
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function storeOAuthPending(provider: AuthProviderId, state: string, codeVerifier: string, returnTo: string) {
  const db = getDb();
  db.prepare("DELETE FROM oauth_pending WHERE created_at < ?").run(new Date(Date.now() - PKCE_TTL_MINUTES * 60_000).toISOString());
  db.prepare("INSERT INTO oauth_pending(state,provider,code_verifier,return_to,created_at) VALUES(?,?,?,?,?)")
    .run(state, provider, codeVerifier, returnTo.slice(0, 200), new Date().toISOString());
}

export function consumeOAuthPending(state: string) {
  const db = getDb();
  const row = db.prepare("SELECT provider,code_verifier,return_to FROM oauth_pending WHERE state=?").get(state) as
    { provider: string; code_verifier: string; return_to: string } | undefined;
  if (!row) return null;
  db.prepare("DELETE FROM oauth_pending WHERE state=?").run(state);
  if (!isProvider(row.provider)) return null;
  return { provider: row.provider, codeVerifier: row.code_verifier, returnTo: row.return_to };
}

export function hashSessionToken(token: string) {
  const salt = randomToken(16);
  const derived = scryptSync(token, salt, 32);
  return `${salt}.${derived.toString("hex")}`;
}

export function verifySessionToken(token: string, stored: string) {
  const [salt, digest] = stored.split(".");
  if (!salt || !digest) return false;
  const expected = scryptSync(token, salt, 32);
  const actual = Buffer.from(digest, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createAuthSession(userId: string) {
  const db = getDb();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  db.prepare("DELETE FROM auth_sessions WHERE expires_at < ?").run(new Date().toISOString());
  db.prepare("INSERT INTO auth_sessions(id,user_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?)")
    .run(crypto.randomUUID(), userId, hashSessionToken(token), new Date().toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function destroyAuthSession(token: string) {
  const db = getDb();
  const row = db.prepare("SELECT token_hash FROM auth_sessions WHERE token_hash IS NOT NULL").all() as Array<{ token_hash: string }>;
  for (const entry of row) {
    if (verifySessionToken(token, entry.token_hash)) {
      db.prepare("DELETE FROM auth_sessions WHERE token_hash=?").run(entry.token_hash);
      return;
    }
  }
}

export function readAuthSession(token?: string | null): { user: AuthUser; expiresAt: string } | null {
  if (!token) return null;
  const db = getDb();
  const rows = db.prepare("SELECT token_hash,expires_at FROM auth_sessions").all() as Array<{ token_hash: string; expires_at: string }>;
  for (const entry of rows) {
    if (!verifySessionToken(token, entry.token_hash)) continue;
    if (new Date(entry.expires_at).getTime() <= Date.now()) {
      db.prepare("DELETE FROM auth_sessions WHERE token_hash=?").run(entry.token_hash);
      return null;
    }
    const user = findUserById(
      (db.prepare("SELECT user_id AS userId FROM auth_sessions WHERE token_hash=?").get(entry.token_hash) as { userId: string }).userId,
    );
    return user ? { user, expiresAt: entry.expires_at } : null;
  }
  return null;
}

export function findUserById(id: string): AuthUser | null {
  const row = getDb().prepare(`SELECT u.id,u.provider,u.email,u.name,u.picture_url AS pictureUrl,u.created_at AS createdAt,u.updated_at AS updatedAt,
      COALESCE(p.title,'') AS title, COALESCE(p.bio,'') AS bio, COALESCE(p.timezone,'') AS timezone, COALESCE(p.phone,'') AS phone
    FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id=?`).get(id) as (AuthUser & { provider: string }) | undefined;
  if (!row || !isProvider(row.provider)) return null;
  return { ...row, provider: row.provider };
}

export function upsertOAuthUser(provider: AuthProviderId, profile: { id: string; email: string; name: string; pictureUrl: string }, accessToken = "") {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE provider=? AND provider_account_id=?").get(provider, profile.id) as { id: string } | undefined;
  const now = new Date().toISOString();
  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    db.prepare("UPDATE users SET email=?,name=?,picture_url=?,access_token=?,token_expires_at=?,updated_at=? WHERE id=?")
      .run(profile.email, profile.name, profile.pictureUrl, accessToken, "", now, id);
  } else {
    db.prepare("INSERT INTO users(id,provider,provider_account_id,email,name,picture_url,access_token,token_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'',?,?)")
      .run(id, provider, profile.id, profile.email, profile.name, profile.pictureUrl, accessToken, now, now);
    db.prepare("INSERT OR IGNORE INTO user_profiles(user_id,updated_at) VALUES(?,?)").run(id, now);
  }
  return id;
}

/** Re-read the signed-in account from its provider, so a refresh never needs a new sign-in. */
export async function refreshProviderProfile(userId: string) {
  const row = getDb().prepare("SELECT provider,access_token FROM users WHERE id=?").get(userId) as { provider: string; access_token: string } | undefined;
  if (!row || !isProvider(row.provider)) throw new Error("This account is not linked to a supported provider.");
  if (!row.access_token) throw new Error("Sign in again to refresh from the provider.");
  const profile = await fetchProviderProfile(row.provider, row.access_token);
  if (profile.id) {
    getDb().prepare("UPDATE users SET email=?,name=?,picture_url=?,updated_at=? WHERE id=?")
      .run(profile.email, profile.name, profile.pictureUrl, new Date().toISOString(), userId);
  }
  return findUserById(userId);
}

export function updateUserProfile(userId: string, patch: { title?: string; bio?: string; timezone?: string; phone?: string; name?: string }) {
  const db = getDb();
  const now = new Date().toISOString();
  if (typeof patch.name === "string" && patch.name.trim()) {
    db.prepare("UPDATE users SET name=?,updated_at=? WHERE id=?").run(patch.name.trim().slice(0, 120), now, userId);
  }
  db.prepare("INSERT OR IGNORE INTO user_profiles(user_id,updated_at) VALUES(?,?)").run(userId, now);
  db.prepare(`UPDATE user_profiles SET title=COALESCE(?,title), bio=COALESCE(?,bio), timezone=COALESCE(?,timezone), phone=COALESCE(?,phone), updated_at=?
    WHERE user_id=?`)
    .run(patch.title ?? null, patch.bio ?? null, patch.timezone ?? null, patch.phone ?? null, now, userId);
  return findUserById(userId);
}

export async function exchangeCodeForToken(provider: AuthProviderId, code: string, codeVerifier: string, origin: string) {
  const config = providerConfig(provider, origin);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUriFor(provider, origin),
    }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; error_description?: string; error?: string } | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? payload?.error ?? `The ${config.label} token exchange was rejected.`);
  }
  return payload.access_token;
}

export async function fetchProviderProfile(provider: AuthProviderId, accessToken: string) {
  const config = providerConfig(provider);
  const response = await fetch(config.userInfoUrl, { headers: { authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw new Error(`The ${config.label} profile could not be read.`);
  if (provider === "google") {
    return {
      id: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? payload.given_name ?? ""),
      pictureUrl: String(payload.picture ?? ""),
    };
  }
  const mail = String(payload.mail ?? payload.userPrincipalName ?? payload.email ?? "");
  return {
    id: String(payload.id ?? ""),
    email: mail,
    name: String(payload.displayName ?? payload.givenName ?? mail.split("@")[0] ?? ""),
    pictureUrl: "",
  };
}

export function buildAuthorizeUrl(provider: AuthProviderId, params: { state: string; challenge: string; origin: string; loginHint?: string }) {
  const config = providerConfig(provider, params.origin);
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUriFor(provider, params.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.loginHint) url.searchParams.set("login_hint", params.loginHint);
  return url.toString();
}