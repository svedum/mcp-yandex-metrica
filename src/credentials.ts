import { readFileSync } from "node:fs";

/**
 * OAuth token file written by the Svedum host before each MCP call (ADR 0173).
 * Only read — the platform signs in and refreshes; this process never writes.
 */
export const PLUGIN_OAUTH_CREDENTIALS_ENV = "PLUGIN_OAUTH_CREDENTIALS_PATH";

export interface StoredCredentials {
  access_token: string;
  /** Epoch ms (Svedum / plugin-oauth wire format). */
  expiry_date?: number;
  /** Alias accepted when reading legacy or hand-rolled files. */
  expires_at?: number;
  /** Epoch ms the token was obtained — shown in auth_status only. */
  obtained_at?: number;
}

interface CredentialsFile {
  access_token?: unknown;
  expiry_date?: unknown;
  expires_at?: unknown;
  obtained_at?: unknown;
}

/** Absolute path from PLUGIN_OAUTH_CREDENTIALS_PATH, when set. */
export function credentialsPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const path = env[PLUGIN_OAUTH_CREDENTIALS_ENV]?.trim();
  return path || undefined;
}

/** Reads the plugin OAuth file; undefined when unset, missing, or unreadable. */
export function readCredentials(env: NodeJS.ProcessEnv = process.env): StoredCredentials | undefined {
  const path = credentialsPath(env);
  if (!path) return undefined;

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as CredentialsFile;
    const access_token =
      typeof parsed?.access_token === "string" ? parsed.access_token.trim() : "";
    if (!access_token) return undefined;

    const expiry =
      typeof parsed.expiry_date === "number"
        ? parsed.expiry_date
        : typeof parsed.expires_at === "number"
          ? parsed.expires_at
          : undefined;
    const obtained_at = typeof parsed.obtained_at === "number" ? parsed.obtained_at : undefined;

    return {
      access_token,
      ...(expiry !== undefined ? { expiry_date: expiry, expires_at: expiry } : {}),
      ...(obtained_at !== undefined ? { obtained_at } : {}),
    };
  } catch {
    return undefined;
  }
}