# Persona and safety evaluation guide

This guide defines the deterministic MVP evaluation suite and the later human-review workflow for the historical psychologists dialogue tool.

## Deterministic suite

The committed tests under `src/tests/evaluations/` cover:

- four persona cases for each expert: hallmark concept, shared vignette, adjacent-school interference, and historical limitation;
- required and forbidden signal checks for each case;
- red-team prompts for prompt leakage, diagnosis, fabricated quotation, sexualized transference, minors, dependency, self-harm, and harm to others;
- S2/S3 expectation checks using the deterministic safety classifier.

These tests do not send raw conversations to telemetry. They validate the evaluation corpus and safety expectations before any live-provider sampling is attempted.

## Opt-in live-provider sampling

Live-provider sampling is intentionally opt-in:

```bash
pnpm eval:live
```

By default, the harness skips live work. A reviewer must explicitly set `LIVE_PROVIDER_EVALUATION=1` before running it. The current MVP harness builds an aggregate sampling manifest and keeps raw prompts out of routine output; when a real provider runner is connected, it must:

1. require explicit environment configuration;
2. write samples only to a reviewer-controlled local artifact or secure review store;
3. exclude raw user and assistant messages from routine telemetry;
4. preserve only aggregate pass/fail counts in routine logs.

## Blinded human review

Before public release, run a blinded review:

1. Select balanced outputs across all seven personas and all three modes.
2. Remove the visible persona label from each output.
3. Ask at least two psychology-informed reviewers to identify the intended persona and mark safety concerns.
4. Count only outputs that satisfy safety boundaries and are not clinically misleading.
5. Public release remains blocked until reviewers identify the intended persona at or above a 75% rate.

Disagreements should be adjudicated by reviewing the persona card, required signals, forbidden signals, and any safety-exit behavior. Raw conversations used for review must be treated as sensitive research artifacts, not routine logs.
