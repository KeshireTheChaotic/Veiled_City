# V96-05R ordinary output and fresh NPC authoring

Status: **V96-05R qualified offline**, OUT01–OUT06 and original SEM06. Final same-executable-tree validator **140/140**, zero failed/not-run; check and both D08 gates passed. Evidence: [V96_PROGRESS.md](V96_PROGRESS.md). Starting commit: `aeffb8e3b5ec2a9bfee18af7081fea0ab49e181d`. Application remains 10.0.0. This is not V96-05S/05E, unrestricted-prose approval or a live-play qualification.

Accepted typed intents are canonical adjudication inputs; authenticated human declarations own intent; native services and receipts own outcomes. Narration projects authorized fiction; narration cannot execute or certify its own effects.

## Authority lanes

| Input | Native authority / allowed projection | Never authorizes |
|---|---|---|
| Raw GM narration, summaries, private messages, claim lists or safety labels | GM-private draft/quarantine only, unless independently reconstructed | PC injury, decisions, custody, consent, disclosure or successful uncertain actions |
| Existing v1 GM-world acts | Current native NPC/location, occupancy, ownership/proxy, perception and audience | PC response, extra facts, mechanics or secrets |
| v2 source composition | Exact independently recorded NPC quotation/knowledge plus existing bounded NPC acts; no whole-profile passthrough | Truth of quoted allegations or a PC effect |
| v3 `npc_fresh_request` | One isolated authoring attempt; current source, native NPC agency and audience, then explicitly attributed nonbinding speech | Semantic truth, PC participation/reaction, new capabilities, world effects or disclosure rights |
| v4 `native_outcome` | Read-only exact native resource, roll, custody, delegated entry or commitment result, with its existing rules/owner/audience checks | Applying an effect again, generic success, adjacent PC choice, ownership invention or public disclosure of private acceptance |
| Native arrival, observations, Fear, continuation, notices and per-owner PvP clauses | Existing corresponding native validator/renderer, current source and exact audience | Any outcome outside that receipt or owner clause |
| Native publication proof | Exact ordered rendered parts, final payload/chunk and audience | Certification of arbitrary replacement bytes or future delivery after revocation |

The old finite nonmaterial grammar is unchanged. It preserves already supported idioms; it is neither a universal semantic detector nor the new expressive authoring route. `PVP30ag` sentences were not added to a catalog. Legacy direct validation can provisionally accept unowned scene prose, but returns no publication capability. Only native preparation can queue/send it.

`validateNarrativeClaims` explicitly reports `publication_authorized:false` for such provisional validation; `ok` only reports its claim checks. Neither field is a serialized publication capability. The queue requires the native in-process preparation and persistent part proof regardless of those flags.

## Fresh NPC stage and residual semantic risk

The existing combined GM request supplies a closed request: `{version:3,kind:"npc_fresh_request",entity_key,focus,source_refs}`. It cannot supply the utterance, a `gm` flag, an approval or a receipt. `gm-fiction-schema.js` is data-only; `gm-world-scope.js` reuses the existing scope checks without importing response/effect execution.

The current combined GM prompt includes GM-private facts, cognition, character hooks and other-owner context. A subsection of that same request cannot provide independent audience isolation. Consequently this implementation uses **one conditional isolated writer request**, not an unconditional second call. No fresh request, invalid request, unavailable NPC, interrupted attempt or valid cached authoring means no new writer call. The budget is shared across turn replacements. This stage runs before preview/commit, shares the existing turn deadline, has no structured-repair fan-out and never runs after mechanical commit.

The writer inherits the owning turn/Director operation's configured model; it does not silently choose a weaker routine model for Director narration. An aborted operation cannot mint a speech source even if its provider returns late. A genuinely source-verified fresh response can satisfy the responsiveness check with empty raw narration, avoiding a throwaway unsafe paragraph or unnecessary main-model correction; full native preview/commit/publication checks still apply. This is integration correctness, not a real-world optimization measurement.

The writer receives only an opaque speaker token, bounded focus, audience label, exact currently visible NPC observations/knowledge and explicitly public voice direction. It receives no true NPC key/name, player input, GM-private profile paragraph, hidden fact, another owner's context, previous response ID or conversation history. Source refs require active observed native events in the current scene/location, the exact quote and matching non-secret known NPC knowledge. Source IDs/flags alone do not grant authority; the source-producing native adapter owns privilege. Public voice configuration is an explicit disclosure, not a license to include private portrayal.

Before I/O, a GM-private `npc_authoring_attempt` is saved. Interrupted/failed attempts hold `needs_scope_review`; they are not blindly regenerated. An authored cache binds the exact source/scope/evidence/control history. A separate immutable `native_fresh_npc_utterance` event records attributed speech, **not a PC declaration or effect receipt**. Revalidation after the await prevents TOCTOU source changes; every subsequent projection checks current source, NPC/control history, owner, scene, evidence and audience. Proxy takeover/release invalidates old proof, including ABA history. Internal canonical NPC keys remain private proof material; fresh speech uses a generic attributed NPC label. Native preparation notices use a validated registered display alias, not the canonical key.

One authoring stage means one logical writer operation, not a guarantee of one HTTP attempt under transient provider failures. It reuses the existing bounded provider retry policy and reported-usage metrics, with SDK retry fan-out disabled. Actual HTTP/token/billing behavior remains unmeasured offline. No unconditional call, per-clause classifier or new after-commit generation is approved.

**Residual risk is explicit:** `semantic_verification:false` is stored. Fresh words can still be mistaken, misleading, or refer indirectly to a PC; no finite name tripwire proves their meaning. The native contract certifies the NPC's attributed utterance, **not the truth of its assertions**. It grants no canon, knowledge promotion, outcome, costs, custody, PC reaction or resource mutation. Formatting is escaped and quote-wrapped. Named-PC references and malformed/control-bearing output are held, but those checks are defense in depth, not semantic certification. No paid/live quality, latency or cost improvement is claimed.

Fresh writing currently covers one eligible, already established NPC per logical turn. It cannot establish a same-turn new NPC from a rolled-back preview receipt. No blanket new environment-paragraph authoring, probabilistic safety classifier or extra mechanical adapter is introduced.

## Common publication boundary

`state.applyAuthoritativeMutation` prepares output before and after native world work. Unknown prose/annotations stay GM-private; independently valid native actions remain transactional. `queueTurnPublications` requires the in-process preparation capability even outside PvP. A model cannot serialize or mint that capability.

Existing committed canon annotations keep their exact ledger/audience check **before** preparation. Quarantine does not waive that native gate or its existing bounded correction/final-rejection behavior. `gm-recovery-regression-test` remains unchanged. A false canon annotation cannot silently become a new canon-ledger entry or bypass the historical three-failure rejection.

Original candidate claims and wording also remain available to the native post-application result audit through `candidateNarrative()`. Clearing quarantined annotations from publication must not clear the existing `committed_result_mismatch` check against actual event results. The candidate is a private validation input, never a publication capability. Without an active session its `draftOnly` record cannot authorize queueing.

All explicit candidate annotations retain the original native witness, knowledge, lifecycle, disclosure, movement and resource checks after staged native effects. Invalid annotations follow the existing rejection/rollback and bounded correction policy; omitted claims cannot certify output. Independently receipt-rendered output with no model claims is validated by its complete native part proof, not required to repeat model annotations just to satisfy lexical tripwires. Delegated `scene.enter` arrival is projected only after the real accepted native intent/presence receipt, with current declaration, owner/principal, scene, location and audience; no new movement executor or gameplay permission is added.

Version-1 output parts bind renderer/version, kind, source/hash, session/scene, scope, current principal where applicable, exact renderer inputs, evidence/native receipt and exact text/hash. Version-2 publication records bind ordered part IDs, full rendered text hash, turn/ordinal, surface/recipient/character/visibility, chunk index/count and final payload hash. Enqueue and deferred delivery reconstruct the exact payload with the same UTF-16 chunker. Removing, altering, appending or reordering text cannot reuse the old proof. Legacy v1 publication proofs still require exact current reconstructed payloads; missing proof fails closed.

When projection holds generated handout/cognition fields, already validated post-turn review is deterministically reconciled against the remaining structured outputs. Prior normalization corrections remain in the native private audit across preview/commit; review metadata cannot claim a quarantined mutation occurred.

Composite native groups are persisted by content/part hash. Only exact current groups can be reused or narrowed to an authenticated private owner. Private-to-party promotion is forbidden; observer-specific answers cannot be redirected to another observer. Source/owner/scene changes hold future sends, not reverse already committed effects. Unknown Discord sends remain uncertain and are never automatically reposted.

## Sink inventory / compatibility limits

| Sink | Enforcement and compatibility |
|---|---|
| GM turn / party-private Director / continuation / native notices | Same prepared parts, native validators and outbox; fresh writer uses the same boundary |
| Deferred Discord delivery/restart | Persisted exact-payload proof, current source/audience/owner validation; no mechanical replay |
| Journal/recap/archive | Current exact party parts/groups or verified delivered historical excerpts; a generated recap stays private even when the session ends |
| Voice / cached/repeated audio | Exact delivered party turn, current authorization before synthesis/replay; private/unverified text is rejected before provider use |
| Direct arrival/assembly/downtime/proxy private prose | Explicit generated-producer guard; unproven legacy packages are held privately before transport, never treated as native UI merely because delivered by a command |
| Case boards / NPC and location reference pages | Native record metadata and exact currently verified description only; unsupported labels/notes/summaries held GM-private. Revalidate after channel/message awaits. Only confirmed missing-message errors permit replacement; uncertain edits never fall through to a new send |
| Descriptive context memory | Preserve authenticated player-input referents with the existing audience contract and exact supporting source excerpt; ignore model summary text. No raw quarantined narration becomes memory |
| Generated cognition/handout candidates | Retained in GM-private drafts, not automatically promoted. Existing independent native perception, typed dialogue, memory services and receipt-backed operations remain in place |
| Native roll/consent UI, operational notices, human-authored/imported artifact workflows | Keep their existing dedicated native adapters and privacy policies; raw transport is not a model publication capability |

Native calendar hooks project only verified fired/approved shared deadline metadata from the actual `scheduled_deadline` mutation/event/schedule chain. Hook/title paragraphs are ignored; a deadline never implies attendance, agreement or a PC action. This is a read-only output adapter for an existing native effect, not a new effect executor. Hook delivery uses the common outbox's numeric delivered count and persisted error diagnostics; a proven `NOT_SENT` failure may retry, while uncertainty may not.

**Known compatibility limitations, not hidden successes:** arbitrary ordinary private messages, generated assembly/arrival/proxy packages and no-active-scene downtime narration lack a structured expressive projection and remain held. Their native work is not undone. Unverified historical reference descriptions do not acquire proof through resync. Generated recap synthesis is replaced by exact delivered excerpts, not represented as a verified summary. New cognition/handout prose remains review-only. These routes have not gained new effect adapters; 05E is not implemented. If these restrictions fail the owner's quality floor, the phase must remain blocked rather than waive authority checks.

## Acceptance / tests

| Case | Production-path evidence |
|---|---|
| OUT01 | All six original `v96-semantic-output-p0-test.mjs` assertions unchanged; real GM/preview/commit/outbox negatives and original idiom/declared-claim positives |
| OUT02 | `v96-fresh-authoring-test`: forged main-model words/authority/receipt, direct cross-PC writer output; ten unnamed party/private injury/choice/custody/false-uncertainty contrasts; existing PVP30/PVP30q guards unchanged |
| OUT03 | Fresh source-specific work dialogue through actual GM and commit/outbox, isolated prompt traps, v2 threat/open question, native atmosphere, original PVP30ag positives unchanged; independent module import checks |
| OUT04 | Original Billy sibling/native arrival and FH40 tests, exact private resource receipt without replay, source-owned context survives quarantine without storing model summary |
| OUT05 | Party/private Director, journals/voice, generated-private guard, composite reuse, source revocation during/after authoring, restart/cache, exact byte binding, case-board/references, async revalidation and uncertain edit guards; existing publication/D08/privacy tests |
| OUT06 | Real owner-reviewed feature cost, actual NPC attack/defense/Armor/terminal HP receipt, owner collection/custody, exact accepted commitment/private disclosure; existing native roll/arrival/notice/Fear projections retained |

No new test replaces an original P0 assertion. `v95-deprecation-coverage-test` recognizes exactly **twelve** line-level fixture/API replacements, not a generic exemption; the historical 3,556-assertion evidence file is unchanged. Both new suites are registered in default validation and REL01.

| Historical suite / line | Exact replacement / retained assertion meaning |
|---|---|
| `v9-publication-test` P05 | Real session and `nativeResult('different')`; identical immutable-payload rejection/regex |
| `simulation-regression-test` native hook exact body | Real current preparation/audience/acknowledgement, not an unrelated courier action; identical exact-body/no-duplicate/retry purpose |
| `city-depth-regression-test` delivery failure | Common outbox returns zero; persisted `NOT_SENT` failure diagnostic must match the original error, then safe single repair |
| `endurance-test` delivery failure | Genuine native deadline; same persisted explicit failure/repair/no-replayed-event/unchanged-PC invariants |
| `portrayal-authoring-test` first voice call + assertions | Delivered native text and turn ID; identical private voice-direction exclusion assertion |
| `portrayal-authoring-test` second voice call + assertions | New current native projection after direction changes; identical approved direction/voice assertions |
| `narrative-contract-test` structured repair candidate | Compare the retained original candidate, not unproven no-session publication; additionally require empty publishable narration. Existing result-mismatch/rollback checks remain unchanged |
| `prompt-budget-test` no campaign mutation | Compare every committed fixture table instead of SQLite `total_changes()`, which includes rolled-back preview writes. Same no-state-mutation expectation across both scope/flag pairs and retries |
| `expansion-quality-test` two legacy parse/metric lines | Identical raw 5.0 fixture retained as a candidate; explicitly require no-session publication held and report that limitation, not unchanged published narration. Count the common boundary's rejection code as rejection; no expected case outcome changes |
| `end-to-end-a-test` nonbinding prose | Same original paragraph retained as a private candidate; additionally require no-session narration empty. All governed-intent results, retries and replay checks remain |
| `end-to-end-i-test` safe output | Supply existing native room atmosphere and actual observer location instead of an unproved rain paragraph; require exact meaningful native atmosphere, not neutral fallback. No formatter/catalog added. All eleven features, owner refusal, native policy guards, request counts and replay remain |

`v95-operational-metrics-test` retains every original assertion and now supplies a genuine marker-bearing native quotation; additional normalization detects escaped marker leakage too. No test can obtain a native capability by labeling an arbitrary string safe.

`i-heard-you-7-test` retains every historical assertion and now obtains its saved recap from a genuinely delivered native excerpt. A raw string written to `endSession` is no longer a certificate. The fixture also rejects that raw candidate in shared history, while preserving read-only/no-write, scope, GM-only and restart checks.

## Persistence / rollback

No SQL schema migration, credential/configuration change, production DB operation or existing outcome rewrite. Additive city records/world events hold authoring attempts, utterances, output groups, parts, publication proof and GM-private quarantine. Native dice, damage, Hope/Fear, consent, custody and death receipts remain separate and unchanged. Old unsafe prose is not retroactively certified. Rolling back code must not delete campaign outcomes or replay effects; keep new records as inert history. A pre-boundary rollback reopens the original P0 and must not be represented as a safe deployment. No deploy/push/live pilot is authorized.

Future separately authorized rollout: inspect pending/uncertain publication metadata using the existing GM-only operational/recovery services. Missing or stale proof stays held; never manufacture a certificate by hashing old paragraphs or replay mechanics to recover text. Use a currently valid native receipt projection for a genuinely new recoverable notice only under its existing source/audience/idempotency policy. Unknown transport status requires reconciliation, not blind resend. Preserve imported characters, historical mechanical receipts and new additive records. This work performs none of those production operations.
