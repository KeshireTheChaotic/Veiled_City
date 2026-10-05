# Handouts & Evidence — v3.3.0

Veilkeeper can turn discoveries into persistent campaign evidence. The database record is authoritative; rendered Discord text/DOCX/Markdown/JSON is presentation.

## Authority

- `canonical` — deliberately shown content is established fact.
- `partial` — the artifact is genuine but incomplete or context-dependent.
- `unreliable` — it may be forged, altered, deceptive, corrupted, or supernatural.
- `illustrative` — presentation aid; incidental details are not automatically canon.

## Visibility

`public`, `party`, `player`, `character`, or `gm`.

Player-facing exports never include the internal `canonical_facts` array used to constrain generation.

## Narrative generation

The main GM response schema may emit a handout when a scene actually produces evidence. Veilkeeper first records the facts the artifact is allowed to express, then stores/delivers the rendered artifact. This prevents presentation text from silently becoming new hidden canon.

## Commands

```text
/vc-handout generate
```
GM-only. Uses the low-cost handout model and only the facts explicitly supplied to it.

```text
/vc-handout create
```
GM-only. Stores supplied player-facing content directly. No AI cost.

```text
/vc-handout list
/vc-handout show
/vc-handout export
```
Players see only handouts allowed by their visibility scope. Exports support JSON, Markdown, DOCX, or all formats.

```text
/vc-handout deliver
/vc-handout archive
```
GM-only redelivery/archive controls.

## Delivery

Party/public evidence goes to the configured play channel. Character/player-private evidence uses the player's registered private GM channel, then Discord DM. If neither delivery route works, the sanitized player-facing artifact is posted to `#state-errors` for GM relay.

## Cost

`create`, storage, delivery, and exports are local. `generate` uses `OPENAI_HANDOUT_MODEL`, normally a low-cost model. Narrative handouts generated as part of an ordinary GM response do not require a second generation call.
