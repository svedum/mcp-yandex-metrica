import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAuthTools } from "./auth.js";
import { registerCounterTools } from "./counters.js";
import { registerStatisticsTools } from "./statistics.js";
import { registerRawTool } from "./raw.js";

interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** Registers every tool against a fake server, capturing each tool's annotations. */
function collectAnnotations(): Record<string, Annotations | undefined> {
  const annotations: Record<string, Annotations | undefined> = {};
  const server = {
    registerTool: (name: string, cfg: { annotations?: Annotations }) => {
      annotations[name] = cfg.annotations;
    },
  };
  const registrars = [registerCounterTools, registerStatisticsTools, registerRawTool];
  for (const register of registrars) register(server as never, {} as never);
  registerAuthTools(server as never, {} as never);
  return annotations;
}

const ANN = collectAnnotations();

test("every tool declares annotations with all four hints", () => {
  const names = Object.keys(ANN);
  assert.deepEqual(
    names.sort(),
    ["auth_status", "get_statistics", "list_counters", "list_goals", "raw_request"],
  );
  for (const [name, a] of Object.entries(ANN)) {
    assert.ok(a, `${name} is missing annotations`);
    assert.equal(a?.openWorldHint, true, `${name} should set openWorldHint`);
    assert.equal(typeof a?.readOnlyHint, "boolean", `${name} should set readOnlyHint`);
    assert.equal(typeof a?.destructiveHint, "boolean", `${name} should set destructiveHint`);
    assert.equal(typeof a?.idempotentHint, "boolean", `${name} should set idempotentHint`);
  }
});

test("read tools are read-only, non-destructive, idempotent", () => {
  for (const name of ["list_counters", "list_goals", "get_statistics", "auth_status"]) {
    assert.equal(ANN[name]?.readOnlyHint, true, `${name} should be readOnly`);
    assert.equal(ANN[name]?.destructiveHint, false, `${name} should be non-destructive`);
    assert.equal(ANN[name]?.idempotentHint, true, `${name} should be idempotent`);
  }
});

test("raw_request is flagged destructive (it can POST/DELETE)", () => {
  assert.equal(ANN.raw_request?.readOnlyHint, false);
  assert.equal(ANN.raw_request?.destructiveHint, true);
});