# Chinese Master Voice Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the expert conversation system so each historical psychologist speaks in Chinese as a warm, embodied master voice rather than explaining theory as an AI or classroom lecturer.

**Architecture:** Add a dedicated voice profile layer that turns theory into hidden attention patterns, compose system prompts through a reusable Chinese template, and update the local fallback provider to follow the same voice rules. Existing expert metadata remains available for profile pages.

**Tech Stack:** TypeScript, Next/Vinext app structure, Vitest component/unit tests, Playwright E2E tests.

## Global Constraints

- Role dialogue language is Chinese.
- The expert must not say they are AI, a simulation, a database persona, or “based on” a theory.
- Theory should guide attention but remain hidden from ordinary user-facing responses.
- Severe safety cases still exit the historical persona.
- No backend API contract changes unless required.

---

### Task 1: Voice profile model and registry

**Files:**
- Create: `src/domain/experts/voice-profiles.ts`
- Test: `src/tests/unit/experts/voice-profiles.test.ts`

**Interfaces:**
- Produces: `ExpertVoiceProfile`, `EXPERT_VOICE_PROFILES`, `getExpertVoiceProfile(slug)`.

- [ ] Write failing tests that assert exactly seven Chinese voice profiles exist, each has required fields, includes hidden attention and avoid-expression rules, and contains no AI/simulation framing.
- [ ] Run `pnpm test src/tests/unit/experts/voice-profiles.test.ts --reporter=dot` and expect module-not-found failure.
- [ ] Implement the voice profile registry.
- [ ] Re-run the targeted test and expect pass.

### Task 2: Chinese system prompt template

**Files:**
- Create: `src/server/orchestration/persona-prompt-template.ts`
- Modify: `src/server/orchestration/build-messages.ts`
- Test: `src/tests/unit/conversation/build-messages.test.ts`

**Interfaces:**
- Consumes: `getExpertVoiceProfile(slug)` and `renderPersonaSystemPrompt({ expert, voiceProfile, mode })`.
- Produces: system messages that instruct Chinese master-style dialogue while preserving safety-first ordering.

- [ ] Add failing tests asserting prompt content says to speak Chinese, hide theory, avoid lecture phrasing, and never claim AI/simulation identity.
- [ ] Run targeted build-message tests and expect failure.
- [ ] Implement the prompt template and wire it into `buildModelMessages`.
- [ ] Re-run targeted tests and expect pass.

### Task 3: Chinese fallback replies

**Files:**
- Modify: `src/server/models/configured-provider.ts`
- Test: `src/tests/unit/server/providers.test.ts`

**Interfaces:**
- Consumes: the new Chinese persona prompt content.
- Produces: fallback replies in Chinese without AI/simulation/theory-lecture wording.

- [ ] Add failing tests for a sad user message and a Bion/Jung/Freud-style reply that must not expose technical terms or simulation language.
- [ ] Run targeted provider tests and expect failure.
- [ ] Rewrite fallback reply builder to use Chinese embodied voice samples.
- [ ] Re-run targeted provider tests and expect pass.

### Task 4: Full verification

**Files:**
- Existing tests only.

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test --reporter=dot`.
- [ ] Run `pnpm exec playwright test`.
- [ ] Run `pnpm build`.
- [ ] Commit and deploy if all checks pass.
