# Session 5 narrative integrity / latency — execution checkpoint

Date: 2026-10-14. Status: **OFFLINE QUALIFIED; READY FOR REVIEW, NOT DEPLOYED**. The original RO-01 stop and intermediate results below are historical evidence, superseded by the authorized snapshot and final qualification checkpoints at the end.

## Source reconciliation

- Read the supplied `CODEX_VEILKEEPER_SESSION5_NARRATIVE_LATENCY_PLAN.md` in full and preserved it unchanged.
- Actual starting local `main` and fetched `origin/main`: `30fb4d83e4c87abc38e3def467a042f64fc1627c`, not the plan's earlier `e136a28` source anchor.
- Created local feature branch `codex/session5-narrative-latency` at that HEAD, retaining the owner's untracked plan.
- The intervening commit implements historical archival, including operational-report and pending-memory projections. Those changes must be retained when resuming Session 5 work.
- Last completed predecessor qualification: 147/147 offline suites at `30fb4d8`, with 26/26 acceptance mappings and both D08 suites. This is a historical completed result, not a newly executed Session 5 qualification.
- Inspected the candidate-claim suites, disclosure validator, state preview/audit, output preparation, GM recovery/routing, configuration and operational timing paths. No gameplay or publication validation has been relaxed.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## RO-01 safety blocker — reproduced, not hypothetical

Only allowlisted deployment configuration keys and filesystem/process metadata were inspected. No credential value, player content, private fact, full production database row or raw process command line was printed or copied into this report.

Deployment `.env` specifies `DATABASE_PATH=./data/veiled_city.sqlite`. Resolving against the known production bot directory identifies the configured candidate, but no running `src/index.js` process was identified and its actual working directory/environment overrides could not be verified. Therefore this is **configured-path evidence**, not proof of the effective live process path.

The candidate's SQLite header reports read/write version 2 (WAL); its main-file size was 15,704,064 bytes. Neither WAL nor SHM sidecar existed. These are metadata observations only; SQLite was **not opened on production**. The current diagnostic identity is not a dedicated read-only OS identity, and the observed ACL contains write-capable grants. No account, permission, ACL or sidecar was changed.

An isolated synthetic SQLite reproduction on Node 24.19.0 demonstrated:

| Stage | Main database | WAL | SHM |
| --- | --- | --- | --- |
| After creating WAL fixture and closing its writable handle | 8,192 bytes | absent | absent |
| While `readOnly:true` + `query_only=ON` reader executes a SELECT | unchanged hash/size | newly created, 0 bytes | newly created, 32,768 bytes |
| After closing that reader | unchanged hash/size | still exists | still exists |

The reproduction executed successfully (exit 0), with `sidecars_created:true`. It establishes that Node read-only/query-only safeguards alone do **not** satisfy the supplied plan's no-production-sidecar-write requirement. The temporary synthetic directory was removed after the test; no campaign fixture was used.

Opening the configured production candidate under the current identity would risk the very sidecar creation prohibited by the plan. No attempt was made to work around this with `immutable=1`, writable opening, permission changes, checkpointing, copying the production main file or making an unauthorized snapshot. In particular, absence of a currently observed bot process is not permission to assume the database is immutable or that no other writer exists.

### Required owner/operator input

Provide a protected, production-managed **consistent SQLite diagnostic snapshot**, with its source path/working-directory provenance, or separately authorize that snapshot operation. The supplied plan expressly reserves its creation for separate approval. Do not use a plain main-file copy if a writer/WAL could exist. An alternative is an already provisioned, verified read-only OS identity/ACL and a compatible reader path that cannot create/modify sidecars; this task did not authorize provisioning one.

Until that input is available, production Session 5 fact/disclosure, ancestry, delivery and assembly forensics are an explicit **evidence gap**. No conclusion is claimed about missing/archived fact versus exact-content mismatch versus audience denial. No private fact content or failed candidate was accessed.

## Configuration discrepancy and API research

Allowlisted deployed `.env` observations: routine GM and router are `gpt-5.6-sol`, main GM is `gpt-6.1-sol`, reasoning is `low`, retries 1, GM deadline 120,000 ms, router deadline 20,000 ms, progress threshold 20,000 ms. These are configured values, not verified live effective values. They differ from the plan's assumed Luna routine/router baseline; no configuration was changed and no latency measurement or price conclusion follows from model names.

Official OpenAI documentation was searched and fetched before any API implementation. The [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) documents the dedicated beta endpoint and JavaScript SDK minimum 7.30.0; this repository currently pins `openai` 6.6.0. A future LAT-02 experiment therefore needs explicit SDK/capability compatibility work and default-off, engagement-only isolation. No SDK upgrade, Decisions request or other paid request was attempted. The documented speed claim is not a Veilkeeper measurement. Also fetched the [latency guide](https://developers.openai.com/api/docs/guides/latency-optimization).

## Ticket status and safe resume

| Ticket | Status |
| --- | --- |
| RO-01 | BLOCKED: strict sidecar-free production inspection is not available; fixture proves the risk |
| NAR-01 | Source inspected; exact live predicate unknown; no production reproduction claimed |
| LAT-01 | Existing telemetry inspected; Session 5 baseline/complete-turn instrumentation not implemented |
| NAR-02–05 | NOT STARTED; native disclosure, output and archive gates unchanged |
| LAT-02–04 | NOT STARTED; no routing, model, reasoning, progress or deadline changes |
| REL-01 | NOT STARTED; no Session 5 full qualification, implementation commit, push or deployment |

Resume on the actual feature-branch HEAD, preserve this checkpoint and the supplied plan, confirm snapshot provenance/read-only boundary, then implement the allowlisted diagnostics reader and synthetic NAR-01/LAT-01 evidence before later tickets. The reader must not instantiate `VeiledDB` on production or expose arbitrary SQL; tests of disallowed writes/DDL/checkpoint/ATTACH belong only on disposable synthetic data or must be rejected before SQLite execution. Use synthetic equivalents of any incident material in committed fixtures.

No runtime/source/test registration was changed, no production SQLite handle was opened, no production data/environment/ACL was modified, no bot/Discord/API was started, and no commit/push/deployment was performed. The branch switch and this evidence-only document are the only task changes. Stop here rather than weakening RO-01 or claiming the remainder implemented.

## Authorized snapshot and offline implementation checkpoint

The owner subsequently authorized a production backup and confirmed `.env` was brought to baseline. A consistent SQLite online backup was made using a raw read-only DatabaseSync handle, never the migrating VeiledDB constructor. Main-file hash, size and modification time remained unchanged. WAL/SHM sidecars were created by the authorized operation and left intact; no checkpoint, deletion or campaign mutation was performed.

- Backup: `C:\Users\Keshi\AppData\Local\VeiledCity\maintenance-backups\session5-diagnostic-20261014.sqlite` (15,704,064 bytes), SHA256 `9e5c8fdafdc5a94893dc79bc44dc57e7ef13dd3fe0199a75b094acdea99eb21f`; quick_check OK.
- A disposable diagnostic copy alone was converted to DELETE journal mode. The new strict reader refuses WAL-mode files before SQLite opening, exposes no SQL handle, uses fixed bounded allowlisted queries and returns redacted metadata only.
- Snapshot Session 5 is ended, auto assembly remains at assembly phase, with no saved assembly plan or assemble receipt in the bounded interval. The referenced fact exists, is unarchived and party-visible. The failed turn is uncommitted with one model attempt. Exact failed candidate bytes are not retained in the bounded inventory: content mismatch is plausible, **not proven**. No private fact text is exported.
- Rechecked allowed configuration now has routine/router `gpt-6-luna`, main `gpt-6.1-sol`, reasoning `low`, deadline 120000 ms, progress 20000 ms. Effective running-process overrides remain unverified. Configuration was not changed by this task.
- Red-first diagnostics: missing module failed, then 3/3 synthetic tests passed. Red-first latency primitives: missing module failed, then 2/2 tests passed. Neither result is end-to-end runtime or live latency qualification.
- Narrative integration reproductions added before behavior changes; original strict publication and native effect gates remain intact. Complete offline validation has not yet run on this working tree. No implementation commit, push, deployment, bot launch or billable call has occurred.

## Implementation and focused evidence (qualification pending)

Current feature branch remains based on `30fb4d83e4c87abc38e3def467a042f64fc1627c`; no reset or production deployment. See `SESSION5_OUTPUT_AND_LATENCY_CONTRACT.md` for exact restrictions, configuration and rollback, and `SESSION5_SYNTHETIC_BASELINE.json` for reproducible controlled-clock comparisons.

| Ticket | Implemented scope / evidence |
| --- | --- |
| RO-01 / NAR-01 | Strict snapshot reader and reason codes. Live failure predicate is an explicit evidence gap, not invented from current fact metadata. Diagnostics suite 3/3. Strict party/private visibility, mismatch, archive, missing and ancestry cases added to narrative suite. |
| LAT-01 | Receive/queue/envelope instrumentation, native capture/Director/context/provider/validation/commit/delivery stages; SQL get/all counters, reported usage and bounded GM report. Controlled outbox/queue/progress/SQL tests; no live SLA measurement. |
| NAR-02 | Default-off, actual prepared capability + original roots + held-surface separation; no recovery for mechanical dependencies, NPC/other-PC knowledge or arbitrary composed prose. Both actual GM/commit/restart paths need one synthetic provider request. |
| NAR-03 / NAR-04 | Default-off typed environmental and ephemeral grammar, authenticated current read request, complete recipient/source revisions, specific limitation, post-projection recovery counter. A newly added environmental-class smuggling test first failed against the initial implementation, then passed after exact semantic composition proof was required. Original production P0 assertions were not weakened. |
| NAR-05 | GM assembly readiness guidance/counts; saved plan reuse remains native/idempotent. Neutral archive excerpts labeled honestly. New scene fact/ancestry archive revocation test first failed, then passed after certificate closure included facts. |
| LAT-02 | Existing direct-mention and explicit-silence zero-router paths preserved. Bounded Decisions shadow uses current SDK raw dedicated endpoint/injected fetch, never changes actual route. Director causality retained. |
| LAT-03 / LAT-04 | Runtime effort/model/output budget unchanged. Offline-only none request variant; no model quality claim. Configurable truthful progress covers processing/delivery, deduplicates callback and stops on terminal envelope. |
| REL-01 | Four new suites registered, all 147 predecessor suites retained. Full synchronized-tree qualification is the next gate. |

### Root cause matrix

| Reproduction | Missing boundary / repair |
| --- | --- |
| Rejected held disclosure aborted otherwise independent output | Original annotation audit was fatal even after private quarantine; now narrowly capability-bound separation, original dependency roots and complete sibling audit. |
| Scene/situation candidate became neutral | Candidate responsiveness preceded native projection; new source-bound scene answer is checked/recomposed at actual publication preparation. |
| New environment label could smuggle PC effects | A GM/category label is not semantic authority; exact closed observation composition now reconstructs every admitted fact byte. |
| Revoked scene fact returned through recap | Archive closure did not include this new lane's fact references; referenced fact/ancestry hashes now revalidate without rewriting mechanics. |
| Auto assembly without opening | Snapshot has no plan/assemble receipt; check-in is not assembly. Status now points to existing idempotent command. |
| Model timing omitted queue/Director/commit/delivery | New async-local receive-to-native-ack trace; no SQL/text/owner IDs retained. |

### Executed T0 / T1 results

- Initial new narrative reproduction file: red before behavior changes (4 NAR02 tests and 4 scene/situation cases); focused NAR02 then 4/4 green. Initial missing-reader and missing-trace imports were red before their modules existed.
- New real-outbox timing test: 4 pass / 1 fail before delivery instrumentation, then green. New routing module test was red (missing module), then 9/9 green. OOC fixture corrected to preserve the **existing** zero-call silence path, not force a router call.
- Scene fact-label smuggling: 0/1 green initially; actual unsafe private payload reproduced. Fixed with typed exact environmental composition. Archive revocation: 1 pass / 1 fail initially, then 2/2 green. Neither defect was deployed.
- Latest narrative suite executed: 18/18 pass. Earlier joint focused execution before the last three narrative additions: 33/33 pass. Final combined expected inventory is 36 tests; report final executed count below, not inferred here.
- Impacted original candidate-quarantine, candidate-audit, SEM06, PvP authorship and fresh-authoring suites: **113/113 tests passed**, zero skipped.
- Impacted operations, routing efficiency and publication suites: **49/49 tests passed**, zero skipped (before final fact-closure hardening; full final validation remains mandatory).
- Controlled benchmark executed successfully: disabled recovery failed after **2** provider dispatches, enabled recovery delivered after **1**; one controlled successful first-substantive sample at 7000 ms. No successful baseline latency exists, and this does not prove a live speedup. No usage returned: token cost unknown, not zero-priced usage.
- Quality and format checks executed successfully during development. Full check/manifest/validator results are not yet claimed here.

### Persistence, privacy and limitations

No schema migration, campaign record rewrite, native resource/dice/Fear change or historical outcome reversal. City records store native part proofs and existing private quarantine; metrics are bounded, process-lifetime aggregates. Untyped legacy/free-form environmental facts are deliberately ineligible for the new lane, not silently recertified or deleted. Partial/uncertain Discord sends retain existing reviewed recovery. Private scene proof excludes unrelated private PC positions. Original freeform NPC authoring residual semantic risk remains documented, not solved by a model label or this environmental grammar.

Production backup sidecars remain untouched after the separately authorized backup. No paid API, Discord, bot process, command registration, push, merge or deployment was performed. The latest allowlisted `.env` baseline is acknowledged; no source patch edits production configuration.

### Initial T2 failure and correction

Manifest synchronized at version 10.0.0 (646 non-runtime files). `npm run check` and `git diff --check` passed. First complete validator attempt stopped at **26 passed / 1 failed / 124 not run** (`narrative-contract-test`): optional trace instrumentation erroneously compared two undefined guild values, then dereferenced a null trace, masking the original structured-repair failure. This run is **not qualification**. Added a red-first standalone no-guild telemetry regression, then guarded absent traces explicitly with the common guild-trace lookup. Focused no-guild latency plus original narrative-contract tests passed **8/8**, no skipped tests. Final new focused inventory is now 37 tests. Executable changes require manifest resynchronization, check and full validation again.

## Final synchronized-tree qualification

- `node scripts/sync-release.mjs 10.0.0`: exit 0; 646 non-runtime files. Application version remains **10.0.0**.
- `npm run check`: exit 0 on the corrected tree; syntax and command schema checks passed.
- `npm run validate`: exit **0**, **151/151 mandatory suites passed**, **0 failed / 0 not run**, **26/26 acceptance mappings passed**, duration **465126 ms**. Both `d08-window-security-test` and `d08-observability-test` actually executed and passed in this run. Network denied, live requests 0, billable tokens 0. Compact report: local ignored `bot/.reports/offline-validation.json`.
- Final focused command: `node --import ./scripts/offline-guard.mjs --test scripts/session5-diagnostics-test.mjs scripts/session5-narrative-test.mjs scripts/session5-latency-test.mjs scripts/session5-routing-test.mjs`: exit **0**, **37/37 tests**, 0 failed/cancelled/skipped/todo. Actual inventory: diagnostics 3, narrative 18, latency/progress 7, routing/design 9.
- Final controlled benchmark command: `node --import ./scripts/offline-guard.mjs scripts/session5-benchmark.mjs`: exit **0**; assertions confirm failed two-call baseline versus one-call acknowledged recovery, controlled first-substantive time 7000 ms. Token cost remains unknown; no paid comparison or live p50/p95 exists.
- The original narrative red log confirms **2 pass / 6 fail** before implementation. The original six SEM06 and PvP authorship assertions were retained unchanged and ran in full qualification.
- Frozen executable/test manifest subset: **359 files**, SHA256 of the ordered manifest entries `d44ac13641608c9a817014325bfb1f3b87c6cae01d97dd32cbfed73f125cd455`. Results-only documentation/manifest updates after this gate do not change those executable/test inputs. Final manifest integrity and diff checks are recorded in the handoff; no redundant full rerun is needed for results-only prose.

### Release decision and remaining gates

**READY for offline code review and separately authorized opt-in canary; NOT live-qualified or deployed.** Source/test work is isolated on `codex/session5-narrative-latency`, starting from `30fb4d83e4c87abc38e3def467a042f64fc1627c`. The local implementation commit containing this ledger is the source-controlled handoff (its resulting SHA is reported to the owner; a commit cannot contain its own hash).

The configured production model baseline is corrected, but effective running-process overrides are still unverified. The original failed candidate is not present in the bounded snapshot inventory, so its exact predicate remains an explicit evidence gap. No original fact text, private row or credential enters fixtures/reporting. The online backup is consistent and the original main file was unchanged; authorized backup-created WAL/SHM sidecars remain intact.

All three new city output flags and Decisions shadow default off. The environmental lane intentionally requires exact structured proof; legacy free-form setting descriptions are not automatically promoted or migrated. No real model semantics, Decisions account support, live latency/cost savings, unrestricted NPC prose safety or universal roleplay responsiveness is claimed. Luna low remains the runtime baseline. A none-quality experiment and any real Decisions comparison remain separately authorized billable staging work, not automatically enabled production optimizations.

For canary approval: use one opt-in test guild, source-backed environment observations and current public arrival receipts; test both scene prompts and separated private viewpoints, assemble/replay once, inspect `/vc-admin ops`, deliberately revoke one queued source, and verify uncertain deliveries are held. Monitor routine p50/p95, progress frequency, answerless recovery, retries, SQL time and delivery holds against the provisional SLA. Roll back flags/code only; preserve native effects, receipts, certificates and delivery history. No production DB restore, bot start, live command registration, push/merge/deploy or billable call is part of this handoff.

Final staging exposed preexisting Markdown hard-break whitespace and a blank EOF line in the supplied, previously untracked plan. Its original bytes were preserved in a uniquely named local temporary backup. The imported plan's wording is unchanged; four hard breaks use explicit `<br>` and the extra EOF blank line was removed so staged `git diff --check` can pass. This is documentation-only normalization, not a relaxed check or executable/test change.
