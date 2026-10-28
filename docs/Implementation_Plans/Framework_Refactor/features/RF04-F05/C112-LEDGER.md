# C112 ledger

## 2026-10-28 C112 Character observation and World departure witnesses cross through Character and World ports

Character's character-observation.js stops importing World's world-observation.js and the native pc-incoming.js; World's autonomous-world.js stops importing character-observation.js. Character gains fixed characterWorldObservation and characterIncomingInjury ports and a characterObservationSource slot (filled at load by character-observation.js); World gains a worldCharacterObservation port; native rules gain a nativeIncomingInjurySource slot (filled at load by pc-incoming.js). The adopted character--world adapter binds both World/Character directions from initializeCharacterWorldEvents (reusing the C108 World observation slot); the adopted character--daggerheart adapter binds the incoming injury port from initializeCharacterCreation. No index.js change; static reachability from index.js unchanged.

Tests: one frozen batch of 142 files: 964 tests, 963 pass, 1 fail (named in C112-RUN.json: rf04-f05-c01.test.mjs | current startup source binds pair before runtime services and retains static NPC provider registration reachability). Architecture: 10 exact records retired. RF04 exit 0, 0 active violations, 815 modules; RF05 158 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
