# RF05-F04 C22 ledger

**Status:** LOCALLY QUALIFIED; PHASE INCOMPLETE.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C22-SCOPE.md`](C22-SCOPE.md)

## Implementation

Moved only `materialClaimSchema` and pure helpers into Narrative ownership. Narrative public exports the same schema object that the compatibility module re-exports. The GM uses Narrative public for schema construction and retains the compatibility import for `validateNarrativeClaims`. No behavior, mechanics, or narrative-output limits changed.

## Verification

Frozen 22-file fresh GM-dependent batch passed **27/27**, exit **0**, one blocking launch, **14,098.6494 ms**. The new C22 regression verifies public/compatibility identity, exact required-field variants, and GM's split public-schema/runtime-validator imports. Changed JavaScript/MJS syntax passed **5/5**. RF05 ratchet remains failed at **950** active groups/errors, with **592** source modules, **0** unowned, **2,775** import occurrences, and largest cycle 181. The architecture command did not expose changed-path findings in its console output, so no C22-specific zero-finding claim is made. No transition retired; 48 RF05-F04 assignments remain because the compatibility validator import remains. See [`C22-RUN.json`](C22-RUN.json) for hashes and terminal logs.

## Rollback and limits

Restore the prior GM schema import and schema declaration; remove only C22's module, public export, test, and evidence. No persisted data changes are planned. No provider, network, production data, CI, Discord, or services. Release remains NOT AUTHORIZED.
