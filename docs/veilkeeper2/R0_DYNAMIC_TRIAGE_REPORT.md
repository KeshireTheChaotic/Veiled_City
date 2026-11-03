# R0 — dynamic record use triage (analysis slice; holds remain open)

`bot/tooling/veilkeeper2/triage.mjs` mechanically groups the 1,009 dynamic/unfiltered uses from RECORD_CONTRACTS.json into DYNAMIC_RECORD_TRIAGE.json: keyed-read 626, forwarding-wrapper 118, city-record-write-spread-kind 194, city-record-write-dynamic-kind 16, world-event-write 17, list-read 38.

What this establishes: 664 uses (keyed/list reads) are read lookups that need only a read-only legacy adapter; 135 forwarding/world-event writes need per-wrapper resolution to real call sites; 210 city-record writes (194 spread-kind, 16 dynamic-kind) are the real migration risk because the written kind comes from a spread object or variable.

What it does not do: no record is classified public, migrated or granted authority; no hold is released. The 1,009 remain release/removal holds until each writer's kind set is resolved and a typed projection is proved.

Test: r0-triage.test.mjs 1 passed (grouping). Generation exit 0 on the pinned RECORD_CONTRACTS.json.

Update: DYNAMIC_RECORD_TRIAGE.json now lists, for the 85 files containing city-record writers (210 uses), the literal kind: strings in each file as a bounded candidate set. This is not proof of what is written: spread objects may carry kinds from other modules. Files with no literal candidate (kind fully external, highest-risk holds): bot/src/frameworks/daggerheart/environment-access-rules.js, bot/src/frameworks/daggerheart/environment-witness-rules.js, bot/src/frameworks/daggerheart/mixed-condition-rules.js, bot/src/frameworks/intent/review-action.js, bot/src/frameworks/operations/ai-review.js. Test: r0-triage 2 passed.

Update (source-resolved writers): the five files with no literal candidate are resolved by reading the source (RESOLVED_WRITERS in triage.mjs, with evidence lines): environment-access (native_environment_admission), environment-witness (native_environment_witness_accounts), mixed-condition (record kinds pc_native_condition/native_mixed_condition; event kinds native_pc_condition/native_mixed_condition), review-action (ai_intent in place) and ai-review (closed list of 7 review kinds). Kind sets are closed; payloads stay read-only holds. Test: r0-triage 3 passed.

Next: resolve the remaining 80 writer files' spread/variable kinds against their per-file candidates, then the 118 forwarding wrappers. Original next item: resolve the 210 city-record writers' kind sets by tracing the spread/variable source to literal kinds.


