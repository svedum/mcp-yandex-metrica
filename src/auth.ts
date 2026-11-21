import { credentialsPath, readCredentials, type StoredCredentials } from "./credentials.js";

/**
 * Raised when a tool needs a token and none is available. The message is what
 * the calling model reads — it names the fix instead of the failure.
 */
export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export type TokenSource = "env" | "plugin_oauth";

export interface AuthStatus {
  configured: boolean;
  source?: TokenSource;
  /** ISO date the stored access token expires; absent for env tokens. */
  expiresAt?: string;
  /** ISO date the stored token was obtained. */
  obtainedAt?: string;
  /** PLUGIN_OAUTH_CREDENTIALS_PATH when the host uses plugin OAuth. */
  path?: string;
}

export const NOT_CONNECTED_MESSAGE =
  "Яндекс Метрика не подключена: нет токена доступа. " +
  "Это не сбой сети — повторный вызов не поможет. " +
  "В Сведуме: Персонализация → Подключения. " +
  "Во внешнем MCP-клиенте задайте YANDEX_METRIKA_TOKEN.";

export const RECONNECT_MESSAGE =
  "Токен Яндекс Метрики недействителен или отклонён API. " +
  "В Сведуме переподключите плагин в Персонализация → Подключения; " +
  "во внешнем клиенте обновите YANDEX_METRIKA_TOKEN.";

export const EXPIRED_MESSAGE =
  "Срок действия подключения Яндекс Метрики истёк. " +
  "В Сведуме: Персонализация → Подключения. " +
  "Во внешнем клиенте обновите YANDEX_METRIKA_TOKEN.";

/**
 * Resolves the access token for every request. Two sources, in order:
 *
 *   env          — YANDEX_METRIKA_TOKEN (external MCP clients, CI)
 *   plugin_oauth — file at PLUGIN_OAUTH_CREDENTIALS_PATH (Svedum host)
 *
 * The credentials file is re-read on every call so a host refresh takes effect
 * mid-session without restarting the client.
 */
export class TokenStore {
  constructor(private readonly envToken?: string) {}

  hasToken(): boolean {
    return Boolean(this.envToken?.trim()) || Boolean(readCredentials());
  }

  async getToken(): Promise<string> {
    const fromEnv = this.envToken?.trim();
    if (fromEnv) return fromEnv;

    const stored = readCredentials();
    if (!stored) throw new AuthRequiredError(NOT_CONNECTED_MESSAGE);

    if (isExpired(stored)) throw new AuthRequiredError(EXPIRED_MESSAGE);

    return stored.access_token;
  }

  status(): AuthStatus {
    const path = credentialsPath();
    if (this.envToken?.trim()) {
      return { configured: true, source: "env", path };
    }
    const stored = readCredentials();
    if (!stored) return { configured: false, path };
    const expiry = stored.expiry_date ?? stored.expires_at;
    return {
      configured: true,
      source: "plugin_oauth",
      expiresAt: expiry ? new Date(expiry).toISOString() : undefined,
      obtainedAt: stored.obtained_at ? new Date(stored.obtained_at).toISOString() : undefined,
      path,
    };
  }
}

function isExpired(stored: StoredCredentials, now = Date.now()): boolean {
  const expiry = stored.expiry_date ?? stored.expires_at;
  if (expiry === undefined) return false;
  return expiry <= now;
}