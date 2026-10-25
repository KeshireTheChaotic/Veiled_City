# RF05-F04 C02 — GM conversation-principal public API adoption

## Objective

Replace the single `gm.js` import of `conversationPrincipal` from the Session compatibility path with the already published Session API. Preserve the same function identity, arguments, exceptions and owner/proxy/attendance checks. This removes only the exact RF05-F04 private-API transition for that import; it does not move GM orchestration or complete RF05-F04.

## Ownership and behavior

`conversationPrincipal` is Session-owned and is already re-exported by `frameworks/session/public.js`. `gm.js` remains application-owned. No Session policy, PC action, audience grant, transaction or receipt behavior changes. The prior compatibility reader remains available for existing imports.

## Verification

Create `bot/tests/ai-gm-2026-10/rf05-f04-c02.test.mjs`. Import the actual `GMService` module to verify its new public import resolves; assert public and compatibility exports retain identity; use disposable SQLite to exercise an authenticated owner principal; and assert the GM source imports only the Session public path for this capability. Syntax-check only changed JavaScript and the fresh test. Run the targeted test once as a blocking batch and the RF05 phase-aware architecture ratchet. Do not run inherited tests, broad validation, live services or providers, or polling.

After the checker confirms the old edge is absent, retire only transition `61fbe9207703ebe867a0ac4e3b99d565451b5f95cf6ddf7fe61d80fe551ce1a4`, preserving its original record in the feature evidence. Do not change the baseline, increase any allowed count, or modify unrelated transition deadlines.

Record exact test/source hashes, terminal outcome, changed-path and phase-wide architecture results, remaining F04 obligations, cost and rollback. RELEASE NOT AUTHORIZED.
