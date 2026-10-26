# RF05-F04 C15 — Narrative v9 writer contract public API

## Objective

Publish the existing v9 narrative-writer schema and instructions from Narrative public, then route the application GM's provider request through that API. Keep the compiler/native verifier behavior and root compatibility exports intact.

## Source and ownership boundaries

The three exported contract values are owned by Narrative. Extract only their immutable definitions; preserve every prompt character, enum, required field and schema property. Put reusable act-kind and native-clause schema constants under Narrative ownership so the new contract has no new imports from root compatibility modules. Keep `compileWriterV9`, `actToNativeUnit`, and existing authorizer/compiler behavior in the root compatibility module for now. Player agency, audience selection, Daggerheart outcomes, native receipts, creativity and publication behavior remain unchanged.

Retire only the exact GM import transition `61b05681db0c9390b29bab840f6c82e00a3d969edd3878ac506fc4abef7a65ae` after the public import is present and the root re-export remains.

## Verification

Create only the fresh test `bot/tests/ai-gm-2026-10/rf05-f04-c15.test.mjs`. Verify public/root value identity, schema alignment with narrative act kinds and native clauses, and the actual `GMService.generateNarrative` request's schema and concatenated instructions through a mocked requestModel method. Run one frozen blocking test batch, syntax-check every changed JS/MJS file, and run the RF05 architecture ratchet. No inherited tests, broad validation, live provider, network or production data.

## Rollback

Restore the prior GM import and transition from `C15-RETIRED.json`; remove only the new pure contract modules/exports/test/evidence and restore root compatibility definitions. No saved state migration exists. Preserve unrelated worktree edits. Release remains NOT AUTHORIZED.
