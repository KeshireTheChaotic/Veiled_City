# RF05-F04 C23 ledger

**Current status (2026-10-26): SCOPED PAIR ADOPTION QUALIFIED; LOCAL HOLD RESOLVED.** See `C23-REOPENED-RUN.json` and the closeout below. The original withdrawn attempt remains unqualified historical evidence. Revised scope records the current reverse-graph basis, supported public contracts, test replacement and saved-reader assessment.
**Base branch/SHA:** `codex/clean-ai-gm-2026-10` / `87be9d2eb4f57b97c680d1b60f3117e1a5a594b7`.
**Scope:** [`C23-SCOPE.md`](C23-SCOPE.md)

## Implementation

Attempted to place the World+Intent NPC Director schema in the `intent--world` bridge and preserve the historical `simulation-schema.js` exports. The GM bridge import and 28/28 fresh cases worked, but the World-owned compatibility module then imported the bridge, producing `FRAMEWORK_IMPORTS_PAIR`. That violates the rule that frameworks cannot import their adapters. The attempted code and bridge registration were withdrawn. Exact affected ownership question and temporary source hashes are in [`C23-RUN.json`](C23-RUN.json). The separate World-only action-catalog extraction is not part of this hold and proceeds as C24.

## Verification

The attempted 23-file batch passed 28/28, exit 0, 13,681.0205 ms, but does not qualify the withdrawn code. After withdrawal, changed-code syntax passed 5/5. The RF05 ratchet returned to its previous 950 groups/errors, zero unowned, 592 modules and 2,775 imports. No transition changes were made for this attempted slice.

## Rollback and limits

Restore the prior schema/catalog declarations and imports; remove only C23 modules, bridge registry/API changes, test, and evidence. No data migration is planned. No provider or external service use. Release remains NOT AUTHORIZED.

## 2026-10-26 C23 reopened and resolved

Audit proved only GM imported the static simulation schema; it was not a saved-receipt reader or executable entrypoint. Revised scope retires that source after its sole caller adopts the Intent–World pair, preserving exact serialized schema fingerprint 10bbb4dcf1ee42ef7e0b65eb9a6a98db5a27f28ddc64bd5b704c02c117c31024, nested World/Intent object identity and current public World exports. Six wholly new actual GM/schema/transport tests passed 6/6, exit 0, TAP 1367.0752 ms; changed-file syntax 3/3. Five total mocked provider dispatches across GM cases; identical concurrent callers share one request, refusals stay one and malformed JSON retains two attempts. Native SQLite state unchanged by planning. Three exact obsolete records retired with originals retained. RF04 ratchet exit0; RF05 exit1 on 944 expired groups/errors, 603 modules, zero unowned, 2797 imports, largest SCC181. Prior withdrawn attempt and obsolete-reader test results remain historical, not current acceptance. Source/test/log hashes and replacement matrix: C23-REOPENED-RUN.json. C23 hold resolved; RF04/RF05 remain incomplete. Provider cost $0; Codex UNMEASURED; RELEASE NOT AUTHORIZED.
