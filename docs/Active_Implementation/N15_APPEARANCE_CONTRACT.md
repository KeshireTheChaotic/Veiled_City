# N15: dual-lane owner appearance

Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

This owner amendment supersedes the earlier structured-only N15 decision. Both lanes use the existing `/vc-character describe json:` command and an authenticated current owner, not a proxy or model-selected identity. Saving is private; explicitly selecting `party` allows subsequent scoped observation responses to share the selected material. Saving does not broadcast or move the PC.

## Structured observation lane

Existing JSON remains compatible; `"lane":"structured"` is also accepted:

```json
{"text":"olive canvas","facts":[{"field":"coat","value":"olive","start":0,"end":5},{"field":"coat_material","value":"canvas","start":6,"end":12}],"visibility":"party","observers":[]}
```

Only native-supported, exact source-span fields become `character_visible_fact` evidence. Injury still needs a legitimate native incoming-effect receipt. Equipment statistics, capabilities, resources and another PC's behavior cannot be established by appearance fields. Historical observation versions retain their original projections.

## Expressive self-description lane

```json
{"lane":"expressive","text":"My coat recalls storm clouds. I wear yesterday like a borrowed name.","visibility":"party","observers":[]}
```

`character_self_description` v1 stores the exact immutable owner source, current control revision, selected audience, optional actual witnesses and a separate disclosure receipt for party sharing. The text is an `unverified_owner_report`, explicitly not observation/effect/canon authority. It is never parsed into structured appearance fields, PC actions, consent, resources, capabilities, inventory or ownership.

An entitled appearance/clothing inquiry can return both an independently verified observation answer and a separate `owner_self_description` output part. If structured details are absent, the answer remains truthfully unknown; the attributed prose does not fill that evidence gap. Character-private prose can only reach the same owner's private scope. Party prose requires current visibility or an explicitly recorded witness; mere interest in a remote PC confers no knowledge.

Display is a lossless JSON quotation with an explicit **unverified owner report** label. Newlines and Discord Markdown/mention characters use display escapes; JSON decoding reconstructs the original text exactly. This avoids paraphrasing or allowing formatting to impersonate the attribution. Limits are 700 input characters and 1,200 encoded characters; control/bidirectional formatting is rejected, not silently rewritten. No English phrase catalog, material-claim exception or model safety label is used.

## Publication, persistence and rollback

The existing certified output-part/outbox path binds the actual payload, scene, session, owner, query actor and recipient. Deferred delivery rerenders the bound quotation and rechecks active source/disclosure hashes and current ownership. Edits, retractions, owner/recipient changes or altered payloads hold the affected queued publication; they do not reverse valid mechanics or blindly resend uncertain messages.

Quotations do not enter `narrative_unit`/`narrative_delivery` world-fiction memory. Certified historical transcripts may retain the exact attributed report with its epistemic warning; this is evidence of a report, not proof of its contents. No API call, model request or schema migration is added. Rollback holds unsupported new output parts while retaining historical resources and receipts; do not blindly retry them with an older renderer.

## Residual semantic risk (explicitly retained)

Ownership authenticates **who wrote the paragraph**, not whether every clause describes only that owner, is truthful, is authorized disclosure, or is harmless. An owner can submit false injury/capability assertions, allegations about another PC, offensive material or information they should not share. The system publishes those words only as attributed, unverified testimony, never as the other PC's ratification or native fact. Attribution and display encoding do not eliminate their social meaning or prevent a human (or future summarizer) from misunderstanding them. Deliberate source-author disclosure and downstream semantic misuse remain moderation/review risks; this is not universal semantic certification.

The server does not fetch another PC's private records to generate this prose. Consumers must retain the report's epistemic type; copying it into objective facts, NPC knowledge or mechanical evidence is prohibited. Existing SEM06, PVP30/PVP30q/ag, native effect, privacy and publication guards remain mandatory and unchanged. No extra provider judge or unconditional second model call is introduced.

## Qualification

`bot/scripts/semantic-owner-appearance-test.mjs` exercises the real command, native observation, certified publication, persisted outbox, restart and historical recap. It covers coexistence, exact decoded text, private/public scope, source revocation, changed owner/recipient, tampering, cross-owner/fabricated sources, formatting impersonation and no promotion to effects or observation evidence. See `NO_DEFERRALS_LEDGER.md` for actual executed gate counts and commit evidence; this contract alone is not a passing test.
