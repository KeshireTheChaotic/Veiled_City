# RF04 Session assembly ownership audit

Audit baseline `57cafa536b0350a68be47e9b355de3f79312950d`, with unrelated concurrent work possible. This is a read-only design record; it does not change code, a deadline, an owner or a transition.

## Current responsibilities and consumers

- `bot/src/assembly-state.js` is classified Session and contains Session plan hashing, roster/slot selection and audience orientation. It also synchronously imports application-owned `bot/src/assembly-delivery.js` for `assemblyPartsFor` and combines those legacy part keys with delivery-state and native publication rows in `legacyAssemblyState` and `assemblyDeliverySummary`.
- `assemblyPartsFor` derives private/public text chunks and stable SHA-256-based part keys. Those keys read existing `plan.delivery_state`; altered formatting, chunking, index, hash or user binding can turn an already delivered part into a new part and cause a resend. CHUNK01 moved the exact Discord splitter into its owner while preserving its root reader and verified one private/public saved key example. The Session-to-application dependency remains.
- Application `assembly-publications.js` consumes slot, hash, legacy status and summary functions. `assembly-readiness.js` consumes the summary and is used by the application command. Session's `sessionAssemblyStateSource` also exposes the summary and plan hash. The `narrative--session` adapter supplies the summary to the Narrative–World bridge; `nativeInitialOpeningRequest` uses it to decide whether a private hook or public narrative was already delivered and verified.
- The original root `assembly-state.js` is imported directly by `bot/scripts/assembly-hooks-test.mjs` and `bot/scripts/session-opening-test.mjs`; `assembly-readiness.js` is imported by `bot/scripts/session-opening-integration-test.mjs` and `bot/scripts/session5-narrative-test.mjs`. These files are historical tests under the initiative's no-legacy-test policy, but the repository still exposes historical validation as a separate workflow. They are not proof of an external public API; their imports are concrete evidence that deleting or repointing root paths would affect that workflow. The owner question concerning import-only legacy-script repointing remains pending.

## Exact architecture obligations

- Session legacy location `bot/src/assembly-state.js`: `523c3a685261c52bce4b0dc71b1a4b773001fbf8ed32e9a4183238a4bfaf736f` (RF04-F04).
- Session direct import of application `assembly-delivery.js`: `064aedfa6b9b9dd7c1b944923077be363619ef9e3ecf34685bbca8eca4ce3e46` (RF04-F04).
- Session legacy location `assembly-readiness.js`: `57c6e53aebef3e50e6c531a18403543f8d9ff9eb5b4d6872ec10f99b2b4ed362` (RF04-F04).
- Application legacy location `assembly-delivery.js`: `af265ceba3c90cc686b04c6424d657642701183eb9799b04fb288ca88bda154a` (RF05-F05).
- Narrative–World bridge location `4bc95a553bacc6e98c2d56bf7253c21cab5e76e3330084883deb2e18454697b4`, private Narrative import `b749993b40541b19325f318321ac624cc099c497597c6cfa09f3019b353a29ed`, and cycle `bda71a2e0997cb11d1df420f438ebd5cfa66280edaf49dcf0f910d86030aac8a` remain separate RF04-F05 obligations.

`narrative--publication` and `publication--session` are `PROPOSED_NO_API`, with no registered consumers or tests. `discord--publication` is `CONTRACT_ONLY_UNWIRED`; its current transport contract does not establish an assembly-parts projection. No present registration proves an adopted delivery-summary contract among these owners.

## Dependency order and compatibility boundary

1. Review and separate the pure Session plan/hash/slot/orientation responsibilities from delivery formatting, native publication status and saved legacy part interpretation. Keep the existing source bodies and private-audience checks authoritative; the application coordinator must supply dependencies rather than letting Session import an application implementation.
2. Give the original part projection and delivery evidence a genuinely accountable owner. If Publication owns it, it needs an exact Discord text-splitting interface and original function wiring, with new focused evidence for chunk boundaries, historical part keys, audience binding, uncertain/delivered states and replay. The CHUNK01 result covers only its stated examples and is not full delivery qualification.
3. The Narrative–World bridge needs a separately owned delivery-status projection through an actual registered Narrative–Publication pair or an application workflow. Hiding an Application callback behind the existing `sessionAssemblyStateSource` would leave a third-owner dependency in a nominally two-owner pair; it does not establish the proposed contract.
4. Preserve cold synchronous root readers until a verified compatible path exists. A newly injected startup-only port cannot simply replace `assemblyPartsFor`: direct cold `legacyAssemblyState` and the existing root readiness reader previously needed no application bootstrap. The main bot's startup composition alone does not prove these cold paths equivalent.
5. The architecture checker reports `LEGACY_MODULE_LOCATION` for non-stable legacy paths even when they are one-line shims. Reclassifying the unchanged root reader or adding it as a stable entrypoint merely to suppress the record would change policy instead of moving the responsibility. A genuine split plus a reviewed compatibility/retirement decision is needed; retain the actual record until then. Do not add or renew transition debt to make a gate pass.

No production, test or manifest files were edited for this audit; no tests ran. This is not RF04 completion or release authorization.
