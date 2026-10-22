# P07-F07 — Coverage registry integrity

Correct the raw fresh-test coverage map by merging every duplicate root key and retaining every referenced test path. Keep this occurrence scoped to coverage integrity; do not touch historical suites, prompts, or production authority. Add a raw-key duplicate regression plus effective `selectFreshTests()` union assertions.

**Baseline:** `47f93d755e8afc00a13206f148cf759f3c826269`; branch `codex/clean-ai-gm-2026-10`.

**Exit:** All root mappings are unique, prior test associations are retained, and changed source selection includes both earlier phase and P07 fresh coverage.
