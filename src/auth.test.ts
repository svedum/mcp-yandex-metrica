import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AuthRequiredError, TokenStore } from "./auth.js";
import { PLUGIN_OAUTH_CREDENTIALS_ENV, readCredentials } from "./credentials.js";

async function withCredentialsFile<T>(
  body: Record<string, unknown>,
  run: (path: string) => T | Promise<T>,
): Promise<T> {
  const savedPath = process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  const dir = mkdtempSync(join(tmpdir(), "mcp-metrica-test-"));
  const file = join(dir, "credentials.json");
  writeFileSync(file, `${JSON.stringify(body)}\n`, "utf8");
  process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = file;
  try {
    return await run(file);
  } finally {
    if (savedPath === undefined) delete process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
    else process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = savedPath;
  }
}

test("with nothing configured, getToken explains how to connect", async () => {
  const saved = process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  delete process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  try {
    const store = new TokenStore(undefined);
    assert.equal(store.hasToken(), false);
    await assert.rejects(() => store.getToken(), AuthRequiredError);
    await assert.rejects(() => store.getToken(), /Персонализация/);
  } finally {
    if (saved !== undefined) process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = saved;
  }
});

test("an env token wins over the credentials file", async () => {
  await withCredentialsFile({ access_token: "stored" }, async () => {
    const store = new TokenStore("from-env");
    assert.equal(await store.getToken(), "from-env");
    assert.equal(store.status().source, "env");
  });
});

test("a plugin OAuth file is used when no env token is set", async () => {
  await withCredentialsFile({ access_token: "stored", expiry_date: Date.now() + 60_000 }, async () => {
    const store = new TokenStore(undefined);
    assert.equal(await store.getToken(), "stored");
    assert.equal(store.status().source, "plugin_oauth");
    assert.equal(readCredentials()?.access_token, "stored");
  });
});

test("expiry_date in the past rejects the token", async () => {
  await withCredentialsFile({ access_token: "old", expiry_date: Date.now() - 1000 }, async () => {
    await assert.rejects(() => new TokenStore(undefined).getToken(), /истёк/);
  });
});

test("status never carries the token itself", async () => {
  await withCredentialsFile({ access_token: "super-secret", obtained_at: Date.now() }, async (path) => {
    const status = JSON.stringify(new TokenStore(undefined).status());
    assert.ok(!status.includes("super-secret"), "auth_status output must be safe to print");
    assert.ok(status.includes(path), "but it must name the credentials path");
  });
});