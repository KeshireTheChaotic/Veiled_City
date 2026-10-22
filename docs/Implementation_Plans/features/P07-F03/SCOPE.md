# P07-F03 — Rank the source-bound world bridge packet

Integrate deterministic opportunity ranking after native validation and ID deduplication and before the existing four-signal cap. Preserve original signal envelopes/IDs/source refs. Current source evidence supports one explicit overlap case: party-visible conversation-development signals tied to distinct authenticated PC speech intents and the same NPC. Only if the looked-up intent still matches its source hash and is accepted for adjudication may those PCs form a private ranking-only overlap key. Private signals, unmatched/stale records and all other signal types cannot form links.

Preserve opening recovery precedence, response obligations, causal scene transitions, `eligible`/`omitted`, packet schema and `revalidateWorldNarrativeSignal()` semantics. No new actor scans, model calls, persistence, published rationale, or changes to revalidation.

**Fresh test:** F03 verifies shared-NPC intersection, stale/missing/private evidence exclusion, hard class precedence, stable order and unchanged source signal objects. Tests only the newly exported selector used directly by the bridge packet.
