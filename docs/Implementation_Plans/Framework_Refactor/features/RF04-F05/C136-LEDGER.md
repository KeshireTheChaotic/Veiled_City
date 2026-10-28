# C136 ledger

## 2026-10-28 C136 Move outcome preview and GM overview into their owners

outcome-preview.js moved unchanged to frameworks/daggerheart/outcome-preview.js and operations/overview.js to frameworks/operations/overview.js (its port import now the Operations contract file); both are exported from their owner public APIs and the application importers (story-commands.js, commands.js) import from those APIs, which also clears their two later-phase private-API records. Also tried and backed out in this slice: negotiations.js, session-opening-attendance.js and world-sanctioned-sources.js, whose moves break source-text, hook-fake and cold-slot fixtures (c02, c52, c80, c104, c109, c119, rf04-f04-c01) and need their own fixture rework.

Tests: one frozen batch of 61 files: 327 tests, 327 pass, 0 fail. Architecture: 4 exact records retired. RF04 exit 0, 0 active violations, 818 modules; RF05 83 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
