# Historical Psychologists Dialogue MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive educational web app where users can hold safe, multi-turn conversations with seven distinct historical psychology personas without persistent chat storage.

**Architecture:** A Next.js application keeps presentation and ephemeral session state in the browser while a server route performs validation, safety classification, persona orchestration, model streaming, and output review. Versioned persona content is validated through domain schemas; model and future knowledge retrieval dependencies sit behind interfaces.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Zod, Vitest, React Testing Library, Playwright, SSE-compatible streaming.

## Global Constraints

- Personas: Freud, Jung, Bion, Klein, Winnicott, Kohut, and Irvin Yalom.
- Modes: self-reflection, theory classroom, and critical discussion.
- The product is educational role simulation, not diagnosis, treatment, or a licensed clinical service.
- No account system, application database, vector database, queue, or multi-agent framework in MVP.
- Conversations remain in the current browser tab and disappear on refresh or close.
- Full user or assistant messages must never enter routine server logs.
- Model credentials remain server-side.
- S2 and S3 safety states override and exit the historical persona.
- Use public-domain or licensed portraits and texts only.

## File Map

```text
src/app/                         routes, layouts, and API boundary
src/components/expert/           expert cards and profile presentation
src/components/chat/             mode picker, transcript, composer, export
src/components/safety/           disclaimers and crisis presentation
src/domain/experts/              persona schemas, registry, and content
src/domain/conversation/         request contracts and ephemeral state
src/domain/safety/               risk contracts, classification, responses
src/server/orchestration/        prompt/message construction and chat service
src/server/models/               provider interface and configured adapter
src/server/knowledge/            MVP null knowledge provider
src/tests/                       unit, integration, E2E, and persona evaluation
```

---

### Task 1: Application foundation and quality gates

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/tests/setup.ts`, `src/tests/smoke/home.test.tsx`

**Interfaces:**
- Produces: Next.js app shell and scripts `dev`, `build`, `lint`, `test`, `test:e2e`.

- [ ] Write a home-page test asserting the heading “与历史心理学家对话” and educational-use notice are visible.
- [ ] Run `npm test -- src/tests/smoke/home.test.tsx`; expect failure because the app shell does not exist.
- [ ] Add the minimal Next.js/TypeScript configuration, accessible root layout, global color tokens, and welcome page.
- [ ] Add lint, test, and E2E scripts with pinned dependency versions in the lockfile.
- [ ] Run `npm test -- src/tests/smoke/home.test.tsx && npm run lint && npm run build`; expect all commands to pass.
- [ ] Commit with `git commit -m "chore: establish application foundation"`.

### Task 2: Expert domain model and seven validated personas

**Files:**
- Create: `src/domain/experts/schema.ts`, `types.ts`, `registry.ts`
- Create: `src/domain/experts/profiles/{freud,jung,bion,klein,winnicott,kohut,yalom}.ts`
- Create: `src/tests/unit/experts/registry.test.ts`

**Interfaces:**
- Produces: `ExpertSlug`, `ExpertProfile`, `EXPERTS`, `getExpert(slug: string): ExpertProfile | null`.
- `ExpertProfile` includes `slug`, `nameZh`, `nameEn`, `era`, `school`, `coreTheories`, `adjacentTheories`, `style`, `interpretiveLens`, `responseRules`, `forbiddenPatterns`, `starterQuestions`, `version`.

- [ ] Write tests asserting exactly seven unique slugs, non-empty theory/style fields, version strings, and `getExpert("unknown") === null`.
- [ ] Add a cross-persona test asserting each profile owns its RFC hallmark concepts and does not claim another persona’s hallmark concepts as its own.
- [ ] Run `npm test -- src/tests/unit/experts/registry.test.ts`; expect module-not-found failure.
- [ ] Implement the Zod schema, inferred types, seven profile objects, and schema-validated registry.
- [ ] Run the registry tests; expect all assertions to pass.
- [ ] Commit with `git commit -m "feat: add validated expert persona registry"`.

### Task 3: Safety engine and persona-exit responses

**Files:**
- Create: `src/domain/safety/types.ts`, `classify-input.ts`, `review-output.ts`, `crisis-response.ts`
- Create: `src/tests/unit/safety/classify-input.test.ts`, `review-output.test.ts`

**Interfaces:**
- Produces: `SafetyLevel = "S0" | "S1" | "S2" | "S3"`.
- Produces: `assessInput(text: string): SafetyAssessment`, `reviewOutput(text: string): OutputReview`, `buildSafetyResponse(assessment: SafetyAssessment): string`.
- `SafetyAssessment` contains `level`, `categories`, `exitPersona`, and `reasonCode`; it must not retain the input.

- [ ] Write table-driven tests for neutral study questions, distress, non-imminent self-harm, and imminent danger; assert S2/S3 set `exitPersona: true`.
- [ ] Write output-review tests for diagnoses, medication instructions, false emergency-action claims, and healthy educational language.
- [ ] Run the two test files; expect failures because the functions do not exist.
- [ ] Implement deterministic MVP rules with normalized text and explicit category dictionaries; keep rules isolated so a provider-backed classifier can replace them later.
- [ ] Implement modern, non-persona S2/S3 responses that encourage immediate real-world support without claiming to contact anyone or embedding unverified phone numbers.
- [ ] Run safety tests; expect all to pass.
- [ ] Commit with `git commit -m "feat: enforce psychological safety boundaries"`.

### Task 4: Conversation contracts and prompt orchestration

**Files:**
- Create: `src/domain/conversation/schema.ts`, `types.ts`, `summarize.ts`
- Create: `src/server/orchestration/build-messages.ts`, `chat-service.ts`
- Create: `src/tests/unit/conversation/build-messages.test.ts`

**Interfaces:**
- Produces: `ConversationMode`, `ConversationRequest`, `ChatMessage`, `SessionSummary`.
- Produces: `buildModelMessages(request, expert): ModelMessage[]` and `runChat(request, dependencies): AsyncIterable<string>`.
- Consumes: `getExpert`, `assessInput`, `reviewOutput`, `ModelProvider`, `KnowledgeProvider`.

- [ ] Write tests asserting safety instructions appear before persona instructions, mode guidance is present, history is length-bounded, and user content is delimited as data rather than instructions.
- [ ] Write a test asserting S2/S3 returns `buildSafetyResponse` without invoking the model provider.
- [ ] Run the tests; expect module-not-found failures.
- [ ] Implement Zod request validation with maximum message and history lengths, three allowed modes, and strict roles.
- [ ] Implement message assembly that distinguishes identity, theory boundaries, modern context, mode, summary, history, and current input.
- [ ] Implement chat orchestration with safety-first routing, provider streaming, output review, and neutral failure mapping.
- [ ] Run the task tests; expect all to pass.
- [ ] Commit with `git commit -m "feat: orchestrate safe persona conversations"`.

### Task 5: Model and knowledge provider boundaries

**Files:**
- Create: `src/server/models/types.ts`, `configured-provider.ts`, `fake-provider.ts`
- Create: `src/server/knowledge/types.ts`, `null-provider.ts`
- Create: `src/tests/unit/server/providers.test.ts`

**Interfaces:**
- Produces: `ModelProvider.stream(messages: ModelMessage[], signal?: AbortSignal): AsyncIterable<ModelChunk>`.
- Produces: `KnowledgeProvider.search(expert: ExpertSlug, query: string): Promise<KnowledgeItem[]>`.
- `NullKnowledgeProvider.search` always returns `[]`.

- [ ] Write contract tests for streaming order, abort propagation, safe error mapping, and empty MVP knowledge results.
- [ ] Run the provider tests; expect failures.
- [ ] Implement provider interfaces, a deterministic fake for tests, and environment-validated configured-provider construction.
- [ ] Implement the null knowledge provider without adding retrieval dependencies.
- [ ] Run provider and orchestration tests; expect all to pass.
- [ ] Commit with `git commit -m "feat: add model and knowledge provider boundaries"`.

### Task 6: Streaming chat API with privacy-preserving telemetry

**Files:**
- Create: `src/app/api/chat/route.ts`, `src/server/telemetry/event.ts`, `src/server/telemetry/logger.ts`
- Create: `src/tests/integration/api/chat.test.ts`

**Interfaces:**
- Consumes: `ConversationRequestSchema`, `runChat`.
- Produces: `POST /api/chat` streaming `text/event-stream` or framework-equivalent text stream.
- Telemetry event contains request ID, duration, outcome, risk level, and anonymous token estimate only.

- [ ] Write integration tests for invalid requests (400), unknown experts (404), safe streaming (200), S3 persona exit, provider timeout (503), and absence of message content in logged events.
- [ ] Run the integration tests; expect route-not-found failure.
- [ ] Implement request size limits, schema validation, abort forwarding, stream headers, and stable public error codes.
- [ ] Implement a telemetry allowlist; do not accept arbitrary metadata objects.
- [ ] Run integration, safety, and orchestration tests; expect all to pass.
- [ ] Commit with `git commit -m "feat: expose private streaming chat endpoint"`.

### Task 7: Expert discovery and mode-selection UI

**Files:**
- Create: `src/app/experts/page.tsx`, `src/app/experts/[slug]/page.tsx`
- Create: `src/components/expert/expert-card.tsx`, `expert-profile.tsx`, `mode-picker.tsx`
- Create: `src/tests/components/expert-selection.test.tsx`

**Interfaces:**
- Consumes: `EXPERTS`, `getExpert`, `ConversationMode`.
- Produces: links to `/chat/:slug?mode=<mode>`.

- [ ] Write component tests for seven cards, hallmark concepts, accessible names, unknown-profile handling, and all three modes.
- [ ] Run the tests; expect missing-component failures.
- [ ] Implement responsive expert cards and profile pages using text-first placeholders where portrait rights are not yet confirmed.
- [ ] Implement keyboard-accessible mode selection and clear educational-use language.
- [ ] Run component tests and build; expect success.
- [ ] Commit with `git commit -m "feat: add expert and mode selection"`.

### Task 8: Ephemeral multi-turn chat experience and browser export

**Files:**
- Create: `src/app/chat/[slug]/page.tsx`
- Create: `src/components/chat/chat-workspace.tsx`, `transcript.tsx`, `composer.tsx`, `session-notice.tsx`, `export-button.tsx`
- Create: `src/domain/conversation/browser-session.ts`, `export.ts`
- Create: `src/tests/components/chat-workspace.test.tsx`, `src/tests/unit/conversation/export.test.ts`

**Interfaces:**
- Produces: in-memory `useReducer` session with `messages`, `summary`, `status`, `safetyLevel`; no localStorage, sessionStorage, IndexedDB, or cookie writes.
- Produces: `toMarkdown(session): string`, `toPlainText(session): string`.

- [ ] Write tests for sending, streaming, retrying interrupted replies, clearing, disabling empty submissions, and preserving unsent input after server failure.
- [ ] Write export tests asserting expert/mode metadata is included and no internal prompt or safety metadata is included.
- [ ] Run tests; expect missing implementations.
- [ ] Implement the in-memory reducer, abortable fetch stream, transcript announcements, composer, clear action, and incomplete-response marker.
- [ ] Implement browser-only Blob downloads with a personal-information reminder.
- [ ] Add a source scan test that rejects `localStorage`, `sessionStorage`, and `indexedDB` in conversation code.
- [ ] Run component, export, and source-scan tests; expect success.
- [ ] Commit with `git commit -m "feat: add ephemeral multi-turn chat and export"`.

### Task 9: About, privacy, and crisis-boundary surfaces

**Files:**
- Create: `src/app/about/page.tsx`, `src/components/safety/educational-notice.tsx`, `crisis-notice.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/tests/components/safety-notices.test.tsx`

**Interfaces:**
- Produces: consistently linked methodology, privacy, historical-authenticity, and crisis-boundary copy.

- [ ] Write tests asserting the app never labels personas as doctors or licensed therapists and that privacy/safety information is reachable from every primary route.
- [ ] Run tests; expect failures.
- [ ] Implement approved Chinese copy explaining simulation identity, non-clinical scope, ephemeral storage, supplier processing, and emergency limitations.
- [ ] Ensure crisis resources are rendered from a deploy-time reviewed configuration rather than model-generated phone numbers.
- [ ] Run notice tests, accessibility checks, and build; expect success.
- [ ] Commit with `git commit -m "feat: publish safety and privacy boundaries"`.

### Task 10: Persona evaluation and adversarial regression suite

**Files:**
- Create: `src/tests/evaluations/cases/{freud,jung,bion,klein,winnicott,kohut,yalom}.ts`
- Create: `src/tests/evaluations/persona-rubric.ts`, `run-evaluations.test.ts`, `safety-red-team.test.ts`
- Create: `docs/evaluation-guide.md`

**Interfaces:**
- Produces: `EvaluationCase` with `prompt`, `mode`, `requiredSignals`, `forbiddenSignals`, `safetyLevel`, `reviewNotes`.
- Produces: deterministic checks plus an exportable human-review worksheet.

- [ ] Add at least four cases per expert: hallmark concept, shared vignette, adjacent-school interference, and historical limitation.
- [ ] Add red-team cases for prompt leakage, diagnosis, fabricated quotation, sexualized transference, minors, dependency, self-harm, and harm to others.
- [ ] Run the suite against the fake provider first; expect deterministic structural checks to pass.
- [ ] Add an opt-in command for live-provider sampling that writes no raw conversations to routine logs.
- [ ] Document a blinded human review process and the 75% persona-identification release threshold.
- [ ] Run all deterministic tests; expect success.
- [ ] Commit with `git commit -m "test: add persona and safety evaluation suite"`.

### Task 11: End-to-end acceptance and release readiness

**Files:**
- Create: `src/tests/e2e/core-flow.spec.ts`, `privacy.spec.ts`, `crisis.spec.ts`, `mobile.spec.ts`
- Create: `docs/release-checklist.md`

**Interfaces:**
- Consumes: the complete application.
- Produces: evidence for every RFC MVP acceptance criterion.

- [ ] Write E2E tests covering welcome acknowledgement, expert selection, each mode, multi-turn streaming, retry, clear, export, refresh loss, mobile layout, and keyboard navigation.
- [ ] Add S2/S3 E2E cases asserting historical persona labels disappear from crisis responses.
- [ ] Add a privacy test asserting refresh cannot restore the transcript and routine telemetry contains no full message text.
- [ ] Run `npm test`; expect all unit, component, integration, and evaluation tests to pass.
- [ ] Run `npm run test:e2e`; expect all supported desktop and mobile projects to pass.
- [ ] Run `npm run lint && npm run build`; expect zero errors.
- [ ] Complete the release checklist for model data terms, regional crisis resources, copyright, and psychology reviewer approval; mark public release blocked until every operational item is signed off.
- [ ] Commit with `git commit -m "test: verify MVP release readiness"`.

## Final Verification

- [ ] Confirm seven personas validate and severe theory crossover count is zero in the maintained evaluation set.
- [ ] Confirm every S2/S3 case exits persona.
- [ ] Confirm blinded human identification is at least 75% before public release.
- [ ] Confirm no persistence API is used and refresh removes the session.
- [ ] Confirm routine logs contain no full message content.
- [ ] Confirm privacy, safety, methodology, and historical-authenticity pages are reachable.
- [ ] Confirm operational launch blockers are signed off separately from software test completion.
