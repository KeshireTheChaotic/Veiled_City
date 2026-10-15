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

Exact phase/test/CI/backup/install receipts are recorded in [execution ledger](DELEGATION_NARRATIVE_QUALITY_EXECUTION_LEDGER.md). Critical registry: 120 suites; 39 optional extended historical matrices remain available via `npm run validate:extended`. All prior mandatory security/native assertions remain registered.

Production preflight on 2026-10-15 found clean 10.1.0 `a74e73a`, direct Node v24.19.0, but **running** PID 7408 with working directory `D:\Library\Veiled City\bot`. Prior stopped-state evidence is no longer current. Installation must not mix old loaded modules with new dynamically imported files. Owner was notified to stop the bot; this task neither starts nor silently restarts it. Production SQLite inspection was read-only. Forty existing main grants and 21 private grants, revision 1, remain unchanged. All six creative flags were OFF; playable narration/scene continuity ON. No authenticated flag activation has been performed.

## Rollback

Before any installation or rollback, obtain a fresh protected online SQLite backup with the existing `production-backup.mjs`, integrity/FK/schema/count/hash checks and disposable restore. Do not raw-copy an active WAL database or delete WAL/SHM. Preserve production edits, credentials and current runtime state.

For code regression, with the bot safely stopped and tree inspected, switch production to qualified 10.1.0 branch `codex/narrative-authority-emergence` at `a74e73a4242177a29ad6473ed1b3cf92c1ec8735` (or its qualified executable ancestor `b8004a8559b9dad879c0feb627f92cc2fba10a86`). Do not reset campaign SQLite. New source/event records remain history; hold incompatible queued prose for review, never replay dice/costs/Fear or blindly resend uncertain delivery.

Restore delegation policy only through an authenticated revision-bound operation, preserving unrelated grants. Revert model overrides through normal operator configuration, or disable the affected creative flag through authenticated `/vc-city flags`. Database restore is a separate explicitly reviewed incident operation: first preserve post-incident legitimate events/outbox and repeat restore verification. A pre-release database restore can erase subsequent play; it is not routine code rollback.

## Remaining limitations

Fresh generated English retains residual semantic risk. Typed proofs, native outcomes, privacy checks and finite lexical tripwires do not prove arbitrary prose universally safe or good. Native-known leading vocatives are intentionally conservative; unseen/unknown names and ambiguous PC assertions are held. Private NPC motives are omitted rather than entrusted to public writer discretion. No live prose quality, cost, latency or cache improvement is claimed from synthetic fixtures. Organic owner-controlled play remains the live evaluation step.

One initial Ubuntu CI context-suite failure was not reproduced by local CI-mode tests or the subsequent Linux preflight/full run. It remains recorded as an intermittent validation risk, not a claimed source fix. Failure reporting now retains both bounded redacted stdout/stderr and a sanitized fixture-only JSON artifact; all mandatory assertions remain required.
