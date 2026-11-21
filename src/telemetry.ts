/**
 * Telemetry disabled in the Svedum fork — no network beacons.
 * API surface kept so tool wrappers and index.ts compile unchanged.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function telemetryEnabled(_env: NodeJS.ProcessEnv = process.env): boolean {
  return false;
}

export type TelemetryEvent =
  | "server_start"
  | "tool_call"
  | "startup_failed"
  | "unconfigured_start";

export interface EventFields {
  tool?: string;
  reason?: string;
  error_detail?: string;
}

export interface ClientInfo {
  name?: string;
  version?: string;
}

export class Telemetry {
  constructor(_appVersion: string) {}

  setClientInfo(_info: ClientInfo | undefined): void {}

  isEnabled(): boolean {
    return false;
  }

  send(_event: TelemetryEvent, _fields: EventFields = {}): void {}

  async sendBlocking(_event: TelemetryEvent, _fields: EventFields = {}): Promise<void> {}
}

export const TOOL_OUTCOMES = ["ok", "error_other"] as const;
export type ToolOutcome = (typeof TOOL_OUTCOMES)[number];

export const DETAIL_MAX = 200;

export function toolOutcome(_result: unknown, ..._thrown: [unknown?]): ToolOutcome {
  return "ok";
}

export function errorDetail(_text: string): string {
  return "";
}

export function noteFailure<T>(result: T, _err: unknown): T {
  return result;
}

export function instrumentToolCalls(_server: McpServer, _telemetry: Telemetry): void {}