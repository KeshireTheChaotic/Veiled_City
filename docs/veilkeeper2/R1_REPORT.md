# R1 — isolated offline kernel

**Implemented and tested preparation shell; R1 acceptance remains incomplete.** Baseline `1ba6c7e15db1a66ba34b36336f31437beffe44d6`. The commit containing this report identifies the exact R1 checkpoint (`git log -1 -- docs/veilkeeper2/R1_REPORT.md`).

New runtime root: `bot/src/v2/`. Run from `bot/` with `npm run start:v2:offline`. The entrypoint imports only the new kernel and Node standard libraries. It reads no environment credentials, imports no Discord/client/legacy GM service, registers no game handlers, sends no messages and commits no effects. Production `npm start` is unchanged.

`kernel.js` implements immutable authenticated source intake through a native authority adapter, unforgeable in-process source handles, one versioned native handler registry, a source/receipt repository contract and an explicitly offline memory implementation. Only `context_read`, `action_propose`, `state_inspect`, and `knowledge_propose` are exposed by the bound model capability object. Native registration/intake are not model tools. Requests have closed outer shapes; model-supplied actor/source references are checked against the bound native proof, and native authority is revalidated on each call and after preparation.

Ordinary speech can be read without typed intent or action creation. Current context reads expose only the authenticated utterance, not a GM context fallback. The action interface rejects unknown operations, uncontrolled actors and stale revisions; native validators own operation parameters. Preparation produces only pending/owner-roll/consent/choice dispositions. Attempts to declare resolved effects are blocked. Identical proposals reuse the receipt and trace without rerunning preparation. Receipt inspection is source/principal/campaign/scene/revision bound. No mechanical rule, RNG, resource mutation, canon promotion or unrestricted state patch is enabled.

Knowledge proposal validation is present, but execution deliberately fails closed until R2 installs source-specific knowledge authority. The shell cannot claim knowledge or publication from a proposal. The four-tool limit is implemented; the requested full capabilities are not yet implemented.

Validation completed:

- Syntax **3/3 passed** for the two runtime files and fresh test file.
- `node --test tests/veilkeeper2/r1-kernel.test.mjs`: **9/9 passed**, zero failed/skipped, exit 0, **61.0235 ms** Node duration. Exact hashes/timestamps: R1_TEST_EVIDENCE.json. Tests use newly authored native authority adapters and a synthetic preparation rule; they prove boundary behavior, **not Daggerheart parity or production authentication**.
- `node src/v2/index.js --offline`: exit 0; reports four tools, zero rules, `effectExecution:false`, `publication:false`. CLI output is saved separately. No model or Discord request was made.

Modified files: `bot/package.json` adds only explicit offline startup and a focused R1 test selector; `bot/src/v2/kernel.js`, `bot/src/v2/index.js`, fresh R1 test, and this phase's evidence. No dependency/lockfile change, legacy path retirement or DB conversion.

Remaining R1 work: real authenticated principal/source adapter and audience-scoped packet contracts, model gateway and outbox publisher interfaces, and dependency-boundary checks. R2 supplies actor/audience/source closure; R3 supplies real rules and atomic effects; R7 supplies durable storage and crash/replay/publication guarantees. Memory-only replay in this slice is not restart durability. R0 dynamic source/record holds remain open. R4–R8 are not implemented.

Rollback: retain the original entrypoint/configuration and leave the offline root unused. No campaign state has changed, so there is no production data rollback to perform. Next exact work: R1 trusted source/packet and transport contracts, then R2 scoped context/knowledge; no live execution before their gates.
