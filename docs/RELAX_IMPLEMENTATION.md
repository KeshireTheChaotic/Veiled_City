# RELAX implementation

Implemented in development on 2026-10-09 against 9.5.0, not the plan's older 9.2.0
snapshot. Production is unchanged by this work. No deployment, Discord registration,
paid model evaluation or bot startup/restart is part of this work. An independently
launched Veilkeeper process was observed and left untouched.

## Authority and native flow

Veilkeeper is the ordinary-fiction GM. Basic places and people no longer depend on
the optional authoring/minor-NPC flags or an expiring operations delegation policy.
Explicit manual world authority remains available. Existing optional operations,
owner consent, dice, resources, encounters and major campaign changes retain their
native controls; this is not blanket administrator authority for the model.

`authenticated owner input -> source-bound proposal -> identity resolution ->
location/NPC creation -> arrival/presence -> existing state/cognition effects ->
final narrative validation -> transaction commit -> Discord publication`

- `autonomous-world.js` supplies bounded closed `world_additions`, `scene_actions`
  and `world_conflicts` contracts. It uses canonical simulation locations/NPC state,
  NPC profiles, references, world events, existing canon conflicts and the existing
  mutation ledger. City-record receipts are provenance/idempotency records, not a
  second physical world or canon store.
- The exact same resolver runs inside generation preview and the authoritative
  commit. Preview always rolls back; final claims see transaction-local entities
  and arrivals. Invalid actions/claims roll back creations and all consequences.
- Stable identities are reused by key/name. A replayed message uses its durable
  per-session/character receipt; serialized guild turns and native transactions
  prevent competing creation from producing duplicate named entities.
- New nearby places are grounded in the acting character's current location, or
  have no invented parent when that position has not been established. Searches
  reveal candidates without assigning a new PC location. Actual entry requires an
  owner-authored movement clause, matching destination, local accessible geography,
  current attendance/control, and no active-encounter bypass.
- Native movement accepts a current explicit declaration or a unique still-current
  legacy entry source. Quoted examples, hypothetical/conditional acts, stale scenes,
  wrong owners, changed positions and private-to-party source reuse are rejected.
- `location-language.js` resolves keys, display names, aliases, possessives and
  source-backed contextual references. Meaning alone never authorizes movement.
- NPC creation stores a bounded role/identity/voice, zero simulation resources and
  no granted knowledge, powers, adversary stats or secret answers. Introduction
  requires actual shared location and excludes human NPC proxies. Three legitimate
  introductions promote an autonomous background NPC to supporting; replay does
  not count twice. Existing cognition/portrayal systems then reuse that identity.
- Private creations, references, arrivals and presence remain character-scoped or
  GM-private. Secret identity collisions are not a license to duplicate or publish
  the identity. A private record cannot silently become a party reference.
- `world_conflicts` requires a specific current canon event and a different proposed
  value. Only the disputed canon change is queued; existing canon stays unchanged
  and unrelated narration/effects can continue. Missing records/low confidence are
  not accepted as conflicts. Existing canon-resolution tools perform reconciliation.
- Confidence metadata no longer creates human-review spam or suppresses an otherwise
  native-valid ordinary turn. Mechanics, scope, source ancestry and canon validation
  remain mandatory regardless of confidence.

## Backward compatibility and defaults

No destructive schema migration or data reseeding is required. New metadata uses
existing extensible city records; absent authority configuration reads as autonomous,
with both ordinary creation types enabled and conflicts-only fictional review.
This does not reinterpret an existing general operations delegation policy as
permission to spend resources or run disabled expansions.

On the owner's next authenticated input, legacy `pending` scene entries are
revalidated against owner/source/session/scene/current location. Valid ones become
`awaiting_adjudication`, not a human inbox prerequisite; stale ones become `expired`
with an audit entry. A valid original declaration can be adjudicated in the ensuing
GM turn. Completed arrivals resolve matching entries. Manual reviews and historical
requests remain readable. There is no background replay of historical travel on
startup and no autonomous paid migration call.

## Existing Discord commands extended

These extend JSON operations on already registered `/vc-story` subcommands; no new
slash-command registration is necessary. They remain GM/admin-only.

```text
/vc-story author json:{"op":"authority","gm_authority_mode":"autonomous","auto_create_locations":true,"auto_create_npcs":true}
/vc-story author json:{"op":"authority","gm_authority_mode":"manual"}
/vc-story scene-view json:{"op":"autonomous"}
/vc-story scene-view json:{"op":"autonomous","session_id":"<session UUID>"}
```

Autonomy is the default; the first command is only an explicit configuration reset.
The report is read-only and GM-private, with bounded entities, creation source events,
current revision fingerprints and evidence-linked conflicts. Optional operations
delegation remains configured separately through `/vc-story delegation`.

An explicit description correction preserves identity, location, player control,
original privacy and history, and adds a reasoned mutation-ledger entry:

```text
/vc-story author json:{"op":"retcon","kind":"location","key":"<entity key>","expected_revision":"<report fingerprint>","summary":"Corrected ordinary description.","reason":"Why this correction is needed."}
```

`kind:"npc"` corrects portrayal; it cannot rewrite a currently proxied NPC. This
tool cannot change dice, travel, resources, secret knowledge or canon. Use existing
native GM tools for explicit geography/access edits and canon reconciliation.

## Verification and limits

`autonomous-world-test.mjs` and `relax-end-to-end-test.mjs` cover the Tyrell search,
empty-world discovery, diner creation/arrival, restart/replay, possessive identity,
local zones, NPC creation/reuse/promotion, no granted knowledge, conflict isolation,
private/guild boundaries, proxy/owner/attendance guards, encounter denial, schema
rejection, full rollback, manual opt-out, legacy revalidation and description retcon.
The scripted GM service test proves the exact PantryQueue remark routes to a turn,
that suppressed output gets a bounded correction retry, and that preview plus the
shared production commit can establish and narrate a new arrival.

The repository's existing offline tests retain native roll/resource integrity,
epistemic source isolation, locked access, alias/context retrieval, export/import,
privacy, publication failure, restart/restore and workload coverage. New suites are
part of the required network-denied validation runner, with no billable calls.

Synthetic provider outputs are not live semantic certification. Place suitability,
plausible geography, implied goals and conflicting prose still require model
judgment; native checks cannot recognize every English contradiction or bypass
attempt. Ambiguous/unsupported travel stays uncommitted while ordinary narration
continues. An existing reference without physical state is not automatically proof
of location/access or an NPC's present whereabouts. See the response-gap audit for
remaining conversational and operational risks.
