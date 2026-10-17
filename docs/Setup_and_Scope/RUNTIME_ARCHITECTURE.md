# Runtime architecture and source-of-truth map

## Main flow

```text
Discord interaction / message (authenticated principal and channel)
     |
     +--> commands.js / command-definitions.js --> native owner/GM service
     |
     +--> index.js public/private turn --> GMService.runTurn (gm.js)
                   | accepted owner input + audience/source context
                   v
              current scene-intent board + unified arbitration proposal
                   | typed decision validation, source/rule/owner/cost checks
                   v
              state.js authoritative mutation/transaction
                   | native roll / cost / result / record proof
                   v
              native output part authorization + outbox
                   | recipient/body/source revalidation
                   v
              actual Discord transport and acknowledged delivery
```

The isolated scene/assembly writer receives current entitled context and drafts descriptive prose. It does not acquire permission to mutate mechanics, create owner speech, override secrecy or backfill a missing receipt. The World Director and civic simulations have separate source/permission paths; civic scores cannot substitute for native GM attacks.

## Key source files (relative to repository root)

| Area | Source |
| --- | --- |
| Command schema and role enforcement | `bot/src/command-definitions.js`, `bot/src/commands.js` |
| Turn orchestration | `bot/src/index.js`, `bot/src/gm.js`, `bot/src/state.js` |
| Shared arbitration | `bot/src/scene-intent-board.js`, `bot/src/gm-unified-arbitration.js`, `bot/src/gm-arbitration-contract.js` |
| Supported native GM action/dice/defense | `bot/src/gm-action-capability.js`, `bot/src/gm-native-rolls.js`, `bot/src/pc-incoming.js` |
| Catalog and bounded feature adapters | `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-group-features.js`, `bot/src/native-defense-aura.js` |
| Assembly selection/refresh/delivery | `bot/src/assembly-context.js`, `bot/src/assembly-planning.js`, `bot/src/assembly-publications.js`, `bot/src/assembly-state.js` |
| Hook import normalization | `bot/src/gm-hook-import.js`, `bot/src/db.js` |
| Native rules and ownership | `bot/src/roll-requests.js`, `bot/src/typed-roll-proof.js`, `bot/src/rules-arbitration.js` |
| Outbox and narrative protection | `bot/src/native-publications.js`, `bot/src/pvp-output.js`, narrative authority modules |
| Offline suite launcher | `bot/scripts/validate-offline.mjs` |

## Storage and identity

SQLite persists campaign-scoped native current state, immutable source and review records, rolls, effects, outbox attempts and acknowledgements. Scoped model proposals can become records only through native authority checks. Historical saved readers are security dependencies: do not delete them merely because the new writer no longer emits an old shape. A generated name/location, alleged NPC belief or delivered sentence never proves a private fact or physical action occurred.

## Source audit boundary

The audited branch contains 756 tracked blobs and 221 `docs/*.md` entries; most are not active runtime contracts. This package is a **curated current-state reconstruction**, not a bulk archival copy. No executable, SQL schema, manifest or GitHub repository file was modified.
