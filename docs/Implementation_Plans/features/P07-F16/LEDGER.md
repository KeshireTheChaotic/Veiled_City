# P07-F16 — Ledger

**Status:** COMPLETE — the actual opt-in runner rejects duplicate root keys before parsing.

| Field | Evidence |
|---|---|
| Changed code | `bot/scripts/ai-gm-delta.mjs` exports and uses `parseCoverageJson` at the actual `coverage.json` loading site. The scanner decodes each root key with JSON string escape semantics, rejects duplicate decoded keys, and requires the raw document to be structurally valid with no trailing data before returning `JSON.parse(text)`. No dependency added. |
| Coverage | Existing unique mappings retained; bridge and GM unions include the new F13/F14/F17 tests, and the runner mapping includes F16. Selector output is verified. |
| Test | Final fresh union command recorded in F13/F18; F16: 3/3 passed for whitespace duplicate, escaped-key duplicate, valid unique maps, malformed/trailing JSON, and mapping unions. Overall batch exit 0. |
| Hashes | `ai-gm-delta.mjs` `94CD4341D97F343C2E52B4BC5FE3A6078881ACC2E41B246640FB0015745452DE`; `p07-f16.test.mjs` `89EBE4DBDBD01D8346591079C4F256C12ECEAC2097979C426EE44CB7425A4A4F`; coverage `B9B66BFD694C032F9209B95CEF22DAE2286D28EC280F6B11920EC7F51104BB89`. |
| Cost/cache | Local CPU-only parser and selector tests; no provider, network, CI or cache activity. |
| Rollback | Revert the F16 loader and matching coverage/test changes together. No registry format migration. |
