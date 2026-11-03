# R0 — dynamic record use triage (analysis slice; holds remain open)

`bot/tooling/veilkeeper2/triage.mjs` mechanically groups the 1,009 dynamic/unfiltered uses from RECORD_CONTRACTS.json into DYNAMIC_RECORD_TRIAGE.json: keyed-read 626, forwarding-wrapper 118, city-record-write-spread-kind 194, city-record-write-dynamic-kind 16, world-event-write 17, list-read 38.

What this establishes: 664 uses (keyed/list reads) are read lookups that need only a read-only legacy adapter; 135 forwarding/world-event writes need per-wrapper resolution to real call sites; 210 city-record writes (194 spread-kind, 16 dynamic-kind) are the real migration risk because the written kind comes from a spread object or variable.

What it does not do: no record is classified public, migrated or granted authority; no hold is released. The 1,009 remain release/removal holds until each writer's kind set is resolved and a typed projection is proved.

Test: r0-triage.test.mjs 1 passed (grouping). Generation exit 0 on the pinned RECORD_CONTRACTS.json.

Update: DYNAMIC_RECORD_TRIAGE.json now lists, for the 85 files containing city-record writers (210 uses), the literal kind: strings in each file as a bounded candidate set. This is not proof of what is written: spread objects may carry kinds from other modules. Files with no literal candidate (kind fully external, highest-risk holds): bot/src/frameworks/daggerheart/environment-access-rules.js, bot/src/frameworks/daggerheart/environment-witness-rules.js, bot/src/frameworks/daggerheart/mixed-condition-rules.js, bot/src/frameworks/intent/review-action.js, bot/src/frameworks/operations/ai-review.js. Test: r0-triage 2 passed.

Update (source-resolved writers): the five files with no literal candidate are resolved by reading the source (RESOLVED_WRITERS in triage.mjs, with evidence lines): environment-access (native_environment_admission), environment-witness (native_environment_witness_accounts), mixed-condition (record kinds pc_native_condition/native_mixed_condition; event kinds native_pc_condition/native_mixed_condition), review-action (ai_intent in place) and ai-review (closed list of 7 review kinds). Kind sets are closed; payloads stay read-only holds. Test: r0-triage 3 passed.

Update (8 more source-resolved writers): environment-recovery, historical-archive, encounter-activation, database.js (goal_state writer), long-projects, minor-npc-service, reviewed-authoring and session-opening-runner (partial: row origin through helpers not re-traced) are now in RESOLVED_WRITERS. Resolved: 13 files / 16 uses; unresolved: 72 files / 194 uses. IMPORTANT FINDING: the per-file literal candidate set is unreliable (wrong for environment-recovery, historical-archive, encounter-activation and database.js, where the written kind is a constant/read-spread of a different kind). Do not use candidates as resolution; only RESOLVED_WRITERS entries (source-read) close a kind set.

Update (partial resolutions + review aid): spreadOrigin() in triage.mjs shows the nearest earlier assignment of a spread variable as a review aid. pvp-fear-move, pvp-brawl, pvp-agreement and scene-action-window are recorded as PARTIAL (traced kinds only; untraced lines named in the evidence). Status: fully resolved 12 files/15 uses; partial 5 files/38 uses; unresolved 68 files/157 uses. Test: r0-triage 4 passed.

Update (batch 3, partial): incoming-attack, native-publications, city-core, pvp-damage, city-civic, action-continuation and autonomous-world recorded as PARTIAL with traced kinds. Status: fully resolved 12 files/15 uses; partial 12 files/80 uses; unresolved 61 files/115 uses.

Update (batch 4): consequences, commitments, strategy, contact-groups and opening-attendance fully resolved; session-opening and memory-lifecycle partial. Status: fully resolved 17 files/31 uses; partial 14 files/87 uses; unresolved 54 files/92 uses.

Update (batch 5): nine more files fully resolved (gm-action-review, gm-ruling, assembly-planning, session-opening-recovery, encounter-grounding, fresh-npc-authoring, seed-drafts, owned-community, scene-setup) and five partial. Status: fully resolved 26 files/53 uses; partial 19 files/102 uses; unresolved 40 files/55 uses.

Update (batch 6): 19 more files fully resolved and 9 partial. Status: fully resolved 46 files/77 uses; partial 27 files/117 uses; unresolved 12 files/16 uses. Remaining unresolved writers are windows/narrative/typed-roll files whose rows come from helper functions or null-initialized variables and need hand tracing.

Update (forwarding wrappers): isPureForwarder() verifies that each of the 118 forwarding wrappers spreads its own enclosing rest parameter and nothing else (118/118 pure; a spot-check of six showed real pass-through functions and capability-injection arrows). A pure forwarder adds no record kind; its kinds are decided at its callers, which are already counted among the 2,911 callsites. Wrappers therefore need no separate migration decision, but injected capability functions remain part of each rule factory's port. Test: r0-triage 5 passed.

Update (batch 7): typed-roll-execution and narrative-salience fully resolved; condition-recovery, typed-intent-persistence and pvp-profile partial. Status: fully resolved 48 files/81 uses; partial 30 files/120 uses; unresolved 7 files/9 uses.

Next: close the partial entries' untraced lines, resolve the last unresolved writers, then trace the 118 forwarding wrappers to real call sites. Original item: resolve the remaining unresolved writer files' spread/variable kinds against their per-file candidates, then the 118 forwarding wrappers. Original next item: resolve the 210 city-record writers' kind sets by tracing the spread/variable source to literal kinds.










