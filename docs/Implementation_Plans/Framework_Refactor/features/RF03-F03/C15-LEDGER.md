# RF03-F03 C15 ledger

Status: PROVIDER COLD-IMPORT PATH QUALIFIED.

The focused test imported the actual PvP attack provider and called its existing actor snapshot hash export. It passed 1/1, exit 0, 345.2031 ms. One changed MJS syntax check passed; the RF03 ratchet passed with 402 modules, zero unowned, 2,336 imports, 2,600 accepted historical occurrences, and zero active groups/errors. Exact hashes/logs: `phases/RF03/F03_C15_TERMINAL.json`. This verifies cold import and deterministic snapshot behavior only; the full PvP workflow remains unqualified.

The provider later changed to consume the Daggerheart public API. Its cold import/hash test was rerun as part of the C14/C15 affected-code union: total 5/5 passed, exit 0, 354.0201 ms. See `phases/RF03/F03_C14_C15_PUBLIC_API_REQUALIFICATION.json`; no PvP authorization, roll, damage, or database behavior was exercised.
