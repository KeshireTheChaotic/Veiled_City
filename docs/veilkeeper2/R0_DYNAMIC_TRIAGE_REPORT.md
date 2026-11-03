# R0 — dynamic record use triage (analysis slice; holds remain open)

`bot/tooling/veilkeeper2/triage.mjs` mechanically groups the 1,009 dynamic/unfiltered uses from RECORD_CONTRACTS.json into DYNAMIC_RECORD_TRIAGE.json: keyed-read 626, forwarding-wrapper 118, city-record-write-spread-kind 194, city-record-write-dynamic-kind 16, world-event-write 17, list-read 38.

What this establishes: 664 uses (keyed/list reads) are read lookups that need only a read-only legacy adapter; 135 forwarding/world-event writes need per-wrapper resolution to real call sites; 210 city-record writes (194 spread-kind, 16 dynamic-kind) are the real migration risk because the written kind comes from a spread object or variable.

What it does not do: no record is classified public, migrated or granted authority; no hold is released. The 1,009 remain release/removal holds until each writer's kind set is resolved and a typed projection is proved.

Test: r0-triage.test.mjs 1 passed (grouping). Generation exit 0 on the pinned RECORD_CONTRACTS.json.

Next: resolve the 210 city-record writers' kind sets by tracing the spread/variable source to literal kinds.
