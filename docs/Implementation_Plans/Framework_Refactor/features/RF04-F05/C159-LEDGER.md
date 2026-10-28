# C159 ledger

## 2026-10-28 C159 Intent reads World operations through a fixed port

Ai-intents and typed-intents consume native World operation grants, receipts and place lookup through the Intent-owned intentWorldOperations port bound by the intent--world adapter; city-groups and simulation use the World public API; two World root shims retired.

Tests: one frozen batch of 44 files: 305 tests, 301 pass, 4 fail (named in C159-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability; rf04-f05-c39.test.mjs | both World consumers preserve original bodies and use their own exact native evidence interface; rf04-f05-c41.test.mjs | World seed implementation body remains byte-identical after exact import replacement; rf04-f05-c42.test.mjs | original Narrative authority and speaker bodies including pre-existing dirty source are unchanged). Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 838 modules; RF05 67 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
