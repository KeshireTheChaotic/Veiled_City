# C55 ledger

## 2026-10-27 C55 native rules Session scene port

34 Daggerheart legacy modules switched from the root `./scene-continuity.js` re-export to the Daggerheart-owned `nativeScenes` port, bound to Session's original `currentScene`, `scenePresence`, `sceneAccess` and `recordScenePresence` by the existing Daggerheart–Session adapter and a bootstrap called from `index.js`. All 34 load uncomposed. Five modules that also import the `RANGE_BANDS` constant are deferred (value needed at module load).

Tests: one frozen batch of 40 files: 271 tests, 266 pass, 5 fail, all named in C55-RUN.json as pre-existing — missing root module or data file at load (p06-f03, p09-f05, rf03-f02-c03) and source-shape drift (p06-f14, p06-f15). The first batch on this code also failed 7 tests in p02-f01, p09-f06 and rf04-f04-c01 because they never composed the new port (three as a direct composition error, four where the composition error replaced the rejection the test expects); each file received only the `initializeNativeScenes()` import and call, after which the three files passed 18/18. New rf04-f05-c55 3/3: fail-closed and replacement-forbidden port, exact forwarding, real Session reads through the composed port equal direct Session reads, adapter imports only two public APIs, all 34 modules use the port.

Architecture: first probe reported the new bootstrap as an unregistered daggerheart--session consumer; registered it with the new test. RF04 exit 0, 0 active violations, 731 modules, 3102 imports, largest cycle 133; RF05 558 groups/errors (was 592). 34 exact records retired. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
