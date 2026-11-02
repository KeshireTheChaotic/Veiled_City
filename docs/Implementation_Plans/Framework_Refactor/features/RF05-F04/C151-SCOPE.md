# RF05-F04 C151 — Daggerheart–Narrative audience source audit

## Objective

Determine whether the existing Daggerheart–Narrative audience integration can
replace `gm-mechanical-v9.js`'s import of the root
`audience-first-capability.js` compatibility module without changing Native
authority or expanding the pair contract.

## Finding

The current fixed pair binds Native's `nativeNarrativeAudience` port to
Narrative's original `mintNarrativeAudience` and
`revalidateNarrativeAudience` source callbacks. The mechanical proposal rules
also require Narrative's `createAudienceAuthority` factory to construct and
inspect the opaque grant used by `projectGmMechanicalInput`. The existing port
does not expose that factory. Replacing the root import therefore requires a
new pair method or moving authority ownership; neither is part of this audit's
frozen scope.

## Disposition

Keep the root compatibility import and its existing transition records. Defer
pair expansion until an independently scoped feature defines the contract and
freshly verifies grant identity, issuance, inspection, and projection behavior.
No production source, Native policy, audience behavior, registry, or transition
record changes are made in C151.
