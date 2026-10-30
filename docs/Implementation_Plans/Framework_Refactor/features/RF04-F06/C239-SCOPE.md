# C239 — Actual native autonomous execution

Complete at base f15df08e; no production source changes. Fresh tests call public submitNpcAction/executeNpcAction/inspectWorldSimulationReceipt with actual World actor-control App composition, disposable SQLite/production schema and newly authored NPC profile, resource state and goal. Dice are supplied through the existing native roll option. No active player session, provider, inherited fixture or live campaign is used.

One blocking run: 3/3 passed (871.0363 ms). Successful NPC travel consumes exactly one material, updates native location/goal/memory, produces one matching GM-only native mutation receipt, and retry performs zero writes or rerolls. Failed travel spends once/increases stress but preserves location/goal, with truthful failed-result receipt. Invalid dice roll back submission/resources/memories; PC-target action rejects before dice and leaves no action row. No source edits or passing reruns.

Limits: tests qualify native execution and persisted result ancestry, not successful audience observation, strategy delegation, opposed NPC combat or every autonomous action type. No inference of publication permission. Next: current lawfully observed arrival/public projection acceptance and RF04 exit audit.
