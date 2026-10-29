# C181 verification run

## Result

The fresh C181 test passed in the initial combined C180/C181 batch. It was not rerun. The batch as a whole exited 1 because C180 had one static caller assertion mismatch; that assertion was corrected and C180 alone later passed its targeted rerun.

Scoped syntax verification passed for 21/21 C180/C181 changed JavaScript and test files. The embedded child scripts in both fresh test files passed Node syntax checks.

RF04 architecture ratchet passed with 0 active violation groups and 0 transition errors. RF05 architecture ratchet failed with 53 active violation groups and 53 transition errors; the first reported legacy module location violations are listed in `C180-RUN.md`. No gate was rerun.

The bounded test covers owner consent, pending/private organization requests, replay behavior, Operations review guards and a fake bounded city-command update. It does not establish full production database or Discord behavior.

## Evidence identity

- Worktree: `C:\Users\Keshi\.codex\worktrees\rf04-isolated\Veiled_City`, branch `codex/rf04-isolated`, baseline HEAD `40ed5a49dabce7a02f20975f4b703072a3e995ee`.
- C181 test: `BCF9A54C493977424C52E6111602731204532479DA07BFD4E22AC59A5721F845`.
- C180 test also included in combined batch: initial authored hash `78E5E6C5BD16DEEBC945D8A2AF067711EA36C19EE7570160FA10CA03CCE3B68C`; corrected qualified hash `F1E025A11CE61A36B872DAF85641611789803AA155FB1F8088E3A41DE555E594`.
- C181 scope and source table: `349AB4F2EACC44DDE8DA9DF70253A6285BCBD1AA4052AE780D8021B86DD4DA84`.
- C180 scope: `E4982CFDF76132A6EA690D116685D1DE581DAC474143CB74E8BD8B3086933649`.
- Bridge contracts: `440F515317F45E6512D09409739AB1F498D8492B7AD7F92839C7CFEAD9282039`.
- Transitions: `372C731C38F8D720EC261AB14A5C55DF41E4BB66669F1431A77087AC3C7D057E`.
- Packages: `94A4CB92D35E450A169B0B8B2ABE0D98FC2366BEDF720A269E631A2E4A476933`.
- Bridge registry: `0875F01BA20E532D02F2E02B8C6FCD1EF7873F2994092CAA60CB48C2117172EC`.
- C181 retired records: `09297841A5C223C3ACFE136853739F240566BB6A5597E99C4ED7335345990447`.

The complete changed production source hashes are in `C181-SCOPE.md` and match the tested snapshot. Terminal output was captured in the active task but no persistent log file or exact timestamps were recorded. No runtime, Discord, database, or release qualification is claimed.
