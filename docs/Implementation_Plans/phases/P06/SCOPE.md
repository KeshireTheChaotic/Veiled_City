# P06 — Native catalog and qualification

**Status:** TARGETED DELTA PASS; LOCAL CATALOG HOLDS. **Base:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Governing owner specification
[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) is the full owner's desired behavior, not proof of already implemented code. ENGINE constitution is complementary.

## Goal
Complete source-qualified features, reconcile rules and qualify the changed implementation delta.

## Independent features
- [P06-F01 — Special native features by occurrence](../../features/P06-F01/SCOPE.md)
- [P06-F02 — Daggerheart and hidden character data](../../features/P06-F02/SCOPE.md)
- [P06-F03 — Changed-delta freeze and reporting](../../features/P06-F03/SCOPE.md)
- [P06-F04 — Enable source-qualified Sirens Outside responder arrival](../../features/P06-F04/SCOPE.md)
- [P06-F05 — Enable source-qualified Upload in Progress countdown](../../features/P06-F05/SCOPE.md)
- [P06-F06 — Enable source-qualified Too Loud to Think](../../features/P06-F06/SCOPE.md)
- [P06-F07 — Enable source-qualified Emergency Cascade](../../features/P06-F07/SCOPE.md)
- [P06-F08 — Enable source-qualified Code Blue](../../features/P06-F08/SCOPE.md)
- [P06-F09 — Enable source-qualified VIP Threshold admission](../../features/P06-F09/SCOPE.md)
- [P06-F10 — Broaden Automatic Correction to authored mundane details](../../features/P06-F10/SCOPE.md)
- [P06-F11 — Enable source-qualified witness accounts](../../features/P06-F11/SCOPE.md)
- [P06-F12 — Enable Maintenance Memory](../../features/P06-F12/SCOPE.md)
- [P06-F13 — Enable Storm Drain Shrine Local Memory](../../features/P06-F13/SCOPE.md)
- [P06-F14 — Enable Apartment Veil Breach Door Chain](../../features/P06-F14/SCOPE.md)
- [P06-F15 — Enable After-Hours Emergency Department Something in Imaging](../../features/P06-F15/SCOPE.md)
- [P06-F16 — Enable After-Hours Emergency Department HIPAA and Procedure](../../features/P06-F16/SCOPE.md)
- [P06-F17 — Enable Apartment Veil Breach Thin Walls passive context](../../features/P06-F17/SCOPE.md)
- [P06-F18 — Enable Archive Beneath the Courthouse Chain of Title passive context](../../features/P06-F18/SCOPE.md)
- [P06-F19 — Enable Rupture District No Consensus passive context](../../features/P06-F19/SCOPE.md)
- [P06-F20 — Enable Networked Dream Metaphor Is Physics passive context](../../features/P06-F20/SCOPE.md)
- [P06-F21 — Enable District Blackout No Ordinary Signal passive context](../../features/P06-F21/SCOPE.md)
- [P06-F22 — Enable Veil Anchor Chamber Consensus Engine risk cue](../../features/P06-F22/SCOPE.md)
- [P06-F23 — Enable Pale Court Townhouse Guest Right passive cue](../../features/P06-F23/SCOPE.md)
- [P06-F24 — Support the source-bound Private Room offer cue](../../features/P06-F24/SCOPE.md)
- [P06-F25 — Support the source-bound Everything Has a Price prompt](../../features/P06-F25/SCOPE.md)
- [P06-F26 — Support the source-bound Auction of Consequences prompt](../../features/P06-F26/SCOPE.md)
- [P06-F27 — Support the source-bound Model Room forecast prompt](../../features/P06-F27/SCOPE.md)
- [P06-F28 — Support the source-bound Sealed Docket prompt](../../features/P06-F28/SCOPE.md)
- [P06-F29 — Support the source-bound Three Vectors clue prompt](../../features/P06-F29/SCOPE.md)
- [P06-F30 — Support the source-bound Market neutrality rule cue](../../features/P06-F30/SCOPE.md)
- [P06-F31 — Support the source-bound Contaminated Scene rule cue](../../features/P06-F31/SCOPE.md)
- [P06-F32 — Support the source-bound Everyone Is Watching rule cue](../../features/P06-F32/SCOPE.md)
- [P06-F33 — Support the source-bound Wrong Offering reaction cue](../../features/P06-F33/SCOPE.md)
- [P06-F34 — Support Dead Platform Last Train Rules context](../../features/P06-F34/SCOPE.md)
- [P06-F35 — Support Dead Platform Express Through Memory context](../../features/P06-F35/SCOPE.md)
- [P06-F36 — Support Dead Platform Third Rail Spirit cue](../../features/P06-F36/SCOPE.md)
- [P06-F37 — Enable Aster Vale Everything Logs](../../features/P06-F37/SCOPE.md)
- [P06-F38 — Support the source-bound Containment Shutters cue](../../features/P06-F38/SCOPE.md)
- [P06-F39 — Support the source-bound Break the Hold cue](../../features/P06-F39/SCOPE.md)
- [P06-F40 — Support the source-bound Professional Entry cue](../../features/P06-F40/SCOPE.md)
- [P06-F41 — Support the source-bound Mark the Variable cue](../../features/P06-F41/SCOPE.md)
- [P06-F42 — Support the source-bound Readout cue](../../features/P06-F42/SCOPE.md)
- [P06-F43 — Support the source-bound Ride the Current cue](../../features/P06-F43/SCOPE.md)
- [P06-F44 — Support the source-bound Peripheral cue](../../features/P06-F44/SCOPE.md)
- [P06-F45 — Support the source-bound Steal the Focus cue](../../features/P06-F45/SCOPE.md)
- [P06-F46 — Support the source-bound Sympathetic Relay cue](../../features/P06-F46/SCOPE.md)
- [P06-F47 — Support the source-bound Snatch a Link cue](../../features/P06-F47/SCOPE.md)
- [P06-F48 — Support the source-bound Flow Around It cue](../../features/P06-F48/SCOPE.md)
- [P06-F49 — Enforce the owner's exact HR14 v1 authorization](../../features/P06-F49/SCOPE.md)
- [P06-F50 — Support the source-bound Drag Down cue](../../features/P06-F50/SCOPE.md)
- [P06-F51 — Support the source-bound Blank Spot cue](../../features/P06-F51/SCOPE.md)
- [P06-F52 — Support the source-bound Route Around cue](../../features/P06-F52/SCOPE.md)
- [P06-F53 — Support the source-bound Terms First cue](../../features/P06-F53/SCOPE.md)

## Exit
All safe features have current diff, truthful ledger and newly authored tests covering only code changed in this phase. Local source gaps and owner decisions remain visible but do not stop other safe work. No automatic release qualification.

## Test-runner no-poll rule
Follow [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md). Run a frozen batch once; never watch, poll or stream test progress. Collect the final exit code at a natural phase checkpoint.
