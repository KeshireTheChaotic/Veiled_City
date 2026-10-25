# RF04-F04 C12 — Isolate resource-overlap classification

Move only the pure `classifyResourceOverlap` responsibility into a Session-owned module. Preserve its exact return values, operation ordering, input treatment and existing top-level import/export identity. The compatibility action-window provider continues to call the same function; this slice does not move native consent, participant authorization, action-window state or Daggerheart resolution.

Add one new deterministic changed-code test under `bot/tests/ai-gm-2026-10/` covering the existing overlap categories and exact compatibility-export identity. Run the frozen test once, check changed JS/MJS syntax, and run the RF04 architecture ratchet. Do not invoke or copy historical tests. No schema, rules, creative policy, resource, roll, PC-authority or publication behavior changes. Record hashes, actual outcomes, rollback and limitations. RELEASE NOT AUTHORIZED.
