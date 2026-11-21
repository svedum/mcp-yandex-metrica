import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TokenStore } from "../auth.js";
import { PLUGIN_OAUTH_CREDENTIALS_ENV } from "../credentials.js";
import { registerAuthTools } from "./auth.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

function harness(opts: { envToken?: string } = {}) {
  const tokens = new TokenStore(opts.envToken);
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerAuthTools(server as never, tokens);
  return { tools, tokens };
}

async function isolated<T>(fn: () => Promise<T>): Promise<T> {
  const saved = process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
  process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = mkdtempSync(join(tmpdir(), "mcp-metrica-tools-"));
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env[PLUGIN_OAUTH_CREDENTIALS_ENV];
    else process.env[PLUGIN_OAUTH_CREDENTIALS_ENV] = saved;
  }
}

function payload(res: { content: { text: string }[] }): Record<string, unknown> {
  return JSON.parse(res.content[0].text) as Record<string, unknown>;
}

test("registers only auth_status", async () => {
  await isolated(async () => {
    const { tools } = harness();
    assert.deepEqual(Object.keys(tools), ["auth_status"]);
  });
});

test("auth_status reports not connected without the network", async () => {
  await isolated(async () => {
    const { tools } = harness();
    const status = payload(await tools.auth_status({}));
    assert.equal(status.configured, false);
  });
});