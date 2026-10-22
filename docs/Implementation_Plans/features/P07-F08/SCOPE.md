# P07-F08 — Comparator ordering correctness

Fix the verified antisymmetry defect when two candidates carry different validated overlap sets. Overlap remains a Boolean tie-break only among optional classes (`autonomous_world`, `personal_opportunity`, `ambient`); mandatory responses and causal consequences are never reordered by overlap. Equally qualified candidates preserve source order. Class and native urgency remain primary, candidates and metadata remain unmodified.

**Baseline:** `47f93d755e8afc00a13206f148cf759f3c826269`.
**Fresh test:** `bot/tests/ai-gm-2026-10/p07-f08.test.mjs`.

**Exit:** Distinct equally qualified overlaps compare equally, class/urgency take precedence, ties are stable, and the signal cap remains four.
