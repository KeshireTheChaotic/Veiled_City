# P07-F14 — Ledger

**Status:** PARTIAL — available-capacity inclusion proven; required-beat collision remains a local hold. **Baseline:** `febd854fe47cfd2d5a070f2182b2c2af146d28f6`.

| Field | Evidence |
|---|---|
| Decision | No production priority rewrite was justified. The native fixture confirms the selected shared-NPC optional signals reach the existing writer packet in stable source order when two of four beat slots are available. It does not prove which existing scene/observation/encounter beats may safely be displaced or compared. |
| Test | Included in the final fresh union command recorded in F13/F18. F14: 1/1 passed; writer packet contains both revalidated signal IDs, `pacing_hint` authority remains non-executing/non-publishing, and omitted is zero. |
| Hashes | Test `94F58568F9394A74B3D566DE511F1B4EB660F44933CC7FE3975827BE9EF2D1C1`; fixture hash in F13 ledger. No production module changed for F14. |
| Cost/cache | No real provider or network calls for this test; no caching change. |
| Local hold | No native fixture supplies 0/1/3/4 committed beats and comparable optional native beat candidates. Exact proof needed: currently accepted, party-entitled persisted beat records plus native status/receipt and revalidation that classifies each candidate as committed/required versus comparable optional without inferring from prose. Keep all established observations and committed consequences first until that contract exists. |
| Rollback | No F14 production behavior changed; remove only this acceptance test and its coverage entries to withdraw the delta. |
