import type { TelemetryEvent } from "./event";

export type TelemetryLogger = {
  log(event: TelemetryEvent): void | Promise<void>;
};

export const consoleTelemetryLogger: TelemetryLogger = {
  log(event) {
    console.info("chat.telemetry", event);
  }
};
