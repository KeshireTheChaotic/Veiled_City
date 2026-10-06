# Canon Ledger, Proposal Review, and Conflict Resolution — v3.3.2

Veilkeeper separates **durable canon** from notes, GM hook proposals, and unresolved contradictions.

## Direct canon commands

```text
/vc-canon set key:<stable-key> value:<fact>
/vc-canon status
/vc-canon conflicts
/vc-canon resolve conflict_id:<id> resolution:<existing|proposed|custom>
```

`/vc-canon set` remains available for facts the GM already intends to establish.

## Imported character canon proposals

`GM_HOOKS_<Character>.json` may contain `canon_suggestions`. Importing that file does **not** establish those statements as true. Each suggestion enters a GM-only proposal queue. Pending/conflicted canon suggestions are excluded from normal AI-GM hook context; only accepted canon reaches the GM through the authoritative ledger.

```text
/vc-canon proposals [status] [character]
```

By default this shows actionable `pending` and `conflict` proposals. The GM can also filter for accepted, rejected, or all proposal history.

Resolve a proposal with:

```text
/vc-canon proposal-resolve proposal_id:<id> resolution:<accept|reject|custom>
```

Optional fields allow a custom edited value, canon visibility override, and GM resolution note.

### Resolution behavior

- **Accept** — submits the proposal to the authoritative ledger.
- **Reject** — closes the proposal without creating canon.
- **Accept edited value** — submits the GM-edited value while retaining the original proposal for provenance.
- If the accepted value contradicts current canon, the proposal becomes `conflict` and is linked to a normal canon conflict.
- Resolving that conflict with either `/vc-canon proposal-resolve` or `/vc-canon resolve` automatically updates the proposal to `accepted` or `rejected`.

The proposal record retains its character, original proposed value, reason, visibility, source hook, linked conflict/event, final resolution value, GM note, resolver, and timestamps.

## Existing v3.3.1 campaigns

Old `canon_suggestion` character hooks are backfilled into the proposal queue automatically when proposals are first queried. If the exact suggestion is already current canon, it is marked accepted rather than reopened for review.

Replacing canon supersedes the previous canon event instead of deleting history. The AI GM receives current canon as authoritative context and is instructed not to improvise its way through contradictions.
