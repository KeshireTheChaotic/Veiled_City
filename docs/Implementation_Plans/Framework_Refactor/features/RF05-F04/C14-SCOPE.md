# RF05-F04 C14 — Knowledge context-memory contract import

## Objective

Switch only the application GM's two immutable context-memory prompt/schema dependencies to the already owned Knowledge public API. Keep the existing root compatibility reader and factory behavior intact for all other consumers.

## Evidence and boundaries

- Source owner: `bot/src/frameworks/knowledge/context-memory.js`, assigned Knowledge in `FRAMEWORK_OWNERSHIP.csv`.
- Current edge: `bot/src/gm.js` imports `contextMemorySchema` and `CONTEXT_MEMORY_PROMPT` from the root compatibility reader `bot/src/context-memory.js`.
- Exact transition to retire after the import is removed: `cdb8c39fc7d883493d37795de97e9b82e6fd68aa812b677c67dfd4d98b451399`.
- Export the same module-level immutable schema and prompt through Knowledge public; the existing factory and root reader must reference those exact values.
- No behavior, data retention, audience, persistence, creative output, native mechanics or receipts may change.

## Verification

Write only the fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c14.test.mjs`. Verify Knowledge public and root compatibility identity, schema structure, prompt content, and GM import routing. Freeze the source/test/transition update before one blocking test launch. Syntax-check changed JavaScript/MJS and run the phase-aware RF05 architecture gate. Do not run inherited tests, broad validation, providers, network, production data or polling workflows.

## Rollback and limits

Rollback restores the GM import and exact transition record and removes only C14's named exports, test and evidence. Preserve the root compatibility reader and all other worktree edits. The RF05 architecture gate may remain failed on unrelated debt; do not convert that into a feature failure. Release remains NOT AUTHORIZED.
