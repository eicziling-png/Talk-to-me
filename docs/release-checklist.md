# MVP release readiness checklist

Public release status: **blocked until every operational item below is signed off.**

## Software acceptance evidence

- [x] Unit, component, integration, and deterministic evaluation tests pass with `pnpm test`.
- [x] End-to-end desktop and mobile tests pass with `pnpm test:e2e`.
- [x] Lint passes with `pnpm lint`.
- [x] Production build passes with `pnpm build`.
- [x] S2/S3 safety cases exit the historical persona.
- [x] Refresh cannot restore an in-tab transcript.
- [x] Routine telemetry contains no full user or assistant message content.
- [x] Privacy, safety, methodology, and historical-authenticity pages are reachable.

## Operational launch blockers

- [ ] Model data terms signed off: confirm the selected model provider's data processing, retention, and training-use terms are approved for this educational simulation.
- [ ] Regional crisis resources signed off: review every supported launch region and ensure crisis resources are current, localized, and maintained outside model-generated text.
- [ ] Copyright and rights signed off: confirm all portraits, excerpts, translations, and expert biographical materials are public-domain, licensed, or original.
- [ ] Psychology reviewer approval signed off: at least two qualified reviewers approve persona boundaries, safety copy, and release-risk notes.
- [ ] Blinded persona review signed off: reviewer identification rate is at least 75% across the maintained evaluation set.
- [ ] Privacy review signed off: confirm no account, database, persistence API, or raw-message routine logs were introduced.

## Release decision

Do not mark this MVP public-release ready until every checkbox above is complete and dated by the responsible reviewer. Passing software tests is necessary evidence, but it is not sufficient for public release.
