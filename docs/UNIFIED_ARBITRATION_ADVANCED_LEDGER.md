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

UA6 commit: `35825f3a55df9f03920107c96ca580a527cc0403`.

## UA16 — independently eligible admin-assisted import

Started from UA6 commit. The revised dependency graph explicitly permits UA16 earlier; UA7–UA15 are not claimed complete. Reviewed actual `commands.js`, command schema, character/narrative persistence and interaction receipts against the candidate diff. Did **not** apply its weak cached-member fallback. New optional Discord User `player` requires current GM/admin, a freshly fetched matching member and guild, and a nonbot identity. Default self-import remains unchanged. JSON cannot choose owner. Target registration, new character, optional player narrative, actor/owner/file audit and durable interaction receipt commit atomically. Same display name creates a distinct character, never a transfer. No automatic roster, presence, NPC proxy, hooks delivery or gameplay consent.

Red-first new import group: initial fixture syntax error (not behavioral evidence), corrected fixture then **1/6 passing, 5 failing**, exit 1. After implementation two genuine harness issues were fixed: missing scenePresence import, and expecting thrown permission errors where the real command intentionally delivers `⚠️` errors. Denial and rollback assertions now inspect actual adapter response and database, not an exception assumption. Final targeted group **8/8**, exit 0, no skip/todo, 2073.4427 ms; includes malformed sheet/empty/oversize narrative, persistence/audit fault rollback, wrong guild/member/bot/nonadmin denial, actual owner list/sheet and foreign selection, same-name ownership, restart and delivery failure replay. Real command adapter and disposable SQLite only; fetch double restricts exact synthetic attachment URLs; no Discord/provider traffic.

Changed production files: `command-definitions.js`, `commands.js`. Reused existing native import, narrative, audit, interaction queue and receipt services; no new schema. Command re-registration is required at UA19, not performed here. Saved same-ID import receipt closes the commit-before-response crash gap. Existing native owner selection remains required after import. Full release qualification/CI/production still pending; owner authorization does not make a local test a deployed feature.

Directly impacted original interaction lifecycle + operations regression modules: **2/2 module wrappers**, exit 0 (internal assertion count not inferred), 690.7005 ms. Manifest sync: exit 0, 738 files. `npm run check`: exit 0, 411 modules/scripts and 24 command schemas including optional User import option. Diff-check: exit 0. UA16 focused gate passed; final mandatory release gate remains UA17. Rollback is source-only with owner/history/receipt preservation; never undo a legitimate import by restoring an old database.

UA16 commit: `fae7c47c49a316ca3cdfd4c0f4265dd04c36a026`.

## UA7 — IN PROGRESS; prerequisite incoming-proof repair

During timing/damage-hook review, found a genuine positive native-authority defect: `validateIncomingDamageApplication` still required `source_id=gm:<human>` and a human owner-authored source even for an already legitimately native-AI-authorized attack. Applying damage could succeed, but subsequent injury/death-cause/replay validation rejected it. New real native adapter regression UA7 AF01 was **0/1**, exit 1, with `Exact current native incoming effect/source/owner ancestry required.` This is not a forged receipt fixture: native board/GM decision, actual encounter/template/Evasion, affected-owner defense confirmation, saved critical d20/damage, owner Armor choice and terminal injury were all executed through existing services.

Repair reuses the existing `incomingSourceAuthority` validator, which distinguishes verified native AI GM decision/issuer from historical human owner-authored GM sources. No blanket human-review waiver, role flag, fabricated receipt or change to damage arithmetic. Target remains at 6/6 marked HP with native owner death request pending; no death move is selected. Restart reuses the same injury receipt; source retraction rejects presentation/proof without reversing the saved damage or rolling again. Corrected case **1/1**, exit 0. Directly affected arbitration + original PC-effect-authority + original death group: **101/101**, exit 0, 35428.3406 ms, zero skipped/todo. Original tests unchanged.

This prerequisite repair is **not UA7 phase completion**. Event-driven trigger capture, ordered/depth-bounded windows, reaction-vs-spotlight timing and coherent typed feature Fear/Stress costs still need implementation and real adapter regressions. UA8–UA15 and UA17–UA19 remain uncompleted. No special feature was promoted to supported. Do not push/install this as a completed advanced release or claim final full qualification from the prior 126-suite baseline. No new native schema; source-only rollback preserves all damage/cost/death/outbox history. No production, Discord or provider activity.

Prerequisite repair checks: manifest synchronization exit 0 (738 files), `npm run check` exit 0 (411 modules/scripts, 24 command schemas), `git diff --check` exit 0. Next implementation begins at UA7, not UA8 or UA17. Owner rework inputs preserved. Both completed phase commits and this narrow repair remain local; no full-validator/CI/deployment claim.
