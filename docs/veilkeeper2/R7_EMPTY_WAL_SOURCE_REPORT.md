# R7 — empty WAL source identity

Complete corrective slice; R7 remains incomplete.

Actual online startup exposed a false source-change refusal before Discord login: opening a read-only WAL-mode legacy copy created a zero-byte `-wal` and shared-memory bookkeeping. The database content was unchanged. runtime-directory now treats absent and zero-byte WAL/journal files as the same no-transaction evidence. Every nonempty WAL/journal remains hashed, and the main database remains hashed. Shared-memory bytes were never part of source identity.

Modified: bot/src/v2/runtime-directory.js, bot/tests/veilkeeper2/r7-runtime-resume.test.mjs; current dependency map and this report/hash evidence. Fresh affected checks: 23 passed in 2817.4042 ms across r7-runtime-resume, r6-native-start, r1-ollama-provider. Two new checks cover genuine WAL-mode read-only startup/reopen and changed nonempty WAL refusal before login. Log: ../r7-empty-wal-source-tests-20261111.txt. No unrelated passing suite rerun.

Online evidence: command registration completed (24 roots) in authorized guild 1467249344947159291; startup then failed before login. The failed run `.reports/online-e92cb152-a9c1-4efb-9877-5835d5f6472e` is retained, including partially initialized native stores; it is not automatically resumed or erased. Earlier historical run native stores were inspected read-only: every table in all eight databases had zero rows. Its files are retained. There was no saved native gameplay state to import; this does not qualify migration of populated directories. Ollama was reachable, qwen3.5:4b installed, no model loaded at inspection.

Migration/rollback: no gameplay SQL/data change or authority expansion. Existing manifests that encoded an empty sidecar with its old SHA-256 may refuse under the corrected identity; hold those for explicit migration rather than silently rewriting them. Nonempty sidecars/main content changes remain refused. No production cutover, legacy retirement, phase merge or push.

Next: fresh authorized test-guild startup and read-only command readback; keep prose withheld. Populated-directory adoption, full mechanical parity, human interactions and all major phase gates remain open.
