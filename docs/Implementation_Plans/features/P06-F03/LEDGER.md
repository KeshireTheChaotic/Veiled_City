# P06-F03 — Changed-delta freeze and reporting: ledger

**Status:** TARGETED DELTA PASS. Static source anchor `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

| Field | Evidence / result |
|---|---|
| Actual checkout & dirty-tree fingerprint | Intake 0834f299ccff1738e9b3dd753a5fc616d3965370; 22 modified plan files (56 insertions/4 deletions) plus untracked no-poll policy. Final source 8e01519b6511bc90af6a1c675e4a9950f12b703c; owner docs retained unstaged. |
| Changed production code | See execution entries and final source manifest below |
| Existing-doc/code delta verified | Current-source crosswalk and owner specification reconciled; no full behavior certification |
| New test location | bot/tests/ai-gm-2026-10/p06-f03.test.mjs |
| Tests actually executed & outcomes | Final frozen union: 47/47, exit 0; feature-specific evidence below |
| Runtime/mock measurements | Only the fresh scenarios documented below; no live measurement |
| Provider calls/tokens/expense | 0 real provider calls/tokens; $0 provider-test spend; Codex usage unavailable |
| Cache and invalidation evidence | P05-F02 has measured warm/cold/source/audience invalidation; no other cache claim |
| New narrative/autonomy restrictions or owner question | None proposed |
| Noncritical holds | See explicit local holds/unverified work in execution entries |
| Critical blocker | None established |
| Rollback / next step | Reverse only feature diff; retain historical readers/state and all owner edits. Resolve listed local holds separately. |

**Test runner policy:** no polling/watch sessions; launch once and capture completion once, as specified in [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md). Execution status: NOT RUN.

## Execution 2026-10-21 — TARGETED DELTA PASS

HEAD: `0834f299ccff1738e9b3dd753a5fc616d3965370`; branch: `codex/clean-ai-gm-2026-10`. Changes are working-tree deltas; input/test hashes below identify tested content.

New independent runner selects only fresh mapped tests, rejects unknown source and inherited script paths, checks changed syntax and executes the frozen test union once without polling. Final: 47 pass, 0 fail/cancelled/skipped; 20 fresh files, 43 syntax checks.

Changed paths: bot/scripts/ai-gm-delta.mjs, bot/src/ai-gm-test-selection.js, bot/tests/ai-gm-2026-10/coverage.json.

Provider tests: 0 calls, 0 provider tokens, $0 provider test spend. Codex token/cost totals unavailable; no invented savings. Cache: no claim unless measured below. Owner restrictions proposed: none. Local holds/unverified: Live/provider/Discord and broad release certification not authorized or performed. Critical blockers: none established. Release: NOT AUTHORIZED / NOT CERTIFIED. Rollback: reverse only this feature diff, preserving intake edits and saved records.

```json
{
  "run_id": "fresh-delta-1792599054739",
  "sha": "8e01519b6511bc90af6a1c675e4a9950f12b703c",
  "start": "2026-10-21T16:10:54.739Z",
  "end": "2026-10-21T16:10:58.308Z",
  "hashes": {
    "bot/scripts/ai-gm-delta.mjs": "0cdf0ec01189ddd8f85443b7f31b6a7b754eb2f87ae3c622966fea40e6a7dcf7",
    "bot/src/action-consent.js": "89cd6e8337281901bbd1495acbe6bffe8aa69c8ff51234dc704f87625925e1ef",
    "bot/src/ai-gm-test-selection.js": "0d07cf6575257bcafe2f79a1f182fed5979ac545926265e57bbc0f25151a8f76",
    "bot/src/assembly-planning.js": "073e0876ae69bd586d9e37106ca6acaefea0664be9829976514e514f4de6918a",
    "bot/src/audience-first-capability.js": "14775ee06d3e120ea40eeba2745d0462d06e483b684e89686528a8bb2b6a853e",
    "bot/src/character-export.js": "700e1f9bfc6ac956215a81e6901d500493b2000845282dc1fe20d9601276dc6a",
    "bot/src/config.js": "3d5e472d9a2997b30f24233608cff77a8e4ceb7edf0194f40ad5c162a5c86a74",
    "bot/src/content.js": "86875dc9ae71e3ac43fba93e9b6eba597d5ff41a9d1e2c4f843294b964e12855",
    "bot/src/dice.js": "6534195eb0441d0c9982616a5d79e71f5067ddc863883a4cabda17072b6c865c",
    "bot/src/gameplay-intake.js": "50aa4c6ca70d042503f27901e132dddd318bf0e71cf9cf07f30d2f1053a235a3",
    "bot/src/generation-feedback.js": "44cc1fa24c19cb4c76475ea812304f17e217f885861f5919f298e5b4edecab2e",
    "bot/src/gm-action-ruling.js": "e464b417969cf7858912d1c13ed1387f703cee4f12c118206a520b228bc4e6d5",
    "bot/src/gm-ruling-schema.js": "5bf7a66e7ea7c9b2f37dff2b76e19a5370eedd3f360a1afdabdfe8e1d74ee970",
    "bot/src/gm.js": "b862d435e4f9da35b16a8300ca653e481abbb65c9afbe65dcf6288242b994acb",
    "bot/src/narrative-salience.js": "9b88e472ed4cb96dcb49ccc0772cc345b68308e33f277d7916214cf6480aacd5",
    "bot/src/narrative-writer-v9.js": "44963fb78fdf7592d048780e2e111e2f9ea93b090ba7cb1b8542fddb306c8ba2",
    "bot/src/native-feature-catalog.js": "a845e60ab3c8707107b1439596ade914b4532ad42d213300a3328a6565d244e6",
    "bot/src/npc-cognition.js": "5a897276ed0ae4197e56cb7943d7b3040a1e727ab37b34d3f94e4844bb734700",
    "bot/src/publication-outbox.js": "bccc83eb85b32bd807533a746cc9c65b2ae32c5bb6f4fda30fc6e9ea709559ab",
    "bot/src/scene-action-window.js": "754a0eaca6ba7800385e4a54e38bf927885842cd1a409c4b01868da51031915f",
    "bot/src/typed-intents.js": "ab22c14465978178bc24c2081ea7277e9f09da46fbb6775c382db6dcd32c795d",
    "bot/src/world-authorship.js": "c8ce0e4f24e69e2f9fdc44a8016783e0a921a8c140173aa693ebef8351358c32",
    "bot/src/world-narrative-bridge.js": "812d4a3d9a8013d9599b4c223cf36a0611b8f9ca3d3548783bd56e41034640f9",
    "bot/tests/ai-gm-2026-10/p00-f02.test.mjs": "4ac205e7dfc4be6f676d1fd431e9d774fc4a755157a6edc62f1fd53fe170c650",
    "bot/tests/ai-gm-2026-10/p01-f01.test.mjs": "f2a3bd8560081affd4204ac2786b5596e8138c6f59099e3577ab80b802808999",
    "bot/tests/ai-gm-2026-10/p01-f02.test.mjs": "a7f280eda495a193b902ab5a7f51d27cdc382035650542c6420c069b837be93a",
    "bot/tests/ai-gm-2026-10/p01-f03.test.mjs": "572fd385aceff5e3d8b2ba211c3af96ed8f97cb637c91f6210fd2ec06e9f35b7",
    "bot/tests/ai-gm-2026-10/p02-f01.test.mjs": "f248845b35fde5f31f519526cb6ac9f289895fe7b8a6b0973eab0ab0462c5aed",
    "bot/tests/ai-gm-2026-10/p02-f02.test.mjs": "f2bfd26f1310aca238f37394029c7eb48ce9ea4b94cc3fb50c7ed28be1371f24",
    "bot/tests/ai-gm-2026-10/p02-f03.test.mjs": "c10128bbd70e06c46d967fae735a5656758f14138b2d88192f0a6327865b7680",
    "bot/tests/ai-gm-2026-10/p03-f01.test.mjs": "f9d0bf27f6cfc8af31c90ee73fdca7f58dfcb5f06861a34d89c06ced62a8eb7a",
    "bot/tests/ai-gm-2026-10/p03-f02.test.mjs": "b0ef1dad83afba23e6a12d13016526a7a44f32091af447acfa8b254cc1f4dffa",
    "bot/tests/ai-gm-2026-10/p03-f03.test.mjs": "e8095d1ba82867e9b7770132bb625061eb0325f4e397ba1f92bb6d8158d0d728",
    "bot/tests/ai-gm-2026-10/p03-f04.test.mjs": "bc978b13940017ec4eedab96e35bf1ce777945b3d4275a9eebabc9679a078117",
    "bot/tests/ai-gm-2026-10/p04-f01.test.mjs": "68deb97acc66e9999b52c3921be9f044ba9e120a1eba6a858bf806bc039cdc39",
    "bot/tests/ai-gm-2026-10/p04-f02.test.mjs": "686d05ded003d599db1ff74f6df86d7fc7a494fb8f6b740c83d1811d30b7874a",
    "bot/tests/ai-gm-2026-10/p04-f03.test.mjs": "91dc7de0fe1ea855232341ab2cdc8f610ed14b999a13f79e1b5232459d975455",
    "bot/tests/ai-gm-2026-10/p05-f01.test.mjs": "cb37b2b0d659e575f14a930d107498d01300b0410a75dd9da9238995e5b875ba",
    "bot/tests/ai-gm-2026-10/p05-f02.test.mjs": "aecf30c1272b712dbeef7ae2d51b9ca666e8f1e1d63b82f3e4b1e74823f1e4be",
    "bot/tests/ai-gm-2026-10/p05-f03.test.mjs": "3c98d24aca8b44e80fb26c4d4eb05641cdfcc1bf43a138d2181e6386b549b50f",
    "bot/tests/ai-gm-2026-10/p06-f01.test.mjs": "a6bf8d22a80a7eae3c6d42f93c7574d2b1ca7ef57a53663fee3f87280f96e37d",
    "bot/tests/ai-gm-2026-10/p06-f02.test.mjs": "eb7fdf6886a7d9f5d62d352dd8030674334b9f7276c004a48f0e59f007b822fd",
    "bot/tests/ai-gm-2026-10/p06-f03.test.mjs": "de701e296305721082c6c8beff52f4749e0fd64cf4a06193f930f988434c5f2f"
  },
  "tests": [
    "bot/tests/ai-gm-2026-10/p00-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p01-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p01-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p01-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p02-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p02-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p02-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p03-f04.test.mjs",
    "bot/tests/ai-gm-2026-10/p04-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p04-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p04-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p05-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p05-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p05-f03.test.mjs",
    "bot/tests/ai-gm-2026-10/p06-f01.test.mjs",
    "bot/tests/ai-gm-2026-10/p06-f02.test.mjs",
    "bot/tests/ai-gm-2026-10/p06-f03.test.mjs"
  ],
  "syntax": [
    {
      "file": "bot/scripts/ai-gm-delta.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/action-consent.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/ai-gm-test-selection.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/assembly-planning.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/audience-first-capability.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/character-export.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/config.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/content.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/dice.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/gameplay-intake.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/generation-feedback.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/gm-action-ruling.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/gm-ruling-schema.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/gm.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/narrative-salience.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/narrative-writer-v9.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/native-feature-catalog.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/npc-cognition.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/publication-outbox.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/scene-action-window.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/typed-intents.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/world-authorship.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/src/world-narrative-bridge.js",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p00-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p01-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p01-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p01-f03.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p02-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p02-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p02-f03.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p03-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p03-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p03-f03.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p03-f04.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p04-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p04-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p04-f03.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p05-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p05-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p05-f03.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p06-f01.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p06-f02.test.mjs",
      "exit": 0,
      "error": null
    },
    {
      "file": "bot/tests/ai-gm-2026-10/p06-f03.test.mjs",
      "exit": 0,
      "error": null
    }
  ],
  "command": "node --test --test-reporter=tap bot/tests/ai-gm-2026-10/p00-f02.test.mjs bot/tests/ai-gm-2026-10/p01-f01.test.mjs bot/tests/ai-gm-2026-10/p01-f02.test.mjs bot/tests/ai-gm-2026-10/p01-f03.test.mjs bot/tests/ai-gm-2026-10/p02-f01.test.mjs bot/tests/ai-gm-2026-10/p02-f02.test.mjs bot/tests/ai-gm-2026-10/p02-f03.test.mjs bot/tests/ai-gm-2026-10/p03-f01.test.mjs bot/tests/ai-gm-2026-10/p03-f02.test.mjs bot/tests/ai-gm-2026-10/p03-f03.test.mjs bot/tests/ai-gm-2026-10/p03-f04.test.mjs bot/tests/ai-gm-2026-10/p04-f01.test.mjs bot/tests/ai-gm-2026-10/p04-f02.test.mjs bot/tests/ai-gm-2026-10/p04-f03.test.mjs bot/tests/ai-gm-2026-10/p05-f01.test.mjs bot/tests/ai-gm-2026-10/p05-f02.test.mjs bot/tests/ai-gm-2026-10/p05-f03.test.mjs bot/tests/ai-gm-2026-10/p06-f01.test.mjs bot/tests/ai-gm-2026-10/p06-f02.test.mjs bot/tests/ai-gm-2026-10/p06-f03.test.mjs",
  "exit": 0,
  "summary": [
    "# tests 47",
    "# pass 47",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# duration_ms 1575.418"
  ]
}
```

## Final source freeze

SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; branch: `codex/clean-ai-gm-2026-10`. Run: `fresh-delta-1792599054739`, 2026-10-21T16:10:54.739Z to 2026-10-21T16:10:58.308Z.

[Final command, exact input/test hashes and results](../../evidence/FINAL_DELTA.json): 47/47 fresh tests across 20 files, exit 0; 43 syntax checks pass. This feature participates only through its affected tests, except P00-F01 which is documentation-only. No inherited test, fixture, registry, broad validator, model-as-judge or paid provider run.

No new narrative restriction awaits owner. No critical blocker. Local unsupported adapters and unverified integration remain explicit above. Release is **NOT AUTHORIZED / NOT CERTIFIED**. Earlier PLANNED/NOT RUN wording in retained intake notes is historical, superseded by these execution entries.
