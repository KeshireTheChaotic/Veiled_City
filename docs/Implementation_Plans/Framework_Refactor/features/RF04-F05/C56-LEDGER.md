# C56 ledger

## 2026-10-27 C56 native rules Session principal port

18 Daggerheart legacy modules switched from the root `./conversation-principal.js` re-export to the Daggerheart-owned `nativePrincipals` port, bound to Session's original `conversationPrincipal` and `historicalOwnerPrincipal` by the existing Daggerheart–Session adapter and a bootstrap called from `index.js`. All 18 load uncomposed.

Tests: one frozen batch of 29 files: 214 tests, 209 pass, 5 fail, all named in C56-RUN.json as pre-existing (p06-f03 missing module at load; rf04-f04-c02 Session composition and source-shape drift; rf04-f05-c18 adapter import count). The first batch on this code also failed 11 tests in p02-f01, rf03-f06 and rf04-f04-c01 because they never composed the new port; each file received only the `initializeNativePrincipals()` import and call, after which the three files passed 23/23. New rf04-f05-c56 3/3: fail-closed and replacement-forbidden port, exact forwarding, real owner principal and non-owner rejection through the composed port equal direct Session results, all 18 modules use the port.

Architecture: RF04 exit 0, 0 active violations, 733 modules, 3107 imports; RF05 540 groups/errors (was 558). 18 exact records retired. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
