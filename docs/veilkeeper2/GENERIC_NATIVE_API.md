# Generic native boundary — governing contract, implementation pending

Only these model-callable names are permitted in the proposed new runtime:

```ts
context_read({ topic: string, focus?: string, cursor?: string })
action_propose({
  source_ref: string, actor_ref: string,
  action: { kind: string, parameters: Record<string, unknown> },
  expected_revision?: string, reason?: string
})
state_inspect({ receipt_ref: string })
knowledge_propose({
  source_ref: string,
  kind: 'testimony' | 'observation' | 'identity' | 'memory' | 'fact' | 'canon_proposal',
  claim: string, subject_ref?: string, evidence_refs?: string[]
})
```

Each request needs a closed versioned schema; reject additional properties. Native server context supplies authenticated principal, campaign, scene, actor-control revision, current recipients, source provenance, grants and trace identity. None are model-selectable. A source or actor reference is a claim requiring resolution, never a grant.

`context_read` filters source closure and actor-known/audience-entitled intersection before text retrieval. Cursors bind to principal, scope and current revision. `state_inspect` is read-only and reveals only an entitled receipt projection. Neither may draw RNG or mutate resources.

`action_propose` looks up a versioned internal ruleset handler with equivalent describe/validate/prepare/commit/inspect stages. Unknown kinds fail closed. Dispositions distinguish blocked, pending, awaiting player roll, awaiting consent, resolved and narratable. Only committed receipts authorize consequences. Registry membership is not actor authorization. Real PC choices, costs, consent, actual dice and revisions remain separately validated. No SQL, state patch, arbitrary field update or model-supplied dice API is permitted.

`knowledge_propose` preserves testimony, beliefs, observations, independent identity authorship, facts and protected canon as different authorities. Repetition changes retrieval salience, never truth or consent. Canon proposals require separate authorized review. Delivered knowledge requires exact recipient acknowledgement; uncertain sends stay uncertain.

Ordinary conversation requires none of these calls. The audience writer receives only eligible observations and portrayal, never an omniscient packet with an instruction to keep secrets. Harmless direct address and sensory second person are allowed. Native receipts govern consequential effects; no claim of complete natural-language semantic validation is made.

This contract governs the implementation. R1 binds exactly these four capability callbacks to native source handles; no game action handler is installed. R2 now has a separate metadata-first context authority used by the no-send rehearsal path. Wiring that retrieval into optional `context_read` calls, knowledge proposal execution, complete native effects and durable publication remains pending. No full phase or release acceptance is implied by these interfaces.
