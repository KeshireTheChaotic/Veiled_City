# Observed integration registry — RF00

Generated from current source; proposals are not implemented/public APIs. Pair names are alphabetical. Every record's complete edges and injected db callsites are in DEPENDENCY_GRAPH.json. Do not create all pairs as empty directories. Review each at its owning migration slice; RF01-F05 defines exact contracts/lifecycle/consumer tests before implementation.

Observed directions are dependency directions, not proof of bidirectional runtime traffic. Injected storage calls have no module import and still require an owned port/mapping. Application orchestration and telemetry wiring must not be hidden in pairs.

All pairs: validation preserves original principal/source/audience/session/revision/receipt fields; mapping may not expand authority. Lifecycle is plan → contract → fresh boundary test → implementation → remove old edge; deletion gate RF07-F03. Current consumers are the complete graph callsites, not fabricated new APIs.

| Proposed pair | Import direction/count | Injected db calls | First actual evidence | State |
|---|---|---|---|---|
| ai-provider--knowledge | ai-provider → knowledge: 1 | 0 | bot/src/prompt-budget.js:3 | PROPOSED; no API exists |
| ai-provider--operations | ai-provider → operations: 1 | 0 | bot/src/generation-feedback.js:2 | PROPOSED; no API exists |
| character--daggerheart | character → daggerheart: 1; daggerheart → character: 1 | 0 | bot/src/character-observation.js:7 | PROPOSED; no API exists |
| character--discord | discord → character: 1 | 0 | bot/src/pvp-menu.js:10 | PROPOSED; no API exists |
| character--narrative | narrative → character: 3 | 0 | bot/src/concept-context.js:5 | PROPOSED; no API exists |
| character--persistence | injected storage only | 74 | bot/src/character-export.js:46 | PROPOSED; no API exists |
| character--publication | publication → character: 2 | 0 | bot/src/handout.js:3 | PROPOSED; no API exists |
| character--session | character → session: 2 | 0 | bot/src/character-observation.js:3 | PROPOSED; no API exists |
| character--world | world → character: 1; character → world: 2 | 0 | bot/src/autonomous-world.js:17 | PROPOSED; no API exists |
| content--intent | content → intent: 1 | 0 | bot/src/content-packages.js:6 | PROPOSED; no API exists |
| content--persistence | injected storage only | 10 | bot/src/content-packages.js:46 | PROPOSED; no API exists |
| content--world | content → world: 3 | 0 | bot/src/content-packages.js:3 | PROPOSED; no API exists |
| daggerheart--discord | discord → daggerheart: 16 | 0 | bot/src/pvp-menu.js:8 | PROPOSED; no API exists |
| daggerheart--intent | intent → daggerheart: 53; daggerheart → intent: 61 | 0 | bot/src/ai-intents.js:16 | PROPOSED; no API exists |
| daggerheart--knowledge | daggerheart → knowledge: 18 | 0 | bot/src/consent-native.js:2 | PROPOSED; no API exists |
| daggerheart--narrative | daggerheart → narrative: 101; narrative → daggerheart: 10 | 0 | bot/src/gm-action-capability.js:2 | PROPOSED; no API exists |
| daggerheart--npc | daggerheart → npc: 4 | 0 | bot/src/consent-native.js:10 | PROPOSED; no API exists |
| daggerheart--operations | daggerheart → operations: 11 | 0 | bot/src/gm-action-review.js:8 | PROPOSED; no API exists |
| daggerheart--persistence | persistence → daggerheart: 1 | 1955 | bot/src/db.js:24 | PROPOSED; no API exists |
| daggerheart--publication | daggerheart → publication: 15; publication → daggerheart: 19 | 0 | bot/src/mechanical-native-v9.js:5 | PROPOSED; no API exists |
| daggerheart--session | daggerheart → session: 71; session → daggerheart: 17 | 0 | bot/src/action-consent.js:3 | PROPOSED; no API exists |
| daggerheart--world | daggerheart → world: 115; world → daggerheart: 43 | 0 | bot/src/action-consent.js:5 | PROPOSED; no API exists |
| discord--narrative | discord → narrative: 1 | 0 | bot/src/pvp-menu.js:11 | PROPOSED; no API exists |
| discord--operations | discord → operations: 4; operations → discord: 1 | 0 | bot/src/discord/interaction-lifecycle.js:2 | PROPOSED; no API exists |
| discord--persistence | injected storage only | 42 | bot/src/pvp-menu.js:35 | PROPOSED; no API exists |
| discord--publication | publication → discord: 4; discord → publication: 2 | 0 | bot/src/publication-outbox.js:3 | PROPOSED; no API exists |
| discord--session | discord → session: 2 | 0 | bot/src/pvp-menu.js:5 | PROPOSED; no API exists |
| discord--world | discord → world: 1 | 0 | bot/src/pvp-menu.js:7 | PROPOSED; no API exists |
| intent--knowledge | intent → knowledge: 8; knowledge → intent: 5 | 0 | bot/src/ai-intents.js:14 | PROPOSED; no API exists |
| intent--narrative | intent → narrative: 7; narrative → intent: 3 | 0 | bot/src/ai-intents.js:33 | PROPOSED; no API exists |
| intent--npc | intent → npc: 5; npc → intent: 1 | 0 | bot/src/ai-intents.js:6 | PROPOSED; no API exists |
| intent--operations | operations → intent: 2 | 0 | bot/src/ai-review.js:2 | PROPOSED; no API exists |
| intent--persistence | injected storage only | 227 | bot/src/action-dependency.js:50 | PROPOSED; no API exists |
| intent--publication | intent → publication: 1; publication → intent: 2 | 0 | bot/src/gm-unified-arbitration.js:29 | PROPOSED; no API exists |
| intent--session | session → intent: 9; intent → session: 21 | 0 | bot/src/action-continuation.js:3 | PROPOSED; no API exists |
| intent--world | intent → world: 18; world → intent: 11 | 0 | bot/src/ai-intents.js:4 | PROPOSED; no API exists |
| knowledge--narrative | knowledge → narrative: 6; narrative → knowledge: 16 | 0 | bot/src/entity-memory.js:3 | PROPOSED; no API exists |
| knowledge--npc | knowledge → npc: 3; npc → knowledge: 1 | 0 | bot/src/evidence-custody.js:7 | PROPOSED; no API exists |
| knowledge--operations | operations → knowledge: 2; knowledge → operations: 3 | 0 | bot/src/ai-review.js:9 | PROPOSED; no API exists |
| knowledge--persistence | persistence → knowledge: 5 | 261 | bot/src/db.js:10 | PROPOSED; no API exists |
| knowledge--publication | publication → knowledge: 6; knowledge → publication: 1 | 0 | bot/src/discovery-delivery.js:2 | PROPOSED; no API exists |
| knowledge--session | session → knowledge: 10; knowledge → session: 7 | 0 | bot/src/dialogue-continuity.js:2 | PROPOSED; no API exists |
| knowledge--world | world → knowledge: 14; knowledge → world: 18 | 0 | bot/src/autonomous-world.js:4 | PROPOSED; no API exists |
| narrative--npc | narrative → npc: 3; npc → narrative: 2 | 0 | bot/src/narrative-authority.js:15 | PROPOSED; no API exists |
| narrative--operations | narrative → operations: 2 | 0 | bot/src/narrative-completeness.js:3 | PROPOSED; no API exists |
| narrative--persistence | persistence → narrative: 1 | 400 | bot/src/db.js:9 | PROPOSED; no API exists |
| narrative--publication | narrative → publication: 6; publication → narrative: 16 | 0 | bot/src/concept-context.js:6 | PROPOSED; no API exists |
| narrative--session | session → narrative: 4; narrative → session: 27 | 0 | bot/src/dialogue-continuity.js:10 | PROPOSED; no API exists |
| narrative--world | world → narrative: 22; narrative → world: 30 | 0 | bot/src/autonomous-world.js:21 | PROPOSED; no API exists |
| npc--operations | operations → npc: 2; npc → operations: 2 | 0 | bot/src/ai-review.js:4 | PROPOSED; no API exists |
| npc--persistence | persistence → npc: 1 | 113 | bot/src/db.js:16 | PROPOSED; no API exists |
| npc--session | session → npc: 3; npc → session: 3 | 0 | bot/src/dialogue-continuity.js:6 | PROPOSED; no API exists |
| npc--world | world → npc: 17; npc → world: 14 | 0 | bot/src/autonomous-world.js:11 | PROPOSED; no API exists |
| operations--persistence | persistence → operations: 3 | 31 | bot/src/db.js:14 | PROPOSED; no API exists |
| operations--publication | publication → operations: 9 | 0 | bot/src/native-publications.js:9 | PROPOSED; no API exists |
| operations--session | session → operations: 2 | 0 | bot/src/owner-action-terminal.js:3 | PROPOSED; no API exists |
| operations--world | operations → world: 5; world → operations: 5 | 0 | bot/src/ai-review.js:3 | PROPOSED; no API exists |
| persistence--publication | injected storage only | 239 | bot/src/discovery-delivery.js:7 | PROPOSED; no API exists |
| persistence--session | persistence → session: 1 | 482 | bot/src/db.js:17 | PROPOSED; no API exists |
| persistence--world | persistence → world: 1 | 880 | bot/src/db.js:15 | PROPOSED; no API exists |
| publication--session | session → publication: 3; publication → session: 15 | 0 | bot/src/action-continuation.js:12 | PROPOSED; no API exists |
| publication--world | publication → world: 6 | 0 | bot/src/native-hook-output.js:4 | PROPOSED; no API exists |
| session--world | session → world: 23; world → session: 16 | 0 | bot/src/action-continuation.js:6 | PROPOSED; no API exists |

Pre-existing logical integrations narrative--world, session--world and discord--persistence have manifest owners, but their current implementations may include third owners. Those edges remain explicit obligations; no exemption is granted.
