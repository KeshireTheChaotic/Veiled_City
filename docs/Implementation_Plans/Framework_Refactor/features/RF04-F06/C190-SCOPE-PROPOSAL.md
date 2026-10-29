# C190 — World consequence service ownership review

Source review COMPLETE at `4139f2aad52bae153db5cd430a8d79d247c93c53`; implementation pending. This review supersedes the tentative C189 follow-up description that this root requires a new three-framework interface.

`bot/src/city-consequences.js` composes the existing World consequence engine and three handlers. The goal handler calls the World-owned `worldNpcGoalProposal` consumer; the transmission handler calls the World-owned `worldNpcEvidence` consumer. Both are already bound to original NPC functions by `npc--world` during startup. The service handler validates committed infrastructure events and calls the original World service updater. Transmission keeps the existing causal message-record check and calls the original World civic transmission service; that service owns its current transaction, subjective recipient knowledge, capacity and audit behavior. This review does not qualify or reassign that underlying transmission implementation.

The remaining `requireCitySource` import from `city-core.js` is an exact re-export from World public. It can use the World implementation directly after relocation. No new NPC provider, goal approval, knowledge grant or handler policy is required for the consequence service move.

## Bounded implementation

1. Move the original lazy service composition and handler bodies into `frameworks/world/consequence-source.js`, using World-local imports and the same neutral hash/error classes. Preserve lazy construction, handler identity, error timing, synchronous transaction nesting, review result and blocked-record recovery.
2. Export `subscribeConsequence`, `coordinateConsequences`, and `reviewConsequence` through World public.
3. Route World `simulation.js` directly through its public owner API. Route Application `simulation-commands.js` through World public. Route Intent `ai-intents.js` through the existing Intent–World operations consumer and initializer, adding only its two actual operations. Route Operations `ai-review.js` through the existing Operations–World pair with only reviewConsequence.
4. Verify actual current owners and exact transition IDs before changing callers. Archive only records proved absent by the completed graph; retain any cycle records still observed.
5. Author fresh tests against changed production modules and bounded fakes for inert/lazy service composition, original goal/transmission argument forwarding, service source mismatch and significant-review holds, reviewed retry behavior, and actual pair bindings. Test fixtures must preserve the original engine transaction contract. Do not rerun passing C189 tests.

No runtime source was changed by this review. Tests and syntax checks were not run because this is documentation only. RF04 remains incomplete; no live service or release qualification is implied. Next exact step: C190 caller/transition intake followed by the bounded source move above.
