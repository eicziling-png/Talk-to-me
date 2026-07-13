import { nullKnowledgeProvider } from "@/server/knowledge/null-provider";
import type { KnowledgeProvider } from "@/server/knowledge/types";
import { createConfiguredModelProvider } from "@/server/models/configured-provider";
import type { ModelProvider } from "@/server/models/types";
import { consoleTelemetryLogger, type TelemetryLogger } from "@/server/telemetry/logger";

export const DEFAULT_CHAT_ROUTE_TIMEOUT_MS = 30_000;

export type ChatRouteDependencies = {
  modelProviderFactory: () => ModelProvider;
  knowledgeProvider: KnowledgeProvider;
  telemetryLogger: TelemetryLogger;
  requestIdFactory: () => string;
  now: () => number;
  timeoutMs: number;
};

let testOverrides: Partial<ChatRouteDependencies> | null = null;

export function configureChatRouteForTest(overrides: Partial<ChatRouteDependencies>): void {
  testOverrides = { ...testOverrides, ...overrides };
}

export function resetChatRouteForTest(): void {
  testOverrides = null;
}

export function getChatRouteDependencies(): ChatRouteDependencies {
  return {
    modelProviderFactory: () => createConfiguredModelProvider(),
    knowledgeProvider: nullKnowledgeProvider,
    telemetryLogger: consoleTelemetryLogger,
    requestIdFactory: () => crypto.randomUUID(),
    now: () => Date.now(),
    timeoutMs: DEFAULT_CHAT_ROUTE_TIMEOUT_MS,
    ...testOverrides
  };
}
