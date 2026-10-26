# Canonical integration registry

The executable source is [RF01/BRIDGE_CONTRACTS.json](RF01/BRIDGE_CONTRACTS.json). Current table reconciled at the recorded source checkpoint. Historical observations remain [archived](RF01/RF00_BRIDGE_REGISTRY.md). Lifecycle counts: 16 ADOPTED, 45 PROPOSED_NO_API, 2 CONTRACT_ONLY_UNWIRED. Adopted status applies only to each row's exact qualified direction; other source obligations remain explicit.

| Pair | Status | Contract directions | Consumers / fresh test references | Adoption |
|---|---|---|---|---|
| ai-provider--knowledge | ADOPTED | knowledge → ai-provider | 1 / 1 | RF05-F03 |
| ai-provider--operations | PROPOSED_NO_API | ai-provider → operations | 0 / 0 | RF05 |
| character--daggerheart | ADOPTED | character → daggerheart; daggerheart → character | 2 / 3 | RF03-F01 |
| character--discord | PROPOSED_NO_API | discord → character | 0 / 0 | RF06 |
| character--narrative | PROPOSED_NO_API | narrative → character | 0 / 0 | RF05 |
| character--persistence | PROPOSED_NO_API | character → persistence | 0 / 0 | RF06 |
| character--publication | PROPOSED_NO_API | publication → character | 0 / 0 | RF06 |
| character--session | PROPOSED_NO_API | character → session | 0 / 0 | RF04 |
| character--world | PROPOSED_NO_API | world → character; character → world | 0 / 0 | RF04 |
| content--intent | PROPOSED_NO_API | content → intent | 0 / 0 | RF05 |
| content--persistence | PROPOSED_NO_API | content → persistence | 0 / 0 | RF06 |
| content--world | PROPOSED_NO_API | content → world | 0 / 0 | RF04 |
| daggerheart--discord | ADOPTED | daggerheart → discord | 1 / 1 | RF03-F05 |
| daggerheart--intent | ADOPTED | intent → daggerheart; daggerheart → intent | 2 / 2 | RF03-F01 |
| daggerheart--knowledge | PROPOSED_NO_API | daggerheart → knowledge | 0 / 0 | RF03 |
| daggerheart--narrative | ADOPTED | narrative → daggerheart; daggerheart → narrative | 1 / 2 | RF03-F05 |
| daggerheart--npc | PROPOSED_NO_API | daggerheart → npc | 0 / 0 | RF03 |
| daggerheart--operations | PROPOSED_NO_API | daggerheart → operations | 0 / 0 | RF03 |
| daggerheart--persistence | PROPOSED_NO_API | persistence → daggerheart; daggerheart → persistence | 0 / 0 | RF03 |
| daggerheart--publication | ADOPTED | daggerheart → publication; publication → daggerheart | 1 / 1 | RF03-F05 |
| daggerheart--session | ADOPTED | session → daggerheart | 1 / 1 | RF04-F05 |
| daggerheart--world | ADOPTED | world → daggerheart; daggerheart → world | 3 / 4 | RF03-F05 |
| discord--narrative | PROPOSED_NO_API | discord → narrative | 0 / 0 | RF05 |
| discord--operations | PROPOSED_NO_API | discord → operations; operations → discord | 0 / 0 | RF06 |
| discord--persistence | PROPOSED_NO_API | discord → persistence | 0 / 0 | RF06 |
| discord--publication | CONTRACT_ONLY_UNWIRED | publication → discord | 1 / 2 | RF06-F03 |
| discord--session | PROPOSED_NO_API | discord → session | 0 / 0 | RF06 |
| discord--world | PROPOSED_NO_API | discord → world | 0 / 0 | RF06 |
| intent--knowledge | PROPOSED_NO_API | intent → knowledge; knowledge → intent | 0 / 0 | RF05 |
| intent--narrative | PROPOSED_NO_API | intent → narrative; narrative → intent | 0 / 0 | RF05 |
| intent--npc | PROPOSED_NO_API | intent → npc; npc → intent | 0 / 0 | RF05 |
| intent--operations | PROPOSED_NO_API | operations → intent | 0 / 0 | RF05 |
| intent--persistence | PROPOSED_NO_API | intent → persistence | 0 / 0 | RF05 |
| intent--publication | PROPOSED_NO_API | intent → publication; publication → intent | 0 / 0 | RF05 |
| intent--session | PROPOSED_NO_API | session → intent; intent → session | 0 / 0 | RF05 |
| intent--world | ADOPTED | world → intent | 2 / 2 | RF05-F04 |
| knowledge--narrative | ADOPTED | knowledge → narrative | 1 / 1 | RF04-F05 |
| knowledge--npc | ADOPTED | npc → knowledge | 1 / 1 | RF04-F05 |
| knowledge--operations | PROPOSED_NO_API | operations → knowledge; knowledge → operations | 0 / 0 | RF04 |
| knowledge--persistence | PROPOSED_NO_API | persistence → knowledge; knowledge → persistence | 0 / 0 | RF06 |
| knowledge--publication | PROPOSED_NO_API | publication → knowledge; knowledge → publication | 0 / 0 | RF06 |
| knowledge--session | PROPOSED_NO_API | session → knowledge; knowledge → session | 0 / 0 | RF04 |
| knowledge--world | ADOPTED | knowledge → world; world → knowledge | 1 / 3 | RF04-F05 |
| narrative--npc | PROPOSED_NO_API | narrative → npc; npc → narrative | 0 / 0 | RF05 |
| narrative--operations | PROPOSED_NO_API | narrative → operations | 0 / 0 | RF05 |
| narrative--persistence | PROPOSED_NO_API | persistence → narrative; narrative → persistence | 0 / 0 | RF05 |
| narrative--publication | PROPOSED_NO_API | narrative → publication; publication → narrative | 0 / 0 | RF05 |
| narrative--session | CONTRACT_ONLY_UNWIRED | session → narrative | 1 / 2 | RF04-F04 |
| narrative--world | ADOPTED | world → narrative | 1 / 1 | RF04-F05 |
| npc--operations | PROPOSED_NO_API | operations → npc; npc → operations | 0 / 0 | RF04 |
| npc--persistence | PROPOSED_NO_API | persistence → npc; npc → persistence | 0 / 0 | RF06 |
| npc--session | ADOPTED | npc → session; session → npc | 1 / 1 | RF04-F05 |
| npc--world | ADOPTED | world → npc; npc → world | 1 / 3 | RF04-F05 |
| operations--persistence | PROPOSED_NO_API | persistence → operations; operations → persistence | 0 / 0 | RF06 |
| operations--publication | PROPOSED_NO_API | publication → operations | 0 / 0 | RF06 |
| operations--session | PROPOSED_NO_API | session → operations | 0 / 0 | RF04 |
| operations--world | PROPOSED_NO_API | operations → world; world → operations | 0 / 0 | RF04 |
| persistence--publication | PROPOSED_NO_API | publication → persistence | 0 / 0 | RF06 |
| persistence--session | PROPOSED_NO_API | persistence → session; session → persistence | 0 / 0 | RF06 |
| persistence--world | PROPOSED_NO_API | persistence → world; world → persistence | 0 / 0 | RF06 |
| publication--session | PROPOSED_NO_API | session → publication; publication → session | 0 / 0 | RF06 |
| publication--world | PROPOSED_NO_API | publication → world | 0 / 0 | RF06 |
| session--world | ADOPTED | session → world; world → session | 3 / 4 | RF04 |

Test-path validation is separate from actual execution evidence. Pairs import only their two public owners and neutral kernel; application owns orchestration. No source/canon, PC choice, mechanics, secrecy or delivery authority is inferred from integration. RELEASE NOT AUTHORIZED.
