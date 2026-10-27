# RF05-F04 C31 — World history context reader

## Objective

Move the bounded `historyContext` query/read helper from mixed `city-civic.js` into a World-owned module and expose it through World public. Preserve the same compatibility export and switch the GM consumer to World public.

## Behavioral contract

Preserve term extraction and six-term cap, native record query limits, four-summary cap, source-event projection, 10,000-character aggregate budget, and `SUMMARY_NOT_CANON` authority label. The function retrieves historical context only; summaries remain non-canonical and confer no authority to mutate state or reveal restricted material.

## Files

- Add `bot/src/frameworks/world/history-context.js`.
- Export `historyContext` from World public.
- Re-export it from `city-civic.js` for compatibility.
- Switch GM to World public.
- Add a fresh test at `bot/tests/ai-gm-2026-10/rf05-f04-c31.test.mjs`.

## Verification

Test de-duplication, query bounds, summary/source projection, and aggregate character budget with fresh in-memory deterministic fixtures; verify compatibility identity and GM import. Run with P10-F08 in one frozen batch, syntax-check changed JavaScript, and run the RF05 architecture ratchet. If GM's exact private-import transition is unused, preserve and retire only that record. No inherited tests or external services.

## Exit evidence

Record exact source/test hashes, counts, gate result, transition count, rollback and cost. RF05 remains incomplete and release unauthorized.
