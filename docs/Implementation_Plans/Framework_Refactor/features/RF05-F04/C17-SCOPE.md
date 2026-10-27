# RF05-F04 C17 — Narrative authority instruction public API

## Objective

Publish the existing `NARRATIVE_AUTHORITY_INSTRUCTIONS` value from Narrative public and route the application GM's delegated writer request through that API. Retain the root narrative-authority implementation and its compatibility export.

## Behavioral and ownership contract

Move only the immutable instruction string. Preserve its exact bytes, including its creative guidance and all existing privacy, agency, canon, native-outcome, audience, and scene-camera boundaries. Do not add, remove, strengthen, or reinterpret a narrative rule. Keep `authorNarrativeRequests`, response schema use, source validation, native receipts, persistence, and publication in their current implementations. The root module must re-export the exact same string identity.

## Verification

Create fresh `bot/tests/ai-gm-2026-10/rf05-f04-c17.test.mjs` to verify compatibility identity and capture `GMService.generateNarrative`'s actual mocked request, checking the Narrative public instruction and existing schema. Run one frozen blocking union of C16, C17, and the current fresh P10-F08 regression because the shared GM module changes. Run changed-file syntax and RF05 architecture ratchet. No inherited suites, providers, network, production data, CI, or services.

## Exit evidence

Record exact source/test hashes, terminal results, architecture totals/findings, remaining RF05-F04 assignments, rollback, costs, and release status. Retire an exact transition only if its exact edge is absent and the frozen record identifies it; otherwise preserve it. This slice does not close RF05-F04/RF05.

## Additional changed-GM regression refresh

The first C17 refresh covered C16, C17, and P10-F08. A review then found 14 other fresh RF05 test files importing the changed GM service; these were not rerun in the first batch and were executed once in a separate targeted batch. All **24/24 passed**, exit **0**, 8,429.1518 ms. This supplemental batch is recorded in `phases/RF05/rf05-f04-shared-gm-refresh.log` and C17-RUN.json. No test was repeated after its passing result.
