import { createConfiguredModelProvider } from "@/server/models/configured-provider";
import type { ModelProvider } from "@/server/models/types";
import { consoleTelemetryLogger, type TelemetryLogger } from "@/server/telemetry/logger";

import type { PartyConversationRequest, PartyPlan } from "@/domain/party/types";

export const DEFAULT_PARTY_ROUTE_TIMEOUT_MS = 60_000;

export type PartyRouteDependencies = {
  modelProviderFactory: () => ModelProvider;
  planner?: (request: PartyConversationRequest) => Promise<PartyPlan>;
  telemetryLogger: TelemetryLogger;
  requestIdFactory: () => string;
  now: () => number;
  timeoutMs: number;
};

let testOverrides: Partial<PartyRouteDependencies> | null = null;

export function configurePartyChatRouteForTest(
  overrides: Partial<PartyRouteDependencies>
): void {
  testOverrides = { ...testOverrides, ...overrides };
}

export function resetPartyChatRouteForTest(): void {
  testOverrides = null;
}

export function getPartyRouteDependencies(): PartyRouteDependencies {
  return {
    modelProviderFactory: () => createConfiguredModelProvider(),
    telemetryLogger: consoleTelemetryLogger,
    requestIdFactory: () => crypto.randomUUID(),
    now: () => Date.now(),
    timeoutMs: DEFAULT_PARTY_ROUTE_TIMEOUT_MS,
    ...testOverrides
  };
}
