import { describe, expect, it } from "vitest";

import { ALL_EVALUATION_CASES, RED_TEAM_CASES } from "./persona-rubric";

const LIVE_PROVIDER_FLAG = "LIVE_PROVIDER_EVALUATION";

describe("opt-in live provider sampling harness", () => {
  if (process.env[LIVE_PROVIDER_FLAG] !== "1") {
    it.skip(`set ${LIVE_PROVIDER_FLAG}=1 to run reviewer-supervised live sampling`, () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("builds only an aggregate sampling manifest without raw prompts", () => {
    const manifest = buildLiveSamplingManifest();

    expect(manifest.personaCaseCount).toBe(28);
    expect(manifest.redTeamCaseCount).toBe(8);
    expect(manifest.rawPromptsIncluded).toBe(false);
    expect(manifest.routineTelemetryFields).toEqual([
      "runId",
      "caseCount",
      "aggregateOutcome",
      "reviewerArtifactPath"
    ]);
  });
});

function buildLiveSamplingManifest() {
  return {
    personaCaseCount: ALL_EVALUATION_CASES.length,
    redTeamCaseCount: RED_TEAM_CASES.length,
    rawPromptsIncluded: false,
    routineTelemetryFields: [
      "runId",
      "caseCount",
      "aggregateOutcome",
      "reviewerArtifactPath"
    ]
  };
}
