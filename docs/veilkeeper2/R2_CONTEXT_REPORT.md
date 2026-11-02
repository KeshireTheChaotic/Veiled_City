# R1/R2 — authenticated sources and scoped inference

**Completed implementation slice; full R1/R2 gates remain open.** Baseline `1ba6c7e15db1a66ba34b36336f31437beffe44d6`; branch `rebuild/veilkeeper2-audience-first`. `git log -1 -- docs/veilkeeper2/R2_CONTEXT_REPORT.md` identifies this checkpoint. Upstream was checked again with `git ls-remote` and still matches the pinned SHA.

## Delivered

- `source-authority.js`: resolves native message, channel, scene, session, actor and attendance records. It verifies authenticated message authorship, current PC ownership or explicit proxy delegation, scene presence, campaign identity and exact recipient sets. Private channels require verified sole-owner readership. Source revalidation detects edited/deleted messages, revoked control, changed attendance/session/scene revisions and changed channel rights. A model cannot provide these native records through its capability arguments. Conversation/proxy control does not imply consent, resource spending or effect authority.
- `context-authority.js`: checks metadata and recursive source visibility before reading text. GM-only, other-player, other-campaign, other-scene, pending-delivery and private-derived records are excluded. Shared ancestry is allowed; cycles/missing ancestors fail closed. Each selected body must match its native revision and SHA-256 content hash. Issued context capabilities are unforgeable and revalidate original sources, dependencies, recipients and NPC control. Actor-specific mode intersects NPC knowledge with audience entitlement and refuses human-controlled NPC portrayal. Testimony retains its epistemic type.
- `model-gateway.js`: provider-neutral one-call prose generation from an issued scoped packet. There is no mandatory classifier, typed intent or second rewrite. Provider errors become bounded error codes; source authority is checked before and after generation. Call count, duration and supplied usage are recorded. The result is an unverified draft, not a permission to publish or a successful effect.
- `publication-queue.js`: deterministic offline publication identities for native drafts and their exact audience. Everything remains `awaiting_review`, unsent and unacknowledged. It revalidates context on inspection. It has no live transport or delivery/knowledge mutation function.
- `rehearsal.js`: composes the new source authority, existing generic kernel, scoped context, provider gateway and no-send queue. Ordinary authored speech reaches one audience-safe inference without requiring a native action. Optional context-selection failure falls back to the authenticated current utterance with no invented recall. Real Discord reader/provider adapters are still not installed.

These files are new under `bot/src/v2/`; no old GM, command, rules, content, schema or publication implementation was changed or deleted. `bot/package.json` adds a focused opt-in selector. GENERIC_NATIVE_API.md and LEDGER.md reflect actual current scope.

## Actual validation

Fresh tests only, with newly authored repository/provider doubles and no network or production DB:

1. `node --test tests/veilkeeper2/r1-source-authority.test.mjs tests/veilkeeper2/r2-context-authority.test.mjs`: **12/12 passed**, zero failed/skipped, **64.1845 ms**, exit 0. Source-authority coverage is six tests and remains current. Evidence: R2_AUTHORITY_TEST_EVIDENCE.json and R2_AUTHORITY_TEST_OUTPUT.txt.
2. After adding the content-hash guard, `node --test tests/veilkeeper2/r2-context-authority.test.mjs tests/veilkeeper2/r1-rehearsal.test.mjs`: **12/12 passed**, zero failed/skipped, **63.3187 ms**, exit 0. This replaces the earlier six context tests with seven current context tests and adds five integration tests. The unchanged source-authority suite was not rerun. Evidence: R2_REHEARSAL_TEST_EVIDENCE.json and R2_REHEARSAL_TEST_OUTPUT.txt.

Final unique current coverage: **18 tests** (6 source + 7 context + 5 integration). Syntax passed for all five new runtime modules and three fresh tests. Tests prove that unauthorized bodies are not fetched or supplied to the provider, including indirect-source and stale-cache attacks. They do not prove general semantic privacy, real Discord channel permissions, human GM-quality, actual provider latency or full mechanical parity. The one-call result is a counted injected-provider invocation, not a live model measurement.

Exact final file hashes: R2_CONTEXT_HASHES.json. The older R1_HASHES.json and CHECKPOINT_HASHES.json remain historical checkpoint evidence; their report/package hashes are not current after later edits.

## Remaining gates and recovery

R1 still needs live-compatible reader/provider adapters and dependency checks. R2 still needs persistent knowledge proposals, evidence-backed observations/identity, weighted recall, correction lineage, separate protected-canon review, imported-hook export coverage and optional generic context-tool wiring. Full GM-private planning and authorized public observations derived from private causes need separate native disclosure proof; current closure deliberately does not grant such disclosure merely because a child is labeled public. Actor-specific packet support is not yet a complete multi-NPC conversational policy.

R3 has no installed rules or effects. R4 material review, repair and natural-language behavior qualification remain open; harmless names in a fake provider response are not evidence of actual model agency fidelity. R5/R6 autonomy and Discord command migration are pending. R7 durability, native atomic commits, send reconciliation and delivered knowledge are pending. Replayed turns currently can repeat inference; only identical offline publication identity is deduplicated. R8 cutover, deletion and independent human evaluation remain required.

No production state changed, no deployment occurred and no migration was run. Rollback is to leave this opt-in library unused while retaining the unchanged original entrypoint. Next exact work: R2 native knowledge repository/authority and context-tool integration, with fresh evidence/revision/claim/canon tests; then R3 deterministic mechanics behind the generic dispatcher. R0 dynamic contract/removal holds remain active.
