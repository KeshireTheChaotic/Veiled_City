# P06-F12 — Maintenance Memory: ledger

Status: SUPPORTED; TARGETED DELTA PASS. Baseline audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; freeze HEAD `ceeadef759fadb22103d45f412265589b343a829`.

The exact occurrence is `environment:veil-anchor-chamber:maintenance-memory`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#veil-anchor-chamber/features/1`. Its adapter references one current GM-established fact only when the fact, GM ruling and reviewed mutation snapshot are active and visible to the acting audience. It adds no PC action, knowledge record, dice, cost, hazard presence or mechanical effect. Freeform narrative presentation around that sourced truth remains available.

Changed production modules: `native-feature-definitions.json`, `native-feature-catalog.js`, `native-environment-capabilities.js`, `native-environment-scene.js`, `gm-arbitration-contract.js`. Changed fresh tests: `p06-f01.test.mjs` and new `p06-f12.test.mjs`; source coverage mappings added. Shared fresh test batch paths and all SHA-256 input hashes are in [targeted evidence](../../evidence/P06_F12_TARGETED.json).

Run `p06-f12-20261021-a` ran the frozen P06-F01/F03/F04-F12 union once: 29 total, 28 passed, 1 failed on a typographic apostrophe assertion, exit 1. Batched repair changed only the F12 assertion; `p06-f12-repair2-20261021-a` reran only that affected feature file: 4 passed, 0 failed, exit 0. Unique final coverage: 29/29 pass. Syntax: 6 changed JS/MJS files pass `node --check`; 2 changed JSON files parse. Initial and repair outputs are retained in ignored local logs. No passing file outside the changed F12 test was rerun.

Cost/cache: paid provider calls 0, provider tokens 0, provider test spend $0; no cache claim; Codex usage unavailable. Questions: no new narrative restriction proposed. Separate owner-authority question HR14 `owner:everything-logs-hope:v1` remains unanswered and locally holds only Everything Logs. Critical blocker: none. Integrated live-state scene execution/replay, release qualification and real narrative quality/cost remain unverified. Release authorization: none.

Implementation commit: `9e9e94b89b7c77e8e7cddac84aa406515b9d08e2`.
