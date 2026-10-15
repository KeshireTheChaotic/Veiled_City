# Veiled City 10.2.0 — delegation and narrative quality

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Release behavior

All 41 native operation contracts can be explicitly assigned. Private grants still require both a main grant and an audited private family. Execution still requires native flags, valid expiry, derived risk/review, consent, resources and `max_operations` 1–4 / `max_cost` 0–20. Catalog reports historical `discovery.lookup` as runtime-unavailable; assignment cannot supply a missing executor. No wildcard or automatic full grant.

Existing GM/admin-only `/vc-story delegation json:` endpoint:

```json
{"op":"catalog","page":1}
{"op":"status"}
{"op":"patch","expected_revision":1,"allow_add":["scene.record"]}
{"op":"patch","expected_revision":2,"allow_remove":["scene.record"]}
```

Use the actual status revision and intended permission IDs. Revoking a main permission removes its private dependent. `private_allow_add`/`private_allow_remove` and explicit mode/budget/expiry updates are supported. Stale, unknown, duplicate and malformed patches fail atomically. Legacy full replacement still works. Replies are ephemeral JSON attachments; no new Discord command schema/registration.

The opted-in 10.1 creative lane now deterministically coordinates ordinary playable turns even when the combined planner omits a v8 request. One writer handles scene/NPC/investigation/arrival/combat/continuation objectives coherently. Direct read-only observations remain one writer without a router. Durable authoring attempts prevent a second writer on retry/restart. Native receipts and independently valid actions survive unit-local holds.

Four provider output proposals are retained when the native coordinator appends its one creative task. The internal composer accepts this bounded fifth output part; provider schema remains four, narrative units eight, and native execution budgets remain unchanged. Preserving a proposal never authorizes a missing receipt.

NPC packets include bounded audience-entitled native own knowledge/memories, approved public diction and relationships, not unrestricted GM dossiers. Typed NPC speech may address a current visible, native-known PC name/alias; the address grants no PC action or reaction. Names elsewhere remain protected. Director briefs contain revalidated visible source references, not private trigger prose; proposed work remains unresolved.

Typed diagnostics distinguish absent answers, speaker/destination/investigation/combat/Director coverage, held units, sibling salvage, camera misframing, source misses and repeated short text. Existing GM operational reports expose aggregate counters and actual measured receive-to-substantive-ack percentiles. These are health proxies, not semantic certainty or literary scores. No model judge or health-triggered provider request.

## Configuration and activation

Optional environment overrides (unset by default):

- `OPENAI_NARRATIVE_MODEL`: isolated creative writer model, independent of planner selection.
- `OPENAI_NARRATIVE_FAST_MODEL`: only unprotected direct read-only observations; dramatic/protected scenes use the normal writer policy.

Empty overrides preserve historical lane defaults; no model ID, price or latency change is silently prescribed. Production `.env` is not edited by installation. Existing 10.1 flags remain explicit authenticated GM operations; no new flags or database schema migration. Schema remains 460. See [10.1 activation](NARRATIVE_AUTHORITY_RELEASE.md); granting operations does not enable flags. No paid/live prose canary is part of qualification.

## Operational qualification and rollout

Exact phase/test/CI/backup/install receipts are recorded in [execution ledger](DELEGATION_NARRATIVE_QUALITY_EXECUTION_LEDGER.md). Final local qualification: 120/120 suites and 26/26 acceptance rows, network denied, live requests/billable tokens zero. Exact repaired-executable CI [38756452566](https://github.com/KeshireTheChaotic/Veiled_City/actions/runs/38756452566) passed 120/120. Critical registry: 120 suites; 39 optional extended historical matrices remain available via `npm run validate:extended`. All prior mandatory security/native assertions remain registered.

Production preflight found 10.1.0 `a74e73a`, direct Node v24.19.0 and a running bot. Owner stopped it; independent verification confirmed the stop. A fresh WAL-aware backup and disposable restore passed before installation. Qualified repaired executable `3531cb7ba4bab3cd3ff6fe24a50c2fc87b6df8a4` was installed by fast-forward to `codex/delegation-narrative-quality`. All 688 manifest hashes match; SQLite integrity/FK/schema460/counts, DB bytes, `.env`, flags and policy are unchanged. **Installed 10.2.0; bot remains stopped.** Forty existing main grants and 21 private grants, revision 1, remain unchanged. All six creative flags remain OFF; playable narration/scene continuity ON. No authenticated flag activation, production model test, startup or restart was performed. A results-only documentation follow-up has identical executable/test inputs.

Final backup: `D:\Library\Backups\Veiled_City\delegation-quality-install-20261015-100445\pre-10.2.0.sqlite`; SHA-256 `9afbc694af6b153e328fdb3e1b7d260eab1f494eaaa71c82cb81c96db2d79c6a`. Integrity/FKs/schema/counts and disposable restore passed; access-controlled outside the repository.

## Rollback

Before any installation or rollback, obtain a fresh protected online SQLite backup with the existing `production-backup.mjs`, integrity/FK/schema/count/hash checks and disposable restore. Do not raw-copy an active WAL database or delete WAL/SHM. Preserve production edits, credentials and current runtime state.

For code regression, with the bot safely stopped and tree inspected, switch production to qualified 10.1.0 branch `codex/narrative-authority-emergence` at `a74e73a4242177a29ad6473ed1b3cf92c1ec8735` (or its qualified executable ancestor `b8004a8559b9dad879c0feb627f92cc2fba10a86`). Do not reset campaign SQLite. New source/event records remain history; hold incompatible queued prose for review, never replay dice/costs/Fear or blindly resend uncertain delivery.

Restore delegation policy only through an authenticated revision-bound operation, preserving unrelated grants. Revert model overrides through normal operator configuration, or disable the affected creative flag through authenticated `/vc-city flags`. Database restore is a separate explicitly reviewed incident operation: first preserve post-incident legitimate events/outbox and repeat restore verification. A pre-release database restore can erase subsequent play; it is not routine code rollback.

With a fresh backup, bot stopped and clean production tree, exact code rollback on this host is:

```powershell
$vcGit='C:\Users\Keshi\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe'
& $vcGit -C 'D:\Library\Veiled City' status --short
& $vcGit -C 'D:\Library\Veiled City' switch --detach a74e73a4242177a29ad6473ed1b3cf92c1ec8735
& $vcGit -C 'D:\Library\Veiled City' rev-parse HEAD
```

Do not run the switch over unresolved production edits; preserve/reconcile them first. This switches code only, never restores SQLite or starts the bot. Existing delivered/uncertain publications and native outcomes must remain intact.

## Remaining limitations

Fresh generated English retains residual semantic risk. Typed proofs, native outcomes, privacy checks and finite lexical tripwires do not prove arbitrary prose universally safe or good. Native-known leading vocatives are intentionally conservative; unseen/unknown names and ambiguous PC assertions are held. Private NPC motives are omitted rather than entrusted to public writer discretion. No live prose quality, cost, latency or cache improvement is claimed from synthetic fixtures. Organic owner-controlled play remains the live evaluation step.

The intermittent Ubuntu context-test failure was traced to a fixture expecting all optional facts on an over-budget page to be selected despite random UUID ordering. A deterministic reproduction showed honest budget omission, retained native locator and successful exact-source expansion. The guaranteed-fit fixture retains its original recovery/privacy assertions; a new over-budget contrast verifies omission/locator/recovery/privacy without changing application retrieval or budgets. Failure reporting retains both bounded redacted stdout/stderr and a sanitized fixture-only JSON artifact; all mandatory assertions remain required. See the ledger for exact requalification receipts.
