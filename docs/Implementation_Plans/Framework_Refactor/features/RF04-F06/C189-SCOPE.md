# RF04-F06 C189 — Retire World constraint compatibility export

**Status:** Implementation complete; focused offline contract test passed.
**Base HEAD:** `f534e73e405c1e298fed651609123c849e804180` on `codex/clean-ai-gm-2026-10`.

Remove `bot/src/city-constraints.js` after routing its twelve observed production callers through their accountable owner APIs. World-owned callers use `frameworks/world/public.js`; Intent and Narrative use fixed consumer ports through their existing pair adapters; Publication uses a fixed World proxy-evidence port through Publication–World. Keep the original World `activeCityProxy`, `assertNpcAvailability`, and `worldActorControl` implementations and their validation unchanged. The existing Daggerheart–World actor-control composition must still run before World execution.

## Exact callers and owners

- Intent (2): `ai-intents.js`, `scene-intent-board.js`.
- Narrative (6): `gm-world-scope.js`, `narrative-authority.js`, `narrative-authority-context.js`, `narrative-clauses-v9.js`, `narrative-speakers.js`, `narrative-salience.js`.
- Publication (1): `native-hook-output.js`.
- World (3): `autonomous-world.js`, `city-groups.js`, `world-resolution.js`.

Retire only the ten exact transition records archived in `C189-RETIRED.json`: the compatibility module location and the nine recorded cross-framework imports. The three World-owned callers had no transition records. No transition limits or baseline are expanded.

## Contract and validation

The Intent and Narrative ports expose only the existing World proxy-evidence query and NPC availability guard. Publication receives only the proxy-evidence query. Pair adapters forward the original function references; they add no policy and read no state while composing. World actor-control remains supplied by the existing Daggerheart–World pair before `initializeWorldExecution()`.

The new `bot/tests/ai-gm-2026-10/rf04-f06.test.mjs` covers fail-closed construction, argument/result forwarding, replacement rejection, all twelve caller routes, all three pair bindings, and startup order. It imports only changed contract modules and Node built-ins; source assertions inspect the changed adapters and callers. No live database, Discord, or provider is used.

Rollback restores the ten archived transition entries and the root compatibility re-export, then restores the twelve original imports and removes the three consumer contracts, pair bindings and test. No schema, saved format, gameplay, narrative restriction, or external runtime surface changes.
