# AI GM authority gateways — active migration crosswalk

The current runtime has **more than one source of review requirements**. A human-review gate may be embedded in preparation, option discovery, dice commitment, saved-roll replay, output, outbox or audit consumers. Replacing only one producer with a native AI-GM decision **breaks real verification**. This matrix reconstructs the pending UA14/UA15 work from the live-route inventory, not a permission to automate retained owner or administrator controls.

## Real entrypoints

- Player scene turn: `index.js` → `GMService.runTurn` → `state.js:applyAuthoritativeMutation` → `gm-unified-arbitration.js`/rules services → final native execution.
- Director/civic: separate `simulation.js` and `ai-intents.js` policy/actor sources; a civic score is not damage proof.
- Command input: `commands.js` authenticates Discord principal/GM role before `vc-roll`, `vc-story`, `vc-city` or other native operations. Model JSON cannot set an authenticated GM role.
- A new sealed AI-GM source must be verified at **every** persistence/replay/continuation/output reader, not only the initial request.

## Gateway dispositions

| Family | Present behavior / gate | Required direction |
| --- | --- | --- |
| Ordinary owner observation/no-roll | Current source-bound AI-GM ordinary ruling | **Retain** working native path |
| Risky action pending request | GM chooses sourced Difficulty/trait/stakes; owner rolls | **Retain**; no PC die autocompletion |
| Scoped flat/advantage modifiers | Some consumers require active saved human-reviewed ruling | **UA14** native rule/source proof across request and saved breakdown readers |
| PC attack weapon/target/damage | Human-reviewed owned equipment and native adversary target mapping still checked | **UA14** source-pinned weapon/rules adapter, keep owner attack/damage rolls |
| Alternate trait | Existing owner choice after human-reviewed permission | **UA14** native contextual permission; keep owner selection |
| Experience use | Native exact structured operation/trait/roll-kind eligibility plus current owner source; legacy human-reviewed participation remains | **UA14 bounded qualified** eligibility producer/use/pre-RNG/saved receipt reader; owner still opts in and explicitly pays 1 Hope. Free-form/incomplete applicability remains held. |
| Help / Tag Team | Human-scoped feasibility plus each player's voluntary participation, exact roll/source | **UA14** eligibility proof, retain separate owners and once/session constraints |
| Help with net disadvantage | Actual saved-ruling restriction, no universal combination rule | **Retain hold** until explicit applicable rule |
| Saved neutral roll missing Difficulty | Native fixed dice with strictly scoped retrospective review | **UA14 only** when contemporaneous pre-roll defense/rule evidence exists; otherwise hold |
| `RULE_UNVERIFIED` action recovery | Scoped human review with original source/revision | **Partial UA14** only with native proof; never blanket bypass |
| Unmapped consequential effect/capability | Missing native adapter | **Adapter pending**; not a role-label fix |
| Owned PC healing/feature resources | Feature/owner/recipient approvals and immutable causal receipts | **UA14** only fixed, sourced mappings; retain owner cost/consent/death gates |
| Standard NPC attack | Native AI GM capability and owner defense/Armor | **Retain** current, valid AI/Gm versus player control split |
| Catalog NPC/group reactions | Exact supported native feature handlers, pending-owner children and immutable parent terminal history | **Retain 15 bounded**; 137 review-only occurrences plus one needs-authoring remain non-executable |
| Delegation mode/permission registry | Manual/suggest/routine administrative policy and costs/revisions | **Retain** independently from normal GM adjudication |
| Mundane owner travel | Current typed owner move/geography/access native service | **Retain**; UA15 only removes redundant approvals in proved subset |
| Restricted/encounter travel | Requires actual access/time/encounter adapter | **Retain hold**; no prose-authorized teleport/forced placement |
| Encounter proposal and activation | Actual actor/template, roster, BP/scene and operator policy | **UA15** narrow native GM decision where supported; keep policy/identity checks |
| Routine evidence analysis | Review-only action using saved evidence/visibility | **UA15** bounded interpretation with source; custody is separate |
| Contested evidence custody | Native receipt, owner/controller, human reviewed exact transfer | **Retain** until independently qualified arbitration |
| Multiplayer contested window closing | Explicit consent/complete participant state | **Retain**; silence cannot mean acceptance, failure or winner |
| NPC goal operations | Narrow source-driven delegated subset | **UA15** optional expansion for independently supported transitions |
| NPC groups, strategies, civic influence | Major/contested changes require specific actor policy and review | **Retain** policy-sensitive review; expand per real adapter |
| Causal service/world consequence | Director source/causal ledger and delegable subsets | **UA15** bounded supported updates only; no generic JSON mutation |
| Canon/public promotion of private facts | Native visibility, source, conflicts and disclosure | **Retain** independent consent/canon verification |
| PvP, proxies, Armor/death, optional PC costs | Bilateral/current consent and exact rightful controller | **Retain** until separately qualified versioned replacement in this effort; owner priority places it after native UA/World Director. No blanket owner-control waiver. |
| Administration/content/seed/retcon/server | Authenticated GM/admin, source/configuration and audit | **Retain**; UA16 limited targeted import is separately supported |

## Acceptance rules for every migrated path

1. **Before permission**: verify actor/target/owner, original declaration exact span, current scene and audience, rules source and feature/equipment mapping.
2. **Before RNG or payment**: recheck current revision/control/cost, consent/optional participation and compatibility with saved rolls/conditions.
3. **After commit**: persist source, terms, dice/cost/result/reader hashes, plus native read and output projection.
4. **Negative tests**: forged role/source, wrong principal, private knowledge, stale scene/template, revoked source, changed equipment/HP, unavailable resources, unsupported features, restart and uncertain delivery.
5. **Legacy compatibility**: retain saved human-authorized reads and already committed outcomes; source migration does not mean deleting proof readers.

UA13 was an **inventory** only; the bounded structured Experience migration does not complete UA14/15. The remaining 138 catalog entries are not made supported by resolving a generic human-review call site. See `NO_DEFERRALS_LEDGER.md` for current tested partitions, exact commits and owner priority.
