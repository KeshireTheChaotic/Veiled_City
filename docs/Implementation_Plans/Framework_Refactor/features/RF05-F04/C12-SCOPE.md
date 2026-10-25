# RF05-F04 C12 — Operations metrics public API

## Objective

Move `operational-metrics.js` byte-identically to `frameworks/operations/operational-metrics.js`, publish its existing exports through Operations public, and switch the GM to that API. Retain the root module as a compatibility re-export so all current consumers share one `OperationalMetrics` class, singleton, and trace integration.

## Behavioral and authority contract

Preserve bounded process-local aggregation, pricing parsing, metrics fields, trace timing/retry accounting, redaction, and all return/error behavior. Telemetry stays diagnostic-only: no narrative, game authority, audience, native mechanic, or receipt changes. The moved metrics module must use the Operations-owned trace instance.

Retire only GM transition `8a8741b10098f1133f6eddaaea564be46205579c1f50f39ba81ccc95f524ae71` after GM imports Operations public. Preserve the record. Keep the assigned root-location transition for compatibility.

## Verification

Create `bot/tests/ai-gm-2026-10/rf05-f04-c12.test.mjs`. Import the real GM service; verify root/public identities; exercise telemetry recording inside an async-local turn trace and confirm retry/stage accounting; ensure arbitrary prompt content is not retained in snapshots; verify GM imports Operations public. Run one frozen blocking union with all fresh tests affected by `gm.js`; never run inherited telemetry suites. Syntax-check changed JavaScript/MJS and run the RF05 architecture ratchet. No provider calls, network, production data, broad validation, or polling.

## Exit evidence

Record source/test hashes, exact test and architecture results, compatibility consumers and root-location hold, remaining F04 assignments, costs, rollback, and release status. This does not complete RF05-F04 or RF05.
