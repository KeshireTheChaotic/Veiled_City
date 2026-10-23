# RF00 dependency report

{"source_paths":359,"runtime_source_paths":355,"source_modules":359,"unowned":0,"imports":2283,"internal_imports":2121,"projected_import_obligations":1374,"missing_imports":0,"computed_imports":0,"unresolved_aliases":0,"cycle_components":1,"cyclic_modules":211,"proposed_pairs":63}

These are projected migration obligations under the target rules; the current flat tree has not acquired isolation by classification. Import occurrences include re-exports, side-effect imports and literal dynamic imports. Cycles are strongly connected components, not an enumeration of every simple path.

| Current module | Accountable owner | Reverse dependents | Import obligations | Migration action |
|---|---|---:|---:|---|
| bot/src/scene-fiction-context.js | narrative | 129 | 7 | DECOMPOSE_BEFORE_MOVE |
| bot/src/city-calendar.js | world | 121 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/scene-continuity.js | session | 95 | 7 | DECOMPOSE_BEFORE_MOVE |
| bot/src/native-feature-catalog.js | daggerheart | 75 | 2 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/conversation-principal.js | session | 57 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/gm-arbitration-contract.js | intent | 42 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/action-consent.js | daggerheart | 38 | 4 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/city-constraints.js | world | 38 | 3 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/errors.js | operations | 34 | 0 | DECOMPOSE_BEFORE_MOVE |
| bot/src/native-environment-instance.js | world | 33 | 6 | DECOMPOSE_BEFORE_MOVE |
| bot/src/personal-continuity.js | knowledge | 31 | 7 | DECOMPOSE_BEFORE_MOVE |
| bot/src/city-core.js | world | 30 | 2 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/native-environment-capabilities.js | daggerheart | 26 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/ai-intents.js | intent | 24 | 32 | DECOMPOSE_BEFORE_MOVE |
| bot/src/pvp-authority.js | daggerheart | 22 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/pvp-output.js | publication | 22 | 32 | DECOMPOSE_BEFORE_MOVE |
| bot/src/simulation-motivation.js | npc | 22 | 6 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/epistemic.js | knowledge | 19 | 1 | EXTRACT_PORTS_BEFORE_MOVE |
| bot/src/operational-metrics.js | operations | 19 | 0 | PILOT_MOVE_CANDIDATE |
| bot/src/roll-requests.js | daggerheart | 18 | 8 | DECOMPOSE_BEFORE_MOVE |

Component 1: 211 modules. Members and every edge are retained in DEPENDENCY_GRAPH.json.

Lexer limits: calls are syntactic import-binding callsites; object aliases, computed properties, reflective calls and runtime conditional reachability require manual review. Top-level call candidates include initializers, not proof of side effects. Legacy tests/scripts are path/stat-only inventory.
