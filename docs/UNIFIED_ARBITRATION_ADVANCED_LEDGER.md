# Advanced unified arbitration execution ledger

Owner revised package 2026-10-16. Read handoff then revised plan in full from preserved `docs/rework/` inputs. Actual starting branch `codex/audience-first-narrative-v9`, HEAD `a20f40b85e30a21fc95773582626df8781c03161`, tracked tree clean, owner rework files untracked/preserved. Origin fetched successfully; HEAD/origin ahead/behind 0/0. No reset, rebase, merge or old-checkpoint checkout. App `0.0.0.1`, schema 460.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes. Supported GM-owned decisions may be autonomous; optional PC choices, proxies, privacy, rules, receipts and administrator policy remain native boundaries.

## Qualification and rollout policy

UA6–UA16 use focused tests and independent local commits. The supplied package requires UA17 frozen-tree full offline qualification, then UA18 exact-SHA origin/CI proof before UA19 installation. Owner authorizes push/deployment; authorization does not waive these explicit prerequisites. No partially qualified installation, force push, silent flags, raw-SQL policy changes or automated paid/Discord gameplay tests. Revised handoff specifically authorizes matching-instance controlled restart and changed command registration at UA19; historical stopped/running evidence must be rediscovered then. Production has not been inspected or modified in this execution.

Rules consulted: local `DAGGERHEART_MULTIPLAYER_CORE.md` and `MULTIPLAYER_GM_RULES.md`; official [SRD 2.0 August 2026](https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf), Core GM Mechanics (printed pp.86–87). Native GM d20/Evasion/critical/cost and player-owned reaction distinctions are retained. Feature-specific ambiguity stays explicit review, not an invented house rule.

## UA6 — source inventory and unsupported-route gate

Starting SHA above. Implemented immutable code-owned catalog/compiler: 41 adversaries/104 occurrences, 16 environments/48 occurrences; **152 total, 151 review_only + 1 needs_authoring**. No textual special feature is falsely declared supported. Eleven representative metadata descriptors identify distinct timing, target, roll protocol and declared costs, with planned—not executable—handler IDs. Original prose unchanged. Entire actor stats and exact feature strings are pinned; altered/missing/duplicate content fails closed. Existing standard attacks and previously qualified routes are separate and unchanged.

New source: `native-feature-definitions.json`, `native-feature-catalog.js`; common `adjudicateSceneBoard` uses registered/unregistered feature diagnostics without granting execution. Coverage document lists all 152 keys and source-hash prefixes; full hashes/source paths remain in code-owned JSON. No schema/database migration or new RNG/provider call. Candidate admin import diff inspected only; not applied blindly, UA16 remains pending.

Red-first `cd bot; node --import ./scripts/offline-guard.mjs --test --test-name-pattern='^UA6' scripts/gm-unified-arbitration-test.mjs`: exit 1, **0/4** (missing catalog module). Same four cases after implementation: exit 0, **4/4**, no skip/todo. Full directly impacted arbitration module: exit 0, **37/37**, no skip/todo, 14402.7771 ms. Tests assert real private decision rows, no cost receipt, unchanged PC resources and Fear, zero unsupported RNG; malformed descriptor/model status cannot authorize execution. Original test assertions unchanged.

One initial sync/check invocation from repository root failed (missing root scripts/package); it did not validate anything. Corrected `bot/` invocation results recorded below. Full mandatory validation deliberately deferred to UA17 per lean policy, not claimed green for this new tree. No push/CI/deploy/production/credentials/live requests/billable automated tokens.

Rollback: revert UA6 source commit while preserving native DB/outbox; catalog only adds code-owned inventory/read-only diagnostics and does not alter saved native effects. Next: UA7 trigger/cost contracts; no reaction feature is execution-qualified yet.

Corrected `cd bot; node scripts/sync-release.mjs 0.0.0.1`: exit 0, 738 files. `cd bot; npm run check`: exit 0, 411 modules/scripts, 24 command schemas. `git diff --check`: exit 0. UA6 focused gate complete; commit SHA is the next independently reviewable commit in this ledger's Git history. Final release qualification and UA18/UA19 remain pending.
