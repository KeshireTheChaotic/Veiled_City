# C238 — NPC cognition and World cadence qualification

Complete. Base f61ffada; no production source changes. Fresh separate tests use actual App NPC initializers, real pair contracts, public NPC/World functions and standalone SQLite constructor with newly authored synthetic campaign rows. No endpoint fakes, providers or existing database.

NPC cognition passes: independent goal, authored portrayal/personality, suspected belief and confidence remain distinct; retrieval with recall disabled performs zero SQLite changes and requires no active session. World cadence passes: waits for both present owners while excluding an absent owner, queues one round pass, repeats the pending pass, and leaves every character row and the fictional clock unchanged. Initial batch one passed/one fixture failed (774.5916 ms) because the test queried a nonexistent character data_json column. Changed only that failed test's snapshot query to SELECT *; reran only cadence, one passed (618.6695 ms). The cognition pass was not rerun. Both cases have terminal passing results.

Limits: cognition retrieval and scheduling do not prove autonomous action commit, all goal lifecycle behavior, successful world mutation or full runtime initialization. No paid calls; costs UNMEASURED. Next: current-source autonomous execution and saved opening/recovery qualification before RF04 completion assessment.
