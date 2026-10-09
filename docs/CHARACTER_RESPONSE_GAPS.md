# Character-response gap audit

Audited 2026-10-09 after RELAX implementation. Scope: why an authenticated character's
ordinary roleplay may receive silence, a mechanical-looking response or unnecessary
clarification. Production was not started or changed. Tests are synthetic/offline;
they do not establish live-model response rates.

## Concrete regression: PantryQueue

Input:

> **I look up at the rain and sigh, "I need work, PantryQueue isn't pulling in enough money..."**

Expected: acknowledge the expressed need and ask an open question about seeking work
or what work the character wants. An observable, modest lead is also appropriate.
Do not accept a job, award income, infer agreement/debt, move the PC or choose their
feelings. No listener must be invented merely to let the GM ask a framing question.

The attended-role routing hint now recognizes expressed needs despite Markdown,
quoted speech, mixed action and no question mark. It avoids the router model call
for this clear invitation. The main GM instruction covers broader indirect remarks;
if this bounded invitation is returned as `respond:false` or empty narration, native
validation requests one complete replacement turn. OOC and explicit mention-only
preferences remain respected. Verified through the real GM service with fake provider
outputs in `relax-end-to-end-test.mjs`.

## Gaps closed in this implementation

| Cause | Change |
| --- | --- |
| Missing surroundings/person treated as a human worldbuilding prerequisite | Typed autonomous ordinary creation, independent of expansion/delegation flags; runtime prompts and constitution updated. |
| New entity/arrival rejected because validation sees only pre-turn state | Preview and final commit stage world dependencies before final narrative validation, with full rollback. |
| Reflective in-character need filtered as roleplay with no world reaction | Authenticated-role invitation routing plus GM engagement instructions and bounded retry for suppressed output. |
| Low confidence automatically suppressed output or generated human-review notifications | Confidence is advisory; actual native conflicts/mechanics determine validity. |
| Unmentioned party-turn generation/commit failure produced only a private diagnostic | Party generation and commit failures now send the player a referenced retry-safe error regardless of mention. |
| Old ordinary entries remained a generic human `pending` queue | New entries use `awaiting_adjudication`; legacy current requests are lazily revalidated and stale ones audited/expired. |

## Remaining gaps and recommended follow-up

| Priority | Path / condition | Risk and proposed solution |
| --- | --- | --- |
| P1 | `GMService.shouldRespond()`; indirect invitations outside the bounded need/concern hint | Model router can still misclassify subtler subtext, e.g. "Another empty shift." Broaden offline addressee/context fixtures, then measure false silence against banter false positives with an explicitly authorized live evaluation. Do not replace semantics with an ever-growing verb whitelist. |
| P1 | `GMService.runTurn()` / `processPartyTurn()` and `processPrivateTurn()`; ordinary input outside the explicit invitation guard | A model can still return `respond:false`, or true with no usable text. Add a source/audience-aware response obligation from the router and a bounded correction retry for all genuine in-world invitations, not all chat. Avoid sending generic scripted questions that invent context. |
| P1 | `messageCreate` queued-turn catch; failures before inner generation/commit handlers | Declaration/context capture, pre-turn director work or other preprocessing can throw. The outer catch records a state error but does not acknowledge the player's saved/unsaved turn. Add a stage-aware private acknowledgment, tracking whether native effects already committed so retry guidance is truthful. |
| P1 | Router failure outside direct mentions or bounded character invitations | The fallback can still choose silence. Use an authenticated-context fallback or explicit technical acknowledgment rather than reporting success. Respect OOC/mention-only and do not generate actions for an unidentified role. |
| P1 | `routeRollMessage()` / `routeConsentMessage()` | Native roll/consent handling may consume a whole mixed-content message after handling its mechanical part. Preserve exact native authorization, but route remaining unconsumed roleplay to the GM without replaying the mechanic. Verify mixed "I roll ... and ask ..." and proposal reply plus speech. |
| P1 | `autonomous-world.js` / `location-language.js`; existing references without physical state or semantically distant/ambiguous targets | Reference text is not physical presence or legal travel. The native path conservatively refuses unsupported materialization/arrival; a bounded retry should continue description or ask the player only about material intent. Add source-backed reference-to-entity hydration and richer native travel/adjudication adapters rather than routing missing metadata to a human. |
| P1 | Native-only movement grammar and contextual references | Freeform understanding is broader than native travel recognition. Unusual explicit movement, conditional routes, coordinated acts and unbound "there" can stay uncommitted. Extend source-backed semantic travel candidates with negative/quoted/hypothetical fixtures; retain owner/location/encounter checks. |
| P1 | Fixed/locked canon expressed only as freeform descriptions | Native structured keys/status/access checks cannot detect every contradictory new summary. Add targeted conflict-evidence retrieval and semantic preflight using the existing call, then measure false conflicts. Never turn every new noun or low confidence into approval. |
| P2 | `routeDiscoveryMessage()` | Recognized recall is deliberately read-only and returns early. A combined recall plus new question/action can lose its second purpose; a delivery failure is swallowed to avoid accidentally turning recall into a mutation. Add explicit query-versus-action splitting with a private retrieval acknowledgment and exactly-once continuation. |
| P2 | `processPartyTurn()` / `processPrivateTurn()`; no active session | Party chat is silently ignored; private chat explains only on mention. This is an intentional session gate, but confusing. Consider a rate-limited user-visible setup notice without starting a session or choosing an actor. |
| P2 | `resolveController()` / missing attendance or assignment | Multiple roles get an explicit selection prompt; no valid role may receive generic context rather than character-specific engagement. Offer a rate-limited selection/presence prompt. Never guess among PCs or inherit owner-private knowledge through a proxy. |
| P2 | Channel routing / Discord Message Content intent and permissions | Messages outside the configured play/private channels, direct DMs, unrecognized threads, unavailable content, or denied send permissions cannot follow the scene path. Add read-only configuration diagnostics and explicit thread policy. An overlapping play/rules channel can divert scene messages; reject or explain that configuration. |
| P2 | Publication after successful commit | Discord delivery may fail after state commits. Existing output-step notices distinguish this from rollback, but durable per-surface narration outbox/resend would repair delivery without rerunning the turn. Do not advise action retries after commit. |
| P2 | Oversized mandatory context, prompt budget and bounded retries | A valid scene can still exhaust mandatory context or produce repeated invalid structured output. Keep source/ownership/rulings intact; compact authoritative structures semantically and return a truthful technical acknowledgment, not a fictional approval gate. |
| P2 | NPC observation/knowledge and proxy speech boundaries | Remote/hidden NPCs must not magically hear the reflective remark, and human proxies remain controlled by their players. Let narrator framing engage directly; introduce a local ordinary NPC only through validated creation/presence. Expand "no listener exists" and "only proxied listener exists" conversational fixtures. |
| P2 | Veilkeeper intentionally stopped or Discord disconnected | No runtime can answer while offline. Diagnostics/reconnect policy should report liveness, but deployment tooling must never start/restart it without the operator's explicit instruction. |

## Acceptance matrix for follow-up

Measure separately: response to indirect needs, unnecessary clarification, banter/OOC
false responses, invented PC decisions, secret leakage, duplicated native actions,
and truthful error/delivery recovery. Include Markdown/emotes, unquoted speech,
third-person character narration, pronouns, multilingual wording, two-role users,
absent characters, no known surroundings, no NPC listener, human NPC proxies,
private scenes, roll/consent plus speech, API errors and Discord delivery failures.

A successful response need not always be a question. It must acknowledge meaningful
roleplay, offer an appropriate world reaction or open framing, and leave the next
voluntary character decision with the player.
