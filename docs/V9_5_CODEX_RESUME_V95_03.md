# Codex resume — V95-03 with lean tests (paste verbatim)

**Current local checkpoint, per owner:** V95-02 committed `708d0bd687f6810037ff0829a2ee19f654c79c8a`, 364/364 focused, 128/128 full offline suites, both D08 checks green, clean tree; no push or production/live actions. V95-00 `1b36ee1`, V95-01 `e729a10`. Verify these facts locally; GitHub remote may be behind.

Read the attached **`V9_5_LEAN_VALIDATION_POLICY.md`** and current `docs/V9_5_IMPLEMENTATION_PLAN.md` and `docs/TYPED_INTENT_PROGRESS.md`. This lean validation amendment takes precedence over older instructions that mandated multiple full suite runs and duplicate D08/check invocations after every edit. Preserve all required assertions and legacy compatibility. Do not remove tests until V95-05 coverage proof.

**Implement V95-03 only:** guided, owner-private, revision-bound Discord controls for v2 narrative PvP and v3 damage consent, attack/defense/Armor/death, Fear status, withdrawal and independently reviewed disclosure, using existing native services. Existing JSON commands remain supported. Feature flag if appropriate. Never infer consent or another PC's narration; never reroll/reapply after a failed interaction or uncertain delivery. Preserve all Daggerheart and PvP house rules.

**Budget-conscious work cadence**:
1. Inspect local SHA/status and only relevant v9.5 phase plan, native UI and tests. Do not re-read/replay V95-00–02 or the entire historical progress log.
2. For each new behavior, add *one* targeted red-first case; fix, then rerun only affected `v95-pvp-ux` tests (T0).
3. At coherent integration checkpoints, run selected affected legacy negatives/Discord adapter suites (T1), not all 364 focused cases. Expand if editing source authority, roll effects, output publication or native command dispatch.
4. Finalize runtime, test registration, documentation and manifest **before** full qualification. Run **one** `npm run validate` with network denied; it includes source/schema and mandatory D08 suites. Run `npm run check` once only if phase contract demands it. `git diff --check` and manifest integrity once. If tests fail, fix impacted code with T0/T1 and then repeat final T2. Do not rerun full solely to append a results-only progress entry.
5. Capture verbose tests to a temporary log outside tracked files. Report exit status, mandatory pass count, skips, relevant failures and last 40–80 diagnostic lines *only if red*. Keep conversation updates brief (~20 lines); do not paste passing TAP streams or full matrix recaps.
6. Only if V95-03 scope and mandatory T2 pass, stage specific files and create local commit `feat(v9.5-ux): guide owner-scoped PvP consent and mechanics`. Otherwise report blocked, without commit. Do not start V95-04 early.

No push, production DB/.env, bot/Discord deployment, live model/API call or paid token usage without separate approval. The desired reduction is in **duplicate executions and Codex log/context**, not in privacy, agency, mechanical accuracy or required default validation.
