# v9.4 binding PvP profile and effect-authority contract

## Closed profiles and defaults

| Property | Narrative PvP (`narrative_only`) | Damage-enabled PvP (`damage_enabled`) |
|---|---|---|
| Availability | Existing signed v2 bilateral Duel and Three Strikes; no damage | New separate v3 agreement, all targets consent, scenario risk tier |
| Action resolution | Native paired Duality action totals; highest wins; first 3 strikes | Native Daggerheart action/attack vs target's current Evasion, critical auto-hit; rules-required reaction checks for other contests |
| HP/Armor/Stress damage | Forbidden from opponent's narrative score | Only target-specific saved native attack/damage/defense/last-HP receipt chain |
| PvP Hope | Zero from action, reaction, Critical, team interaction (existing Hope spends separately authorized) | Same, including Critical attacks |
| PvP Fear | One immediate GM consequence per qualifying *action* roll; 0–2 per normal paired exchange | One per qualifying attacking *action*, no Fear from ordinary defender reaction |
| Character narration | Winner own success, loser own response | Attacker own attempt, defender own reaction; hit/damage results native; no forced thoughts or dialogue |
| Stop/decline | Current narrative neutral | Authenticated edge/group stoppage; existing legitimate damage remains, no automatic surrender/death |

## Consent contract

Explicit fields `version=3`, `profile`, `participants`, `teams`, `interaction_scope`, `stakes`, `boundary_terms`, `allow_damage`, `lethality`, `last_hp_policy`, `scoring_policy`, `target_permissions`, `features`, `resource_spending`, `audience`, `window`, `source_event`, `scene`, `session`, `hash`, `owner_signatures`. Required: each active PC's **own current owner**, every affected target's explicit permitted risk, scope and feature costs; no proxy from arbitrary model or GM approval. Per-target edge tuple `{actor,target,effect_class,max_risk,source_ref}` and per-attack use-time check. A public description or question never implies combat consent. A player decline is private and imposes no fictional forfeiture.

## Four risk levels

1. `harmless_narrative`: no direct PC resource changes.
2. `nonlethal_no_incapacitation`: resolved attack hit may damage until a pre-agreed last-HP safeguard stops before marking the final HP. The cap is explicitly house rule, not normal SRD.
3. `nonlethal_incapacitation`: final HP marks produce pre-agreed `nonlethal_fallen` state, recovery plan; no death move.
4. `lethal`: final HP mark yields `pending_pc_death_move`, only current affected PC owner selects `Blaze of Glory`, `Avoid Death` or `Risk It All` under native SRD mechanics and negotiated consequences. Never preselect death. Scar risks remain separate from mere damage permission and require risk disclosure.

## Receipt families (versioned)

- `pc_effect_authority` / `pc_effect_receipt`: exact cause, target, resource, before/after, signed scope, source, scene, CAS and idempotency. No model prose basis.
- `pvp_encounter_contract`, `pvp_target_edge_consent`: signed group, per-target danger and scope revisions.
- `pvp_attack_intent` / `pvp_attack_roll_receipt`: equipment, trait, range, target/current Evasion, natural faces, roll type `action` and verdict.
- `pvp_reaction_offer` / `pvp_reaction_roll_receipt`: evidence of actual trigger, defender owner, feature or hazard, no metacurrency and no extra move.
- `pvp_damage_roll_receipt`: damage die faces, proficiency, type, native source, critical max dice bonus and simultaneous-source group key.
- `pvp_armor_decision_receipt`: current armor slots, defender authorization, armor feature and severity change.
- `pvp_damage_application_receipt`: exact total, resistance, thresholds, HP before/after, last-HP transition, attack and defense ancestry.
- `pvp_safety_stop_receipt`, `pvp_nonlethal_fall_receipt`, `pc_death_move_request/choice/outcome`: tier-specific resolution.
- `pvp_spotlight_opportunity`: actor/team token, last elective owner and eligible cohort, explicit override reason, CAS state, never an initiative requirement.
- `pvp_fear_trigger/move_decision/effect_receipt`: existing native immediate Fear chain reused; never a campaign Fear increment.
- `pvp_narrative_clause/pvp_output_part`: owner-authored claim, accepted output audience and source, never authority for damage.

## Atomic phases

`accepted_attack` -> `target_use_time_consent` -> `pre_roll_defense_spend_and_feature_review` -> `attack_action_roll` -> `attack_vs_current_evasion_or_critical` -> `applicable_defender_native_reaction` -> `damage_roll_if_hit` -> `pre_damage_defender_armor_option` -> `resistance_and_thresholds` -> `last_hp_policy` -> `pc_effect_receipt` -> `immediate_fear_gate_completion` -> `action_terminal_and_continuation`. Native hit, damage and PvP Fear scopes remain independent; resolving Fear cannot change attack success/damage already saved. Both Fear outcomes in narrative paired duel are separately resolved. In a brawl multiple attack receipts resolve against their own target revisions and same-time damage sources aggregate only when SRD indicates simultaneity. A player may withdraw from further attacks while a previously completed effect stays committed.

## Native-source invariants

- No `pc_effect_receipt` before valid authorizing source, current owner/target status and actual deterministic mechanical ancestor receipt.
- No damage-enabled proposal may bypass the early real-PC gate based on an AI `attack`/`roll_required` label or party `resource_delta`.
- No Hope ever generated by PvP action, reaction, critical or team play. Existing Hope spends and non-PvP gains keep their own independent native source.
- Reaction rolls do not generate Fear or additional GM moves even when Fear Die higher. Critical reaction neither gains Hope nor clears Stress and obeys actual effect text.
- Retractions/new terms invalidate future use and publication, not properly committed immutable dice/HP. Uncertain Discord send holds pending; never rescroll/reapply.
- NPC/environmental effects can hit PCs only using properly sourced Daggerheart-native effects, not narrative text or `simulation.executeNpcAction`'s independent d20 economy.
- Do not disclose a PC's confidential traits, sealed action or hit points merely because they are affected; disclose only established observables and explicitly approved mechanics/audience.
