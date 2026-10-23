# Canonical integration registry — RF01

The executable registry is [BRIDGE_CONTRACTS.json](RF01/BRIDGE_CONTRACTS.json). The checker validates actual public entrypoints, exact endpoints, source imports, consumers and fresh-test path references; test execution is evidenced separately in ledgers. Original RF00 observations are preserved [here](RF01/RF00_BRIDGE_REGISTRY.md) and in the unchanged dependency graph.

63 observed pairs remain planning evidence. Two have transparent contracts and explicit composition, with native runner adoption deferred. No gameplay path is rewired and no unused pair packages are created. Dependency directions in historical evidence do not prove runtime traffic; planned bidirectional interfaces are not advertised as implemented.

Every pair record names validation, lifecycle, source evidence, consumers, tests and adoption phase/feature. A pair can use only its two endpoints’ registered public APIs plus neutral kernel utilities. Application composition wires dependencies; frameworks never import their adapters.

| Pair | Status | Contract directions | Consumers/tests | Adoption |
|---|---|---|---|---|
| ai-provider--knowledge | PROPOSED_NO_API | ai-provider → knowledge (imports 1, injected 0) | None; proposed only | RF05 |
| ai-provider--operations | PROPOSED_NO_API | ai-provider → operations (imports 1, injected 0) | None; proposed only | RF05 |
| character--daggerheart | PROPOSED_NO_API | character → daggerheart (imports 1, injected 0); daggerheart → character (imports 1, injected 0) | None; proposed only | RF03 |
| character--discord | PROPOSED_NO_API | discord → character (imports 1, injected 0) | None; proposed only | RF06 |
| character--narrative | PROPOSED_NO_API | narrative → character (imports 3, injected 0) | None; proposed only | RF05 |
| character--persistence | PROPOSED_NO_API | character → persistence (imports 0, injected 74) | None; proposed only | RF06 |
| character--publication | PROPOSED_NO_API | publication → character (imports 2, injected 0) | None; proposed only | RF06 |
| character--session | PROPOSED_NO_API | character → session (imports 2, injected 0) | None; proposed only | RF04 |
| character--world | PROPOSED_NO_API | world → character (imports 1, injected 0); character → world (imports 2, injected 0) | None; proposed only | RF04 |
| content--intent | PROPOSED_NO_API | content → intent (imports 1, injected 0) | None; proposed only | RF05 |
| content--persistence | PROPOSED_NO_API | content → persistence (imports 0, injected 10) | None; proposed only | RF06 |
| content--world | PROPOSED_NO_API | content → world (imports 3, injected 0) | None; proposed only | RF04 |
| daggerheart--discord | PROPOSED_NO_API | discord → daggerheart (imports 16, injected 0) | None; proposed only | RF03 |
| daggerheart--intent | PROPOSED_NO_API | intent → daggerheart (imports 53, injected 0); daggerheart → intent (imports 61, injected 0) | None; proposed only | RF03 |
| daggerheart--knowledge | PROPOSED_NO_API | daggerheart → knowledge (imports 18, injected 0) | None; proposed only | RF03 |
| daggerheart--narrative | PROPOSED_NO_API | daggerheart → narrative (imports 101, injected 0); narrative → daggerheart (imports 10, injected 0) | None; proposed only | RF03 |
| daggerheart--npc | PROPOSED_NO_API | daggerheart → npc (imports 4, injected 0) | None; proposed only | RF03 |
| daggerheart--operations | PROPOSED_NO_API | daggerheart → operations (imports 11, injected 0) | None; proposed only | RF03 |
| daggerheart--persistence | PROPOSED_NO_API | persistence → daggerheart (imports 1, injected 0); daggerheart → persistence (imports 0, injected 1955) | None; proposed only | RF03 |
| daggerheart--publication | PROPOSED_NO_API | daggerheart → publication (imports 15, injected 0); publication → daggerheart (imports 19, injected 0) | None; proposed only | RF03 |
| daggerheart--session | PROPOSED_NO_API | daggerheart → session (imports 71, injected 0); session → daggerheart (imports 17, injected 0) | None; proposed only | RF03 |
| daggerheart--world | PROPOSED_NO_API | daggerheart → world (imports 115, injected 0); world → daggerheart (imports 43, injected 0) | None; proposed only | RF03 |
| discord--narrative | PROPOSED_NO_API | discord → narrative (imports 1, injected 0) | None; proposed only | RF05 |
| discord--operations | PROPOSED_NO_API | discord → operations (imports 4, injected 0); operations → discord (imports 1, injected 0) | None; proposed only | RF06 |
| discord--persistence | PROPOSED_NO_API | discord → persistence (imports 0, injected 42) | None; proposed only | RF06 |
| discord--publication | CONTRACT_ONLY_UNWIRED | publication → discord | create-opening-services; rf01-f02/f03 | RF06-F03 |
| discord--session | PROPOSED_NO_API | discord → session (imports 2, injected 0) | None; proposed only | RF06 |
| discord--world | PROPOSED_NO_API | discord → world (imports 1, injected 0) | None; proposed only | RF06 |
| intent--knowledge | PROPOSED_NO_API | intent → knowledge (imports 8, injected 0); knowledge → intent (imports 5, injected 0) | None; proposed only | RF05 |
| intent--narrative | PROPOSED_NO_API | intent → narrative (imports 7, injected 0); narrative → intent (imports 3, injected 0) | None; proposed only | RF05 |
| intent--npc | PROPOSED_NO_API | intent → npc (imports 5, injected 0); npc → intent (imports 1, injected 0) | None; proposed only | RF05 |
| intent--operations | PROPOSED_NO_API | operations → intent (imports 2, injected 0) | None; proposed only | RF05 |
| intent--persistence | PROPOSED_NO_API | intent → persistence (imports 0, injected 227) | None; proposed only | RF05 |
| intent--publication | PROPOSED_NO_API | intent → publication (imports 1, injected 0); publication → intent (imports 2, injected 0) | None; proposed only | RF05 |
| intent--session | PROPOSED_NO_API | session → intent (imports 9, injected 0); intent → session (imports 21, injected 0) | None; proposed only | RF05 |
| intent--world | PROPOSED_NO_API | intent → world (imports 18, injected 0); world → intent (imports 11, injected 0) | None; proposed only | RF05 |
| knowledge--narrative | PROPOSED_NO_API | knowledge → narrative (imports 6, injected 0); narrative → knowledge (imports 16, injected 0) | None; proposed only | RF05 |
| knowledge--npc | PROPOSED_NO_API | knowledge → npc (imports 3, injected 0); npc → knowledge (imports 1, injected 0) | None; proposed only | RF04 |
| knowledge--operations | PROPOSED_NO_API | operations → knowledge (imports 2, injected 0); knowledge → operations (imports 3, injected 0) | None; proposed only | RF04 |
| knowledge--persistence | PROPOSED_NO_API | persistence → knowledge (imports 5, injected 0); knowledge → persistence (imports 0, injected 261) | None; proposed only | RF06 |
| knowledge--publication | PROPOSED_NO_API | publication → knowledge (imports 6, injected 0); knowledge → publication (imports 1, injected 0) | None; proposed only | RF06 |
| knowledge--session | PROPOSED_NO_API | session → knowledge (imports 10, injected 0); knowledge → session (imports 7, injected 0) | None; proposed only | RF04 |
| knowledge--world | PROPOSED_NO_API | world → knowledge (imports 14, injected 0); knowledge → world (imports 18, injected 0) | None; proposed only | RF04 |
| narrative--npc | PROPOSED_NO_API | narrative → npc (imports 3, injected 0); npc → narrative (imports 2, injected 0) | None; proposed only | RF05 |
| narrative--operations | PROPOSED_NO_API | narrative → operations (imports 2, injected 0) | None; proposed only | RF05 |
| narrative--persistence | PROPOSED_NO_API | persistence → narrative (imports 1, injected 0); narrative → persistence (imports 0, injected 400) | None; proposed only | RF05 |
| narrative--publication | PROPOSED_NO_API | narrative → publication (imports 6, injected 0); publication → narrative (imports 16, injected 0) | None; proposed only | RF05 |
| narrative--session | CONTRACT_ONLY_UNWIRED | session → narrative | create-opening-services; rf01-f02/f03 | RF04-F04 |
| narrative--world | PROPOSED_NO_API | world → narrative (imports 22, injected 0); narrative → world (imports 30, injected 0) | None; proposed only | RF05 |
| npc--operations | PROPOSED_NO_API | operations → npc (imports 2, injected 0); npc → operations (imports 2, injected 0) | None; proposed only | RF04 |
| npc--persistence | PROPOSED_NO_API | persistence → npc (imports 1, injected 0); npc → persistence (imports 0, injected 113) | None; proposed only | RF06 |
| npc--session | PROPOSED_NO_API | session → npc (imports 3, injected 0); npc → session (imports 3, injected 0) | None; proposed only | RF04 |
| npc--world | PROPOSED_NO_API | world → npc (imports 17, injected 0); npc → world (imports 14, injected 0) | None; proposed only | RF04 |
| operations--persistence | PROPOSED_NO_API | persistence → operations (imports 3, injected 0); operations → persistence (imports 0, injected 31) | None; proposed only | RF06 |
| operations--publication | PROPOSED_NO_API | publication → operations (imports 9, injected 0) | None; proposed only | RF06 |
| operations--session | PROPOSED_NO_API | session → operations (imports 2, injected 0) | None; proposed only | RF04 |
| operations--world | PROPOSED_NO_API | operations → world (imports 5, injected 0); world → operations (imports 5, injected 0) | None; proposed only | RF04 |
| persistence--publication | PROPOSED_NO_API | publication → persistence (imports 0, injected 239) | None; proposed only | RF06 |
| persistence--session | PROPOSED_NO_API | persistence → session (imports 1, injected 0); session → persistence (imports 0, injected 482) | None; proposed only | RF06 |
| persistence--world | PROPOSED_NO_API | persistence → world (imports 1, injected 0); world → persistence (imports 0, injected 880) | None; proposed only | RF06 |
| publication--session | PROPOSED_NO_API | session → publication (imports 3, injected 0); publication → session (imports 15, injected 0) | None; proposed only | RF06 |
| publication--world | PROPOSED_NO_API | publication → world (imports 6, injected 0) | None; proposed only | RF06 |
| session--world | PROPOSED_NO_API | session → world (imports 23, injected 0); world → session (imports 16, injected 0) | None; proposed only | RF04 |

Contract validation does not grant canon, PC movement/choices, mechanical outcomes or acknowledgement authority. Rows and authoring arguments are passed unchanged; existing native policy and receipt ownership remain authoritative. No release or narrative quality claim follows from offline contract tests.
