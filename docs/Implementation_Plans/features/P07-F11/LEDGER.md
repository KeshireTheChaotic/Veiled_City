# P07-F11 — Ledger

**Status:** LOCAL HOLD — candidate-to-Director downstream capacity not integration-tested.

| Field | Result |
|---|---|
| Baseline | `47f93d755e8afc00a13206f148cf759f3c826269`. |
| Inspected path | `worldNarrativeBridgePacket()` → `bindDirectorNarrativeSource()` snapshot → `directorBriefForAudience()` → `worldDirectorBridgeBeats()` → GM narrative/writer flow. |
| Current behavior | `worldDirectorBridgeBeats()` validates against the current packet; native narrative units and native receipt consequences are projected before bridge signals; the four-beat cap can omit a selected bridge signal when prior verified beats fill all slots. |
| Decision | No reordering was made because the current test fixture cannot prove which established observations are safely comparable optional slots; moving selected signals ahead could displace established observations or receipts. |
| Evidence | No feature test run; no production code changed by this held feature. Full cross-module offline candidate-to-Director and audience projection remain unverified. |
| Cost/cache | No provider/network calls; no cache change. |
| Rollback | No production changes to roll back; remove only the F11 scope/ledger if the hold is withdrawn. |
