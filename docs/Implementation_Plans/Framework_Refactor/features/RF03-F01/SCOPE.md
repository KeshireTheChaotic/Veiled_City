# RF03-F01 — Core rules, dice, resources and receipt contracts

Base: reconciliation commit 1db80db. Start with unchanged dice and SRD reference relocation, public API registration and actual consumer imports. Audit typed roll/resource/character advancement dependencies before extracting them; no whole coupled-module forwarding. No native behavior, resource math, RNG timing, probability, receipt version or transaction changes. Source authority: full owner specification, ENGINE constitution, local multiplayer/creation rules and checked-out native code. Online SRD is reference-only and never effect authority.

Fresh deterministic dice and mocked SRD tests only; freeze before one blocking batch. Record exact hashes, terminal outcomes, remaining coupled paths and rollback. No paid or live I/O. RELEASE NOT AUTHORIZED.

## Corrective completion C01 — adopted advancement engine

Extract the existing tier/slot/level-up policy from character-system.js into Daggerheart. Keep the currently shared character creation vocabulary and its unrelated consumers intact; no duplicate class/trait table. A consumer-owned character advancement port receives the native engine through character--daggerheart. Existing level command calls use that pair, with the same character source metadata and unchanged native plan/application algorithms. Class/creation source catalog relocation remains separate work; do not claim it complete. Fresh advancement tests only; prior dice/resource implementations unchanged.

## Corrective C02 — native typed projection and owner trait choice contracts

Relocate unchanged mechanical-boundary-v9, ordinary-effect-schema and native-unarmed-traits into Daggerheart after confirming exact current consumers. Keep authenticated verifier callbacks, source/recipient binding, no-RNG projection and pre-roll owner choice semantics. No shims or copied validators. Fresh source/grant/receipt/proposal and owner choice tests, no previous unaffected test reruns.

## Corrective C03 — typed roll execution and receipts

Extract the complete existing resolveTypedNativeRolls native policy into Daggerheart with explicit source/mechanics/notice capabilities. Preserve loop order, exact operation keys, owner/source/audience/replay and native receipt writes. Intent owns authored-envelope capability; daggerheart--intent connects it to native executor. Actual commitGmTurn injects that connector. Legacy typed-mechanics retains only the existing provider wiring (no native rules); its eventual application placement/provider public adoption remains explicitly accountable, not hidden through a forwarded old native implementation. One existing synchronous outer transaction remains; no preview execution and no RNG choice by a model. Fresh typed source/replay/receipt integration tests.
