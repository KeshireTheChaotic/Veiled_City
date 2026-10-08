/** Shared release feature contract and read-only GM diagnostics; absent flags are disabled and records never imply PC authority. */
export const EXPANSION_FEATURES=Object.freeze({
  semantic_integrity:{phase:"IHY2",records:[],command:"Normal GM commit validation",authority:"Bounded sourced material paraphrase checks; uncertain meaning requires correction, not state invention"},
  roll_collaboration:{phase:"IHY2",records:["roll_operation","tag_usage"],command:"/vc-roll contribute / adjudicate",authority:"Actual owner declarations, native costs/dice, reviewed feasibility and player-selected Tag Team outcomes"},
  natural_language:{phase:"IHY1",records:[],command:"Normal authenticated play messages",authority:"Exact authored declarations only; no inferred PC completion or assent"},
  roll_requests:{phase:"IHY1",records:["roll_request"],command:"/vc-roll request / pending",authority:"Private sourced pending breakdowns only; no automatic rolls or PC resource spending"},
  supply_dependencies:{phase:"SP7",records:["service_access","supply_transfer"],command:"/vc-city update; /vc-sim action",authority:"Sourced pre-cost world service constraints; human-reviewed conserved NPC deliveries only"},
  history_reconciliation:{phase:"SP6",records:[],command:"/vc-story why",authority:"Read-only current material contradictions; human repair proposals only"},
  narrative_setups:{phase:"SP6",records:["story_setup","setup_payoff"],command:"/vc-story pacing",authority:"Sourced optional setup lifecycle; no guaranteed payoff or culprit invention"},
  player_organizations:{phase:"SP5",records:["organization_request","community_membership"],command:"/vc-intel organization / organizations",authority:"Owner-confirmed human-reviewed native communities/property/projects; no inferred PC votes or funds"},
  audience_influence:{phase:"SP4",records:["transmission","influence_action"],command:"/vc-city transmit",authority:"Native-cost sourced audience attempts, divergent responses, persistent refusal/correction and review"},
  evidence_custody:{phase:"SP3",records:["evidence_receipt","evidence_effect"],command:"/vc-handout custody / evidence",authority:"One physical original, explicit copies, controller transfers and human-reviewed analysis"},
  dialogue_history:{phase:"SP2",records:[],command:'Explicit say: "..." messages',authority:"Authored speech heard by actual listeners; subjective native memory only"},
  tactical_memory:{phase:"SP2",records:[],command:"Existing encounter end",authority:"Bound actual combatant history; no new features or PC vulnerability"},
  encounter_intelligence:{phase:"SP1",records:["encounter_actor","encounter_proposal","encounter_outcome"],command:"/vc-encounter world",authority:"Grounded GM-reviewed proposals; no automatic combat or arrival"},
  decision_advisory:{phase:"SP1",records:[],command:"Normal GM turns",authority:"GM-private check/clarification advice; no new mechanics"},
  emergent_goals:{phase:"A",records:["goal_transition","goal_state"],command:"/vc-sim goal",authority:"Pending sourced actor goal transitions"},
  consequences:{phase:"A",records:["consequence_subscription","consequence"],command:"/vc-sim consequence",authority:"Typed subscribed effects with review and receipts"},
  scene_continuity:{phase:"B",records:["scene_presence","scene_residue"],command:"/vc-story scene",authority:"Descriptive physical continuity, not combat mechanics"},
  emergent_groups:{phase:"C",records:["group_transition"],command:"/vc-story group",authority:"Voluntary reviewed community lifecycle"},
  strategies:{phase:"C",records:["strategy"],command:"/vc-story strategy",authority:"Subjective plans through existing action resolvers"},
  personal_arcs:{phase:"D",records:["arc","arc_beat"],command:"/vc-intel arc",authority:"Owner-established continuity and nonbinding GM invitations"},
  discovery:{phase:"D",records:[],command:"/vc-intel discover",authority:"Read-only scoped recorded knowledge"},
  long_projects:{phase:"E",records:["long_project"],command:"/vc-downtime long-project",authority:"Consent and existing authorized downtime adjudication"},
  conflict_mediation:{phase:"E",records:[],command:"Existing action/strategy execution",authority:"Pre-cost physical/authority conflicts, not title adjudication"},
  memory_consolidation:{phase:"F",records:["memory_cluster"],command:"/vc-story memory",authority:"Reversible actor evidence pointers, never canon"},
  activity_density:{phase:"F",records:[],command:"Existing cognition/director retrieval",authority:"Bounded ephemeral eligibility, no extra provider calls"}
});
export function expansionStatus(db,guild){
  const flags=db.getCityCalendar(guild).flags;
  return {visibility:"gm",schema_version:db.schemaVersion(),features:Object.entries(EXPANSION_FEATURES).map(([flag,contract])=>({flag,
    enabled:flags[flag]===true,default:false,...contract})),records:db.cityRecordCounts(guild),
    bounds:{director_actions:{round:1,scene:3,downtime:4},institution_actions:2,materialized_density_candidates:32,density_packets:4,
      density_packet_characters:12000,density_total_characters:24000,consequence_event_window:50,consequence_subscriptions:20},
    recovery:"Disabling flags stops new extension opportunities, not already queued native actions. Review/cancel queued actions; preserve evidence. Backup before upgrades; explicit snapshots restore state.",
    authority:"Recorded configuration/counts only, not proof of narrative quality or live deployment; no reads advance time."};
}
