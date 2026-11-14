# R7 — GM export authorization failure receipt

Complete focused fix, 2026-11-14. Major phases remain incomplete.

GM export authorization failures used the unsupported receipt stage `authority`. The file remained blocked, but bookkeeping could fail before recording the hold or private failure reply. `discord-gm-character-exports.js` now uses the existing `source` stage. The expanded real-SQLite test verifies `processing:held`, the source hold and one delivered private failure reply, with zero attachments.

200 checks across22 affected files pass (52689.8858ms). The initially targeted case also passed; it overlaps this run and is not another distinct check. SDK transport is simulated; no live Discord/model call, data migration, effect, legacy removal, major-phase push or production action occurred. Existing source/authority/replay/format holds remain. Retain journals on rollback; do not erase claims to retry an export. Next: transactional private-hook import integration and its recovery coverage. All R0–R8 gates remain incomplete.
