# adversary:choir-relay:route-around

Status: BOUNDED NATIVE CUE SUPPORTED; MECHANICAL EFFECTS HELD. Parent: [P06-F01](../../SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#choir-relay/features/1`. Source SHA-256: `6e29725df1587c4ce248e9460745202b656e934776a8c144282e03f53cf6c831`; template SHA-256: `8d96b1f9606e8910602b63021d03b23d7e564daf015b062db86ffa66d4e7e364`.

The exact source-bound GM-private Reaction cue is projected from the verified Choir Relay context. The descriptor uses `adversary_route_around_context`. The cue does not commit allied Signal binding, last-HP event, NPC Stress spend, device/range proof, relocation, HP mutation or replay.

Fresh feature tests cover exact source and descriptor binding, context provenance, forged/drift rejection and absence of mutation. No generic fallback or new creative limitation. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Implementation commit: `7bbf88de04398ab7233c8ad8151b0f790f8b939e`. Route Around's four fresh cases passed within the 185-case mapped run (183/185 overall; two F01 count failures). Final catalog-count assertions await the targeted rerun recorded in the parent feature ledger. The cue is supported; actual mechanics remain locally held.
