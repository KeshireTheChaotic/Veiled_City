# C180 verification run

## Result

The fresh C180 test passed after one test-only assertion correction. In the initial combined batch, C180 failed a static caller assertion: the test expected a property-call string, while the frozen caller correctly destructures `manageEvidence` and `inviteOrganization` from `intentKnowledgeActions`. The C180 implementation was not changed. The corrected C180 test passed in a targeted run; C181 had already passed in the combined batch and was not rerun.

Scoped syntax verification passed for 21/21 C180/C181 changed JavaScript and test files. The embedded child scripts in both fresh test files also passed Node syntax checks.

RF04 architecture ratchet passed: 846 source modules, 0 unowned, 3,468 import occurrences, 3,284 internal imports, 2 cycle components (largest 79), 1,215 raw and accepted legacy occurrences, 0 active violation groups, and 0 transition errors.

RF05 architecture ratchet failed: 846 source modules, 0 unowned, 3,468 import occurrences, 3,284 internal imports, 2 cycle components (largest 79), 1,215 raw violations, 1,162 accepted legacy occurrences, 53 active violation groups, and 53 transition errors. The first reported groups were legacy module location violations for `action-continuation.js` (Session), `assembly-context.js` (Session), `assembly-state.js` (Session), `autonomous-world.js` (World), and `character-observation.js` (Character). No gate was rerun.

## Evidence identity

- Worktree: `C:\Users\Keshi\.codex\worktrees\rf04-isolated\Veiled_City`, branch `codex/rf04-isolated`, baseline HEAD `40ed5a49dabce7a02f20975f4b703072a3e995ee`.
- C180 test, initial authored hash: `78E5E6C5BD16DEEBC945D8A2AF067711EA36C19EE7570160FA10CA03CCE3B68C` (the pre-correction scope snapshot; not the hash of the qualifying test).
- C180 test, corrected and qualified hash: `F1E025A11CE61A36B872DAF85641611789803AA155FB1F8088E3A41DE555E594`.
- Shared C181 test, qualified in the combined batch: `BCF9A54C493977424C52E6111602731204532479DA07BFD4E22AC59A5721F845`.
- C180 scope: `E4982CFDF76132A6EA690D116685D1DE581DAC474143CB74E8BD8B3086933649`.
- C181 final scope/source table: `349AB4F2EACC44DDE8DA9DF70253A6285BCBD1AA4052AE780D8021B86DD4DA84`.
- Bridge contracts: `440F515317F45E6512D09409739AB1F498D8492B7AD7F92839C7CFEAD9282039`.
- Transitions: `372C731C38F8D720EC261AB14A5C55DF41E4BB66669F1431A77087AC3C7D057E`.
- Packages: `94A4CB92D35E450A169B0B8B2ABE0D98FC2366BEDF720A269E631A2E4A476933`.
- Bridge registry: `0875F01BA20E532D02F2E02B8C6FCD1EF7873F2994092CAA60CB48C2117172EC`.
- C180 retired records: `AAA70A3106E7F2BABB9F16CDF33D5232D769DE6D534C2497609F01617105DA39`.

The changed production source hashes are recorded in `C181-SCOPE.md`; those hashes match the source used by the test and gate runs. Terminal output was captured in the active task but no persistent log file or exact timestamps were recorded. No runtime, Discord, database, or release qualification is claimed.
