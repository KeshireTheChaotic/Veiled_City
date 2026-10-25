# RF05-F04 C12 — Operations metrics public API

**Status:** COMPLETE FOR THE GM PUBLIC-IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `5af97889c61547fcd38a4cde7be17102de4ce61b`
**Scope:** [`C12-SCOPE.md`](C12-SCOPE.md)

`operational-metrics.js` moved byte-identically to the Operations framework (git blob `98bd6bbf7eaf9ee882f0765a1bd3152858bb26ad` before and after). Its `./turn-trace-context.js` import now resolves to the Operations-owned trace module from C11, so metrics and trace share one async-local context. Operations public exports `OperationalMetrics`, `measureNative`, `measureStage`, `operationalMetrics` and `parseModelPricing`; the root path is a compatibility re-export, so all 16 other consumers keep the same class and singleton. `gm.js` now imports metrics from Operations public. No telemetry field, pricing, redaction, retry or timing behavior changed.

The fresh C12 regression verifies public/compatibility identity, retry and stage accounting inside a turn trace (including guild filtering and the error path), and that snapshots and incidents retain no prompt, error-code or reference text. One frozen affected-GM batch passed **21/21** across twelve fresh test files (exit **0**, **6,055.9301 ms**, network blocked by `offline-guard`). Changed JavaScript/MJS syntax passed **5/5**. No inherited telemetry suites ran.

RF05 architecture ratchet failed on existing debt: 581 source modules, zero unowned, 2,747 imports, largest cycle 181, 955 active violation groups and 955 transition errors. The new module, Operations public and the GM import have zero findings. Two active findings touch the root path from unchanged consumers (`opening-cohort-runner.js`, `session-opening-runner.js`); both are pre-existing RF04-F04 records counted in the same 955. Exact GM transition `8a8741b10098f1133f6eddaaea564be46205579c1f50f39ba81ccc95f524ae71` was retired and preserved in `C12-RETIRED.json`. Root compatibility location assignment `c325db32238f8b8c337062787e8ae4e65a4825ea09c608e1929644917ae839d7` remains active. **51** RF05-F04 assignments remain.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Roll back only the C12 commit; preserve all prior work and existing user edits. Hashes and results: [`C12-RUN.json`](C12-RUN.json).
