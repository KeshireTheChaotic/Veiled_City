# C164 repoint design (read-only review)

Reviewed against working tree based on `8de8007a701897dc8687cab148fdddfb388b1ee8` on 2026-10-29. Design only: no production files, tests, or transition records were changed for this review.

## Recommended approach

Keep `assembly-state.js` at its current root path for C164. Repoint the application consumers through the existing Session provider slots, and use the existing C163 Publication slots plus World and Operations public APIs for the other edges. Do not add a Session import of the application-owned `assembly-delivery.js` and do not move or copy its legacy part reconstruction.

The Session contract `frameworks/session/contracts/opening-sources.js` already defines and exports `sessionAssemblyStateSource`, `sessionAssemblyContextSource`, and `sessionOpeningSource` through `frameworks/session/public.js`. Extend these fixed provider name lists and their existing root bindings:

| Existing slot | Existing providers | C164 additions |
|---|---|---|
| `sessionAssemblyStateSource` | `assemblyDeliverySummary`, `assemblyPlanHash` from root `assembly-state.js` | `assemblyHash`, `assemblySlots`, `legacyAssemblyState` |
| `sessionAssemblyContextSource` | `assemblyInputFingerprint`, `certifyAssemblyPlan`, `assemblyPlanFreshness`, `assemblyHookSources` from root `assembly-context.js` | `assemblyHookSelection` |
| `sessionOpeningSource` | `inspectSessionOpening`, `beginSessionOpeningAttempt`, `assertSessionOpeningAttempt`, `assertSessionOpeningFence`, `rebaseSessionOpening`, `bindSessionOpeningTurn` from root `session-opening.js` | `rebindSessionOpeningRefresh` |

`createFunctionPort.bind` requires the complete provider map. Each existing root binding must therefore include its current members and the additions in the same call. It forwards the original implementations unchanged; no adapter or copy of the algorithms is needed.

## Consumer substitutions

`assembly-planning.js` can use `sessionAssemblyContextSource` for input fingerprinting, plan freshness, certification, and hook selection; the Session public exports already provide `hookHash` and `assemblySourceError`. It can use `sessionAssemblyStateSource.assemblyPlanHash`, `sessionOpeningSource.inspectSessionOpening` and `sessionOpeningSource.rebindSessionOpeningRefresh`, plus `indexWorldEvent` from World public API.

`assembly-publications.js` can use the Session state slot for `assemblyHash`, `assemblyPlanHash`, `assemblySlots`, `legacyAssemblyState`, and `assemblyDeliverySummary`; the C163 Publication slots for `prepareAssemblyOutput`, `queueTurnPublications`, and `deliverQueuedTurn`; `indexWorldEvent` from World public API; and `measureNative`, `measureStage`, and `operationalMetrics` from Operations public API. The latter exports the existing `operationalMetrics` singleton directly, preserving its identity.

The current functions in `assembly-state.js` remain where they are. In particular, `legacyAssemblyState` calls `assemblyPartsFor` from application-owned `assembly-delivery.js`; moving this source into Session would create a Session-to-application implementation dependency. Retaining the state functions as the providers for an existing Session slot avoids that new dependency. The current root import remains an existing dependency and is not claimed retired by C164.

## Provider startup reachability

The root Session provider modules retain their module-load bindings. In production, `index.js` imports `commands.js` and also imports `pvp-output.js`; `pvp-output.js` imports root `assembly-state.js`, `assembly-context.js`, and `session-opening.js`. `commands.js` also currently imports `assembly-context.js` and `session-opening.js`, and imports `assembly-readiness.js`, which imports the state, context, and opening roots. Consequently those provider modules execute and bind their slots before the service starts processing requests, even after the two target consumers use ports.

`tests/ai-gm-2026-10/compose-startup.mjs` imports `pvp-output.js` and the other runtime provider modules. New C164 proof should enter through that composition or explicitly import the exact root provider modules before exercising slot-backed operations. Importing a public API alone does not bind these root providers. No new composition initializer or root fallback is indicated for the supported production startup.

## Exact current transition scope

The ten planned application-to-root records are directly addressable by their existing eight-character IDs:

| Consumer | Root target | Retire candidate |
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

The nearby `commands.js -> assembly-context.js` record `6841e271` and `assembly-readiness.js` imports are outside the ten-record C164 slice. They are not required to repoint the two named consumers; the current command/readiness edges also preserve root provider loading. Do not retire extra records or change transition inventory as part of this design-only review.

## Disposition

No architectural blocker was found for the exact ten substitutions. The former `assembly-state.js` move is unnecessary for C164 and should be deferred until the legacy `assemblyPartsFor` responsibility is resolved. C164 remains unimplemented and unqualified; no tests were run as part of this design review.
