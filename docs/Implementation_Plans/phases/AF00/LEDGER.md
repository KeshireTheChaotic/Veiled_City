# AF00 — Baseline and deletion dependency audit

**COMPLETE — offline source audit, Agent C.** Final baseline: `d107c4ba2b444e267848d7c4321e81125c87fb47`, branch `codex/clean-ai-gm-2026-10`. The amendment's original pin is `4ca9680104033c148f91b080dddbfa53349dda05`; concurrent RF05/RF06 commits advanced HEAD before final collection. No runtime behavior, content, persistence, multiplayer, or feature status changed. No deletion is authorized by this evidence alone.

## Delivered

- [BASELINE.json](BASELINE.json): actual HEAD/branch, dirty-tree snapshot, SHA-256 source pins, catalog/errata versions and independent HEAD content pins. This captures concurrent RF05/RF06 work without adopting it as Agent C changes.
- [MIGRATION_LEDGER.json](MIGRATION_LEDGER.json): 153 distinct checked occurrences, exact printed rules and template hashes, all linked house-rule versions, current limitations, costs/trigger/target/roll contracts, authority assignments, migration gates and production references.
- [DEPENDENCIES.json](DEPENDENCIES.json): conservative static dependency graph across 231 potentially affected modules, 216 declared symbols and 44 candidate event/record kinds, including import/re-export edges and source-line references. Textual references are candidates, not proof that a call executes. Generic identifiers such as `feedback` can include unrelated matches; retain the conservative superset until each proposed deletion is narrowed.
- [AUDIT.md](AUDIT.md): source precedence, live context paths, compatibility consumers, special cases and exact AF01 handoff.
- [audit.mjs](audit.mjs): repeatable offline evidence collection using Node standard libraries. It reads source text and Git metadata, never imports production modules or opens a campaign database.

## Verification — complete

Final run ID: `AF00-C-baseline-d107c4b`. Commands from repository root:

1. `node --check docs/Implementation_Plans/phases/AF00/audit.mjs` — exit **0**.
2. `node docs/Implementation_Plans/phases/AF00/audit.mjs` — exit **0**, all eight audit assertion groups passed; see [CHECKS.json](CHECKS.json).

Verified 153 unique dispositions, 153 exact feature/template hash pairs, linked errata source hashes, explicit authored-rule hashes, 78 supported/75 review-only occurrences, 49 context/29 other supported occurrences and implementation references outside the registry for all 78. The six disposition counts are 49/20/9/5/42/28 as specified in the amendment. Input hashes and HEAD remained stable during collection. The capture time and full working-tree fingerprint are in BASELINE.json.

The initial collector passed at `4ca9680`; its record filter was then expanded to include prepared-position evidence and concurrent source inputs changed, justifying one final collection at `d107c4b`. Both executions exited 0. Production tests: **not run**, because no production module changed; this follows the fresh changed-code-only protocol. Runtime parity, Discord/provider behavior, deployment and release qualification: **not tested**. Do not rerun completed verification unless its inputs or collector change; later source drift requires a new named snapshot before deletion work.

## Known issues and deferred work

- Owner clarified that `AUDIENCE_FIRST_SPEC.md` is the purpose document and corrected AGENTS.md. The four values specifications and owner behavior specification under `docs/Implementation_Plans/` were consulted; no purpose-document blocker remains.
- Professional Entry has a live native mechanical path despite its `_context` handler classification. Preserve its separate first-use/Advantage receipts; the wrapper retirement disposition does not retire that path.
- Historical errata include review-only versions beside newer supported versions. Preserve versioned readers and current bounded limitations; a status mismatch is not permission to reinterpret old outcomes.
- Static graph coverage is not dynamic call resolution or behavioral equivalence. AF01/AF03 must prove the changed native paths with fresh targeted tests before removing wrappers or handlers. Computed calls and runtime-injected capabilities require inspection at that point.
- Agents A/B own concurrent RF05/RF06 edits. Agent C changed only this AF00 directory. The pre-existing amendment is retained unchanged.

## Exit and next exact phase

AF00 inventory exit is met: every occurrence is classified and source-pinned; owner-authority boundaries and compatibility candidates are documented. Unimplemented mechanics retain their existing local holds. No design-time ruling was invented.

**Next: AF01 — Shared context retrieval, BEFORE deletion.** Use current-template retrieval already present in `feature-catalog.js`, preserve binding/audience/ordinary adjudication semantics, and establish parity for all 49 wrapper contexts before removing them. Reconcile the snapshot pins against the then-current RF05/RF06 checkout first. AF02–AF06 implementation remains outside AF00.
