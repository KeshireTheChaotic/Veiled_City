# Audience-first v9 integration — 2026-10-20

Branch: `codex/audience-first-narrative-v9`. Starting HEAD: `e7fd278fe8f8ed3b82c12782977a297106e8c5c8`.
This task is separate from the preserved, unqualified W6 working-tree changes. No production, provider, Discord registration, permission, role, or schema operations occurred.

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Production integration

| Flow | Correction and authority |
|---|---|
| Assembly | `assemblyHookSelection` supplies the isolated writer brief without constructing publication text. `authorAssemblyScene` uses `authorNarrativeRequests`; only accepted `gm_narrative_unit` parts count as substantive narrative. Hook recitations and legacy composition parts cannot substitute. Orientation remains a separately reported fallback. |
| Opening completion | Acknowledged transport alone cannot complete the opening job. Every slot needs `VERIFIED_SCENE_DELIVERED`; otherwise the job remains `needs_narrative_review`. Existing acknowledged and uncertain deliveries are retained. Explicit plan refresh, not check-in, handles replacement. |
| Late/returning entry | `authorOpeningEntry` uses the existing bounded v9 writer with a dedicated native attendance-derived source. Current attendance, owner/control, scene, selected source revision and audience are checked across authoring and transport awaits. Existing outbox/reconciliation remains the transport authority; missing/rejected narrative stays in review, not hook fallback. |
| Aftermath | Native mutations commit once. Presentation combines a closed native aftermath status with independently verified existing output parts, never arbitrary `player_summary`. Play and journal reuse the same prepared material. Reconfirming an applied aftermath recovers publication without rerunning effects. |
| Downtime | A GM-private authoring lease precedes generation. Project coverage and current sources are checked before atomic commit. A committed job saves exact native publication inputs. Source-certified project status/world-cycle projections work without an active or fabricated session; current ownership, cycle/project snapshots, source session and authoring source remain enforceable after restart. Uncertified result/Director prose stays GM-private, including the status command. |
| Downtime recovery | `/vc-downtime resolve` with no open cycle recovers the latest committed job's saved publications, without new generation or mutations. Known-not-sent outputs may retry; acknowledged, sending/interrupted and uncertain outputs cannot be blindly reposted. |
| Proxy packet | Uses the actual approved database packet, current assignment/controller and active source references. Native recipient checks run before every chunk and relay send. Durable revision-bound delivery leases prevent acknowledged/uncertain replay; GM notes are not packet content. |
| Evidence handout | Requires the exact active native handout, current recipient/owner and audience-visible active evidence. Rechecks after lookup and before transport. Native attachments cannot be replaced by caller metadata. Durable delivery leases hold interrupted/uncertain attempts; an attempted private send never falls through to another route. |

`lifecycle-output.js` is a closed renderer within the existing `pvp_output_part`/group/prepared-output machinery, not another creative authoring engine. Its native mutation/source receipts authorize only stored lifecycle metadata. GM-private source payloads never become published fiction. Exact native downtime titles are checked without disabling the archive guard. No additional aftermath/downtime model calls were introduced.

Historical hook renderers/records remain readable for reconciliation and acknowledgment ancestry. Their old output kinds cannot resume as new substantive fiction. Native simulation hook notices, mechanics, player choices, temporary-identity/canon controls, manual GM authority and historical outcomes were not replaced.

## Targeted evidence

Disposable fixture SQLite, deterministic synthetic providers/transports and `scripts/offline-guard.mjs` only. No full validation registry was run.

Initial selected assembly run: 4 passed / 3 failed. The three failures expected a raw personal hook after rejected fiction; agency/quarantine assertions passed. Those obsolete recitation expectations were migrated to unresolved narrative/fallback assertions, not weakened to accept forced PC behavior.

Executed commands from `bot/`:

1. `node --import ./scripts/offline-guard.mjs --test scripts/assembly-hooks-test.mjs scripts/assembly-authority-test.mjs scripts/session-opening-entry-test.mjs scripts/session-opening-attendance-test.mjs scripts/audience-first-integration-test.mjs scripts/v96-fresh-authoring-test.mjs scripts/lifecycle-publication-test.mjs scripts/recipient-publication-test.mjs`: **150 passed, 0 failed, 0 skipped**, exit 0. Log `.reports/audience-first-final-targeted.log`. Subsequent changes were confined to the affected opening/lifecycle paths and requalified below.
2. `node --import ./scripts/offline-guard.mjs --test scripts/assembly-hooks-test.mjs scripts/assembly-authority-test.mjs scripts/session-opening-entry-test.mjs scripts/session-opening-attendance-test.mjs scripts/lifecycle-publication-test.mjs scripts/recipient-publication-test.mjs`: **97 passed, 0 failed, 0 skipped**, exit 0. Includes the added orientation-is-not-completion regression. Log `.reports/audience-first-affected-final.log`.
3. After final downtime source binding/status changes: `node --import ./scripts/offline-guard.mjs --test scripts/lifecycle-publication-test.mjs scripts/recipient-publication-test.mjs`: **13 passed, 0 failed, 0 skipped**, exit 0. Log `.reports/lifecycle-recipient-final.log`.
4. `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30ai' scripts/v9-pvp-authorship-test.mjs`: **6 passed, 0 failed, 0 skipped**, exit 0. Existing revocation, private/party adapter, voice replay and actual aftermath assertions unchanged. Log `.reports/aftermath-final.log`.
5. `node --check` on `assembly-context`, `assembly-state`, `assembly-planning`, `commands`, `gm`, `narrative-authority-context`, `opening-entry-context`, `opening-entry`, `publishing`, `pvp-output`, `session-opening-runner`, `lifecycle-output`: all exit 0.
6. `git diff --check`: exit 0 (Git reports normal LF/CRLF conversion warnings).
7. Final acknowledgment-reader correction (the initial opening may select one of two still-current hooks): `node --import ./scripts/offline-guard.mjs --test --test-name-pattern='duplicate check-in retains|four owners retain|orientation alone' scripts/session-opening-entry-test.mjs`: **3 passed, 0 failed, 0 skipped**, exit 0; `node --check src/opening-entry.js` exit 0. This prevents duplicate entry when an acknowledged initial opening used a valid subset of the current owner sources.

No pass counts are claimed for the unrelated W6 changes or the complete release registry. Logs are local artifacts, not imported campaign material.

## Test migration

`opening-writer-fixture.mjs` replaces only the provider, calling real GM authoring/preparation/outbox APIs. Assembly tests now distinguish fictional listings/circumstances from hook recitation; rejected fiction cannot fall back to raw sources. Entry tests require accepted v9 units and retain ownership/proxy/absence/source/payload/restart/uncertainty assertions. A legacy NPC-composition test now verifies that composition cannot substitute for a v9 opening; actual v9 NPC speech remains covered by audience-first integration tests. Explicit refresh after historical orientation is allowed to deliver new substantive fiction, but never resend acknowledged narrative.

## Limits and operation

- Fresh accepted v9 prose retains the existing framework's documented residual semantic risk; ownership and model safety labels are not universal semantic proofs.
- Uncertified aftermath/downtime paragraphs are deliberately not published. Native status/progress and already verified parts are delivered instead. Arbitrary private Director prose needs applicable source proof, not a blanket no-session waiver.
- A provider/crash-uncertain downtime authoring lease stays held for GM inspection; it is not automatically regenerated. Sending/uncertain delivery leases require exact administrative reconciliation before a resend. No UI for inventing approval or dismissing uncertainty was added.
- No live performance, live delivery or full release qualification is claimed. No push/deployment is part of this task.
- No schema migration: additive native city records, source events and receipts only. Rollback code must preserve these records and existing acknowledgments; never delete receipts to force retries.
- Existing W6 source/tests, owner files and generated manifests were preserved and excluded from this task's commit. Final release manifests/full qualification remain the separately scoped W7 responsibility.

The completion commit is recorded by Git history; this document does not embed its own self-referential SHA.
