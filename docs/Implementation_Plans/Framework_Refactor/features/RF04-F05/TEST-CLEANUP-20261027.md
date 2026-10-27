# Fresh test cleanup — 2026-10-27

Owner request: remove tests that no longer test anything relevant, then continue RF04.

Starting point: the full fresh suite (`bot/tests/ai-gm-2026-10`, 398 files) ran 1986 tests: 1764 pass, 222 fail. End point: 367 files, 2029 tests, 2029 pass, 0 fail (one run, per-test timeout 120 s).

## Removed

- **27 per-adversary tests** `p06-f39`–`p06-f66` (except f49): each imported a `bot/src/native-adversary-*.js` module deleted when RF03-F02 (`5458704f`) consolidated the 27 projectors into `frameworks/daggerheart/adversary-contexts.js`. `rf03-f02-c01` covers the consolidated projectors.
- **4 historical tests** `rf05-f04-c20/c21/c24/c25`: assert the retired `simulation-schema.js` path; the C23 amendment already classified them as historical evidence. These files were untracked; they are archived outside the repository, not committed.
- **Source-shape assertions** (≈110 statements in 44 files) and the **10 test cases** left with no assertion after that: regex, hash, byte-identity or import-list checks against source text that later RF slices legitimately changed (moved modules, adapter connectors added, ports replacing direct imports). Each removed statement was located from the failing stack frame and reviewed as a source-text check; no behavioral assertion was removed. Removals that were the unbraced body of a `for`/`if` had the dangling header removed too, verified with a parser.
- One behavioral case, `p08-f03` "certified assembly intent reaches public writer", lost only its `goal` equality assertion: the current design forbids planner prose in the writer brief (`p08-f03-correction` checks that).

## Repaired (still relevant)

- **Moved paths** repointed in 16 tests and `bot/scripts/ai-gm-delta.mjs`: `ai-gm-test-selection.js` → `frameworks/operations/`, `dice.js` and the two native JSON files → `frameworks/daggerheart/`, `content.js` → `frameworks/content/`, `generation-feedback.js` → `frameworks/ai-provider/`.
- **Startup composition**: new test-only `compose-startup.mjs` loads the source modules `index.js` loads and binds the same ports in the same order; added to 49 tests and `p08-f04-worker.mjs` whose real flows needed ports they never composed. `rf04-f05-c02` composes only Session scene sources, because its first case asserts the uncomposed state.
- `p05-f01` fixture gained the model transport `GMService` now delegates to (RF05-F02).
- `p08-f03-correction` reads the current field name `selected_opportunities` (was `cues`).
- `p08-f04-correction` waits for forked workers to exit before deleting the temp database, which had hidden an assertion failure behind a Windows `EPERM`; the fixture retries cleanup.
