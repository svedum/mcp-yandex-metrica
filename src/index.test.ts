import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function connectToServer(overrides: Record<string, string | undefined> = {}): Promise<Client> {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;

  const merged: Record<string, string> = {
    ...env,
    YANDEX_METRIKA_TOKEN: "test-token",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", fileURLToPath(new URL("./index.ts", import.meta.url))],
    cwd: repoRoot,
    stderr: "ignore",
    env: merged,
  });
  const client = new Client({ name: "instructions-smoke", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

async function connectUnconfigured(): Promise<Client> {
  const dir = mkdtempSync(join(tmpdir(), "mcp-metrica-unconfigured-"));
  const creds = join(dir, "empty.json");
  return connectToServer({
    YANDEX_METRIKA_TOKEN: undefined,
    PLUGIN_OAUTH_CREDENTIALS_PATH: creds,
  });
}

test("initialize carries non-empty server instructions", async () => {
  const client = await connectToServer();
  try {
    const instructions = client.getInstructions();
    assert.ok(instructions?.trim().length);
    assert.match(instructions ?? "", /только на чтение/);
    assert.match(instructions ?? "", /confirmWrite=true/);
  } finally {
    await client.close();
  }
});

test("without a token the server still starts and completes the handshake", async () => {
  const client = await connectUnconfigured();
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(tools.includes("auth_status"));
    assert.ok(!tools.includes("start_login"));
    assert.ok(!tools.includes("finish_login"));
    assert.ok(!tools.includes("logout"));
    assert.ok(tools.includes("list_counters"));

    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /не подключена|Персонализация|YANDEX_METRIKA_TOKEN/);
  } finally {
    await client.close();
  }
});

test("an unconfigured data call returns actionable text, not a dead connection", async () => {
  const client = await connectUnconfigured();
  try {
    const result = (await client.callTool({ name: "list_counters", arguments: {} })) as {
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    };
    assert.equal(result.isError, true);
    const text = result.content.map((c) => c.text ?? "").join(" ");
    assert.match(text, /Персонализация|YANDEX_METRIKA_TOKEN/);
  } finally {
    await client.close();
  }
});