# V9.5 amendment — lean validation and Codex context budget

**Status:** Effective proposed execution policy for **V95-03 through V95-06**. Does not amend already implemented rules, test assertions, or native authority. The user reports V95-02 completed locally as commit `708d0bd687f6810037ff0829a2ee19f654c79c8a`; clean tree; **364/364** focused tests, **128/128** network-denied mandatory offline suites, and both standalone D08 checks. This local commit is not presumed visible on remote GitHub; Codex must check local SHA/status. V95-00 `1b36ee1` and V95-01 `e729a10` remain earlier local checkpoints.

## Problem being solved

The original V9.5 plan demanded red-first, multiple focused runs, P0 replays, separate syntax/schema/D08 tests, an entire `npm run validate`, and a second identical full run after progress/manifests **for each phase**. This repeats tests already included in `validate-offline.mjs` and burns Codex context on hundreds of passing lines. GitHub v9.4's runner already includes `quality-check`, `format-check`, `check-source`, `validate-command-schema`, the D08 suites and REL01 mandatory-registration guards, alongside native mechanics and privacy regressions. Confirm the **local updated** V95-02 runner rather than assuming the remote runner equals the local 128-suite version.

**New approach: test less often and emit less output, but retain the exact mandatory security/behavior assertions.** Do not delete needed tests or waive a red P0 gate merely to shorten qualification. Codex context consumption (logs, excessive repeated plans/recaps) is distinct from offline test process runtime. Optimize both separately.

## A. Test tiers

| Tier | When | Scope | Run/output budget |
|---|---|---|---|
| **T0 — edit loop** | After a coherent code edit | The new failing/regression test or 1–3 directly affected test files; `node --check` on changed JS when applicable | Run as necessary, but **never** invoke the 128-suite runner after every edit. Capture logs, display only failures plus a concise count. |
| **T1 — integration checkpoint** | Once when a behavioral subfeature is ready, or when changed code crosses a second native boundary | At most 3–8 impacted behavioral suites selected from actual imports/call sites, plus exact relevant P0 negatives and a representative Discord adapter test. D08 standalone when edits touch consent/privacy/authority/publication/concurrency | Prefer **one checkpoint per subfeature**, not the entire 364-test focus matrix after each change. Unknown impact => widen coverage, not skip verification. |
| **T2 — phase completion** | Once **after** runtime, fixtures, suite registration, manifest and substantive documentation are finalized | `npm run validate` **once** in the network-denied runner; it already contains static checks and D08 required cases. Run `npm run check` separately once if documented phase contract explicitly demands it; perform `git diff --check` and release manifest integrity. No duplicate standalone D08 unless necessary to isolate failure or prove newly edited D08 fixtures. | All mandatory offline suites must pass, no skips. Failures reopen T0/T1 for the *impacted* code only. Repeat T2 only after actual executable/config/test changes or a failed T2; **not solely because a results-only progress sentence was appended.** |
| **T3 — release/push qualification** | V95-06 and before approved deployment | One full same-source offline qualification, release/CI confirmation if a push occurs, separately authorized live staging | No redundant full replay for a docs-only status amendment. Live API or Discord operations always need separate authorization. |

### Mandatory safeguards while selecting tests

- **Never** demote or exclude: FH40 unauthorized PC effects, PVP30/PVP30q cross-actor authorship, OBS21 NPC observation, D08 consent/security, native PvP Hope/Fear, attack/Evasion/Armor/death, per-target signatures, recovery, and uncertain delivery. They remain in the default **full** validator and execute before every phase commit.
- During T0/T1, select the *specific relevant* negative(s) whenever touching their boundary. Eg., for UI callback changes: `v9-roll-ux`, `v9-publication`, `v9-discord-hardening`, owner/source/PvP auth negatives; not all 364 focused cases. For metrics: MET plus D08 privacy/logging and read-only side effect negatives. For deprecation: dependency + assertion crosswalk tests.
- Unknown import/dynamic dependency or changes to DB, source authority, consent, rolls, native effects, output revalidation, or the offline runner itself => **expand** T1. Never let a guessed dependency graph be the final safety gate.
- Preserve **red-first evidence** for a newly discovered bug, but **one minimal failing reproduction per independent defect** suffices. Avoid dozens of alternate red cases before any fix; add required adversarial cases once the fix exists.
- The 90-row V95 regression matrix is a **requirements inventory**, not an instruction to build and rerun 90 independent heavyweight end-to-end fixtures. One well-designed scenario may assert several listed requirements if each assertion and production path is explicitly indexed.
- Do not lower the default mandatory suite count merely to speed V95-03/04. V95-05 may retire redundant suites **only after** evidence of assertion-level coverage equivalence, P0 mutation detection, and an unchanged default CI security gate.

## B. One full validation gate per completed phase

1. Preserve local changes. Review relevant source and registered test coverage.
2. Add 1 precise failing fixture for each actual new defect (or document why the preexisting fixture already fails). Capture only a short reproduction.
3. Fix in small changes; iterate T0 only; run T1 once per meaningful integration boundary.
4. Prepare substantive phase changes, release manifest, test registration, coverage crosswalk, and documentation **before** final T2.
5. T2: run required full validation **once** on the executable final tree. Record exact code exit status and summary. Verify D08 included and passed from the emitted suite report. If phase requirements explicitly demand `npm run check`, run it once; do not separately run the same check multiple times because `npm run validate` includes it.
6. Update `TYPED_INTENT_PROGRESS.md` with a short outcome-only line **without changing executable/test inputs**; `git diff --check` and manifest inventory checks afterward. If result-only text is the sole change, no second 128-suite validation is warranted. If code, assertions, test registration, package config, schema, content consumed by tests, or manifest inputs change, rerun relevant T1 then T2.
7. Stage intended files, inspect `git diff --cached --check` and diff summary, commit the **one** validated phase only. No commit on red/P0 or skipped default suite. No push without separate effective authorization. No deployment/billing.

**Note:** if a project script enforces an exact full-tree manifest hash including documentation, regenerate it before T2. Result-only progress annotations must be accounted for by manifest integrity checks; if they alter inputs to mandatory validation, T2 must be rerun. Never pretend an earlier run qualifies a different executable tree.

## C. Codex context / command budget

- Output a short plan and concise test result summary (ideally <= ~20 lines) per checkpoint; never paste thousands of passing TAP lines or repeat the entire coverage matrix/progress ledger.
- Redirect stdout and stderr to a temporary local log **outside the repository** (e.g. `%TEMP%` on Windows). Capture exit status and only display failing test names plus the last relevant 40–80 lines on failure. On success display suite count, pass/fail/skip, duration, and network-denied/zero-live summary. Keep detailed logs available locally if a specific failure needs diagnosis.
- Use diff-limited inspections (`git diff --stat`, `git diff -- <affected files>`, selective `rg`) and progress tail. Avoid rereading 1000-line history on every turn; refer to the pinned commit and current phase.
- Group simple shell commands and prefer one focused run after several related changes. Do not run `npm ci` unless dependencies/lockfile changed or the environment requires it. Do not repeatedly sync manifests if sources/config have not changed.
- Do not call the paid model just to generate test variants; deterministic native fixtures and offline doubles suffice. ChatGPT in-chat roleplay may give narrative feedback but never substitutes for bot integration proof.
- For CI, use the existing network-denied full validation. Any new `--focused` selector must be **opt-in** for developers only; default `npm run validate` and GitHub CI always run the complete mandatory registry. Reject unknown suite selections rather than silently passing zero tests.

## D. Phase-specific minimal impacted suite selection

| Phase | T0/T1 priorities, not exhaustive | Final mandatory T2 |
|---|---|---|
| **V95-03** private UI | New `v95-pvp-ux-test`; `v9-roll-ux`; `v9-discord-hardening`; selected `v9-pvp-agreement`, `v94-pvp-profile`, `v94-pvp-damage`, and `v9-publication` negatives **only where touched**. Confirm owner/revision/recipient, ephemeral/DM, disable stale callbacks, no double effect. | All registered network-denied suites, once |
| **V95-04** metrics | New `v95-operational-metrics-test`, `d08-observability`, specific outbox/continuation/AI latency tests touched; zero private raw text and zero mutation on read | All registered network-denied suites, once |
| **V95-05** deprecation | Static dependency graph and per-assertion equivalence, canonical replacement suites, REL01 mandatory registry audit, D08 and key authority mutation negatives. Test old/new identical behavior at relevant adapters. | Full suite with justified new registry; one full before removal only if needed to establish comparative baseline (previous V95-04 passing suite may suffice) and one after changes |
| **V95-06** release | Targeted new staging-contract suite and representative four-owner replay | One release full validation, plus separately approved staging |

## E. Operational decision record

The user reports completion of V95-02 at `708d0bd687f6810037ff0829a2ee19f654c79c8a`, with 364/364 focused, 128/128 mandatory suites, zero live/billable, 2/2 D08 and clean tree. **Treat this as the accepted predecessor, not a reason to rerun it before starting V95-03**, unless Codex's local status or source contradicts the checkpoint. Read `docs/V95_02_FINAL_INTEGRATION_COVERAGE.md` locally. The remote reviewed source may lag because no push occurred. The local test runner and fixture count are authoritative for this development checkout. No V95-03 code is yet claimed.
