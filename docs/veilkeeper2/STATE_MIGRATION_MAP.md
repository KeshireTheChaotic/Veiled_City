# State migration obligations

This is the original R0 structural snapshot; current partial adapters are reported in RESUME_HANDOFF.md. Upstream 15a8f adds `native_roll_conditions` and `native_mixed_condition_clear` city-record/evidence obligations and `npc_spotlight_condition_clear` mutation ancestry; SQL schema files are unchanged. Preserve original IDs, source/owner scope, pending odds revisions, paid spotlight receipts and already committed release history. These are explicit R7 migration holds, not implemented projections. See UPSTREAM_15A8F_REPORT.md.

Baseline schema inspection used an isolated in-memory SQLite database only. STATE_SCHEMA.json retains full column/default/foreign-key definitions and statically found migration/SQL sites. Dynamic ALTER calls and JavaScript backfills require individual review; schema execution alone is not a migration dry run.

All tables retain original identifiers, source lineage, ownership, privacy and pending/delivery status. No importer exists yet. No production data was opened. Rollback at this phase is simply retaining the unchanged baseline: no data or runtime conversion occurred.

| Table | Destination | Status |
|---|---|---|
| `audit_log` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `campaign_backups` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `campaign_snapshots` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `campaigns` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `canon_conflicts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `canon_events` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `canon_proposals` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `character_drafts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `character_gm_hooks` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `character_narratives` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `characters` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `city_calendar` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `city_edges` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `city_records` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `city_schedule` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `clocks` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `director_history` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `district_locations` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `downtime_cycles` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `downtime_projects` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `encounter_aftermath` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `encounter_combatants` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `encounters` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `facts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `handouts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `levelup_drafts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `messages` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `mutation_ledger` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `npc_goals` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `npc_knowledge` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `npc_memories` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `npc_profiles` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `npc_proxies` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `operation_receipts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `players` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `publication_outbox` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `published_messages` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `reference_entries` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `relationship_hook_imports` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `relationships` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `rolls` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `rules_rulings` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `seed_catalog` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `seed_documents` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `seed_runs` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `session_characters` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `session_presence` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `sessions` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `simulation_clock` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `simulation_entities` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `simulation_records` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `threads` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `turn_attempts` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `world_event_links` | Read-only legacy projection then explicit R7 mapping | Not implemented |
| `world_events` | Read-only legacy projection then explicit R7 mapping | Not implemented |
