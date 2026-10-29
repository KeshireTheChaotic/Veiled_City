# C187 — Retire the root conversation-principal shim

**Status: COMPLETE for this slice.** C187 source and bounded metadata migration are implemented. The 22 production imports from `bot/src/conversation-principal.js` now use the specified owner routes, the root shim is removed, and its 23 exact transition records are archived in `C187-RETIRED.json`. Fresh C187 coverage passed 8/8 after dependency restoration; 40 changed-file syntax checks and RF04 ratchet passed. RF05 retains 45 obligations. See C187-RUN.md for all attempts and the lost initial diagnostic limitation. No release qualification is claimed.

## Boundary and retained behavior

The removed root file only re-exported Session's `conversationPrincipal` and `historicalOwnerPrincipal`. Both functions remain Session-owned and unchanged. The application bootstrap imports `conversationPrincipal` from `frameworks/session/public.js`. The two Session-local consumers already import the same-owner implementation and remain unchanged. Daggerheart's `pc-death.js` obtains the historical reader through its existing `nativePrincipals` consumer; historical receipt ancestry remains read-only and grants no current control, consent, spending, or action authority.

The earlier proposal counted 20 importers. The checked source and exact transition manifest establish 22 root importers plus the legacy module-location record. This scope uses those 22 importers and does not alter the two Session-local imports. Narrative's ten direct callers are each routed through the new Narrative-owned principal slot; they are not covered by the Narrative context builder capability and are not redirected through it. Publication's existing publicationSession opening and evidence capability serves a separate contract and does not supply conversation-principal reads, so Publication receives its own principal slot.

## Fixed consumer-owned routes

Each consumer contract uses the kernel's single-function `createFunctionPort` for the Session `conversationPrincipal` callable. Each contract exposes its consumer to that framework's existing `public.js`; every adapter imports Session's original `conversationPrincipal` from `frameworks/session/public.js` and binds it unchanged.

| Consumer | Consumer contract and slot | Pair binder | Application initialization |
|---|---|---|---|
| Intent | `frameworks/intent/contracts/session-principal.js`, `intentSessionPrincipal` | Existing `intent--session`, `connectIntentSessionPrincipal` | Existing `application/composition/session-intent.js` calls the binder |
| Narrative | `frameworks/narrative/contracts/session-principal.js`, `narrativeSessionPrincipal` | Existing `narrative--session`, `connectNarrativeSessionPrincipal` | Existing `application/composition/pvp-agreements.js` calls the binder |
| Publication | `frameworks/publication/contracts/session-principal.js`, `publicationSessionPrincipal` | Existing `publication--session`, `connectPublicationSessionPrincipal` | Existing `application/composition/publication-session.js` calls the binder |
| Discord | `frameworks/discord/contracts/session-principal.js`, `discordSessionPrincipal` | New `discord--session`, `connectDiscordSessionPrincipal` | New `application/composition/discord-session.js`, exported through composition public and initialized by `index.js` |

The adapter calls are explicit framework-to-framework composition; no consumer imports another framework directly. The initializer binds the function only and performs no database read or state mutation. The Session implementation remains responsible for identity, context, and hashing rules.

## Metadata and exact transition retirement

`RF01/PACKAGES.json` registers the new public pair entrypoint `bot/src/framework-to-framework/discord--session/public.js`; the existing Session, Intent, Narrative, Publication, Discord, and application composition public entrypoints already cover their newly exported consumer surfaces. `RF01/BRIDGE_CONTRACTS.json` records the four exact consumer directions, binders, consumers, and the fresh C187 test reference `bot/tests/ai-gm-2026-10/rf04-f05-c87.test.mjs`. That test is registered for later authoring and was not created here. The existing pair adoption statuses and unrelated evidence/count fields are retained; the new `discord--session` pair records only this principal capability.

The live `RF01/TRANSITIONS.json` no longer contains the one `LEGACY_MODULE_LOCATION` record for `bot/src/conversation-principal.js` or the 22 exact import records targeting it. Their original objects and IDs are preserved verbatim in `C187-RETIRED.json`. No other transition is retired or rewritten. No transition was created for an already-correct Session-local implementation import.

## Rollback and validation boundary

Rollback restores the 23 exact records from `C187-RETIRED.json` to `RF01/TRANSITIONS.json`, removes the `discord--session` public-entry registration, and restores the four prior bridge scopes/status for this C187 capability. Source rollback restores the root shim and its 22 importers, removes the four consumer contracts/slots and principal binders, removes the new Discord–Session pair and initializer, and removes the C187 test references. Preserve unrelated work and all existing bridge metadata outside these exact C187 fields.

Next exact slice: C188 assembly state, after resolving the Application formatter dependency and preserving standalone source initialization. See C188-SCOPE-PROPOSAL.md.
