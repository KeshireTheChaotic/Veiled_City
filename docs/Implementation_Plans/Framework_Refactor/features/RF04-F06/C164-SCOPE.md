# C164 scope: Repoint assembly application consumers

Frozen base revision: `18d930232d9bc5a033d9f0a4beff2af4860016ef` (C161 repair and C163 checkpoint).

## Delivered boundary change

Repoint only `assembly-planning.js` and `assembly-publications.js` away from the ten recorded root-module imports. The existing Session provider ports now expose the additional functions through their existing module-load root bindings. Application consumers use Session, World, Operations, and the three Publication ports added in C163. Function bodies and the default `deliver=deliverQueuedTurn` injection are unchanged.

`assembly-state.js` remains at its root path and is not copied or moved. Its existing Session state slot now forwards `assemblyHash`, `assemblySlots`, and `legacyAssemblyState` alongside its previous functions. This retains the original implementation and its historical delivery compatibility behavior. `legacyAssemblyState` still uses application-owned `assemblyPartsFor`; that existing dependency is neither expanded nor hidden behind a Session-to-application import. A future move of assembly state requires separate resolution of that responsibility.

## Provider and startup reasoning

The complete Session slot maps are bound by the original root provider modules: `assembly-context.js`, `assembly-state.js`, and `session-opening.js`. Their original functions are forwarded through the slots unchanged. In production, `index.js` imports `pvp-output.js`; that module imports all three Session provider roots. `commands.js` also retains its pre-existing assembly-context/session-opening imports and loads `assembly-readiness.js`, which imports all three providers. Providers therefore remain reachable during the supported production startup. The test composition `compose-startup.mjs` imports `pvp-output.js`, which reaches the same providers. An uncomposed public-port import does not load the providers; it remains fail-closed until normal application composition loads them.

`assembly-publications.js` retains its existing default delivery injection, now sourced from the Publication delivery slot. World `indexWorldEvent` and the Operations metrics API are imported from their public APIs. The `operationalMetrics` singleton is the same public object, preserving identity.

## Transition retirement

Exactly these ten existing transition records were archived in `C164-RETIRED.json` and removed from `RF01/TRANSITIONS.json`:

| Consumer | Previous root target | Retired ID prefix |
|---|---|---|
| `assembly-planning.js` | `assembly-context.js` | `4db4d184` |
| `assembly-planning.js` | `assembly-state.js` | `c3c18fca` |
| `assembly-planning.js` | `city-calendar.js` | `99fda444` |
| `assembly-planning.js` | `session-opening.js` | `c393f28f` |
| `assembly-publications.js` | `assembly-state.js` | `c1dc065f` |
| `assembly-publications.js` | `pvp-output.js` | `f13d4ee1` |
| `assembly-publications.js` | `publication-outbox.js` | `f6eb35e1` |
| `assembly-publications.js` | `publishing.js` | `185792d7` |
| `assembly-publications.js` | `city-calendar.js` | `a786a88e` |
| `assembly-publications.js` | `operational-metrics.js` | `eda2e079` |

The pre-removal manifest SHA-256 is recorded in the archive. No records were added or waived. The adjacent `commands.js -> assembly-context.js` record `6841e271` remains outside C164; so do `assembly-readiness.js` imports.

## Frozen production source SHA-256

| File | SHA-256 |
|---|---|
| `bot/src/assembly-planning.js` | `f63dbec181b1b1313bce14e7e1e7bad405bf95b4517cf426627d7df234631cc9` |
| `bot/src/assembly-publications.js` | `f8853e24f06fd0eb77dfe809c38deabec8c31a6f3f7ef207b2bc5688cb6f1f69` |
| `bot/src/assembly-context.js` | `b30fd8e74f49e7216a6504aaf7130ddf1282f54c721032c44a0273a2f56a8475` |
| `bot/src/assembly-state.js` | `b829808780b43046522d3b5830389c74211e890e9c309164fc3f5e961ecf9263` |
| `bot/src/session-opening.js` | `ca3282edcee8504a18ce9f2d8f2ac34694f94543e022d2fe2175c17f17e04ac3` |
| `bot/src/frameworks/session/contracts/opening-sources.js` | `dfbe2241d9d45e25c41d2d468696c383d786349dda764197978c2f621c7c03cb` |

## Evidence and next phase

No tests were run and no commit was made for C164. The changed source set is frozen for fresh C164 verification. Exact next phase: run the new feature-local C164 test batch and the authorized RF04 ratchet; do not run legacy suites. C165 workflow relocation remains separate.
