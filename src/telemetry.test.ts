import { test } from "node:test";
import assert from "node:assert/strict";
import { Telemetry, telemetryEnabled } from "./telemetry.js";

test("telemetry is always disabled in the Svedum fork", () => {
  assert.equal(telemetryEnabled({}), false);
  assert.equal(telemetryEnabled({ ASKADS_TELEMETRY: "1" }), false);
  const t = new Telemetry("0.1.0");
  assert.equal(t.isEnabled(), false);
  t.send("server_start");
});