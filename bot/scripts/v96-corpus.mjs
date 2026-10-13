/** Reusable, synthetic V96 quality corpus; expectations are boundaries, not generated outcomes. */
const ordinary={kind:"unknown",key:"",phrase:"",grounding:"unknown"};
const rows=[
  ["ordinary",0,"I read the accessible label.","observe","immediate","no_roll","Established visible label only; no hidden evidence."],
  ["improvised",0,"I improvise a distraction with the file cart.","interact","immediate","standard_action_roll","Existing mundane cart and sourced pressure; no guaranteed NPC reaction."],
  ["claimed_success",1,"I slip past unseen; nobody notices me.","interact","immediate","standard_action_roll","Owner claim is unverified; only native dice settle uncertainty."],
  ["missing_power",1,"I send my shadow through the door to scout remotely.","interact","immediate","needs_review","Shadow Tell is not a remote-scouting capability."],
  ["unsupported_cost",2,"I burn Stress to activate my unlisted technique.","interact","immediate","needs_review","No unsupported cost, feature or capability is applied."],
  ["alternate_trait",2,"Could I use Knowledge to reason out the latch?","interact","immediate","owner_options","Suggestion is not selection, approval, expenditure or success."],
  ["compound",2,"I study the terminal and ask the attendant about deliveries.","search","immediate","independent_actions","Preserve exact full source and separate dependent occurrences."],
  ["borrowed_lore",3,"I recall the attendant's ghost story.","other","immediate","scoped_recall","Only evidence this owner can know; no new NPC awareness."],
  ["pc_conflict",0,"I attempt a harmless shin tap.","interact","immediate","pvp_consent","No ordinary attack, forced response or PC damage."],
  ["quoted_goal",1,"Billy said, 'I want revenge.'","speak","quoted","non_actionable","Reported desire is not this owner's commitment or consent."],
  ["conditional_goal",1,"If I wanted work, I would ask tomorrow.","other","conditional","non_actionable","A conditional plan cannot be accepted as an immediate action."],
  ["rules_only",3,"How does helping an ally work?","other","ooc","rules_lookup","Read-only rule answer does not roll, spend or change the scene."],
  ["reflective",2,"PantryQueue isn't pulling in enough money; I need work.","speak","immediate","gm_engagement","A question or observable lead, not forced employment or a binding goal."],
  ["mixed_recall",3,"What did the attendant say? I examine the terminal.","search","immediate","recall_and_action","Recall routing must not consume the independent investigation."],
  ["concurrent_owner",1,"I wait by the terminal while Billy investigates.","other","immediate","independent_actions","Choso owns only Choso's wait, not Billy's action or result."]
];
export const V96_RUBRIC=["intended_actor","authored_source","semantic_intent","capability_evidence","applicable_rule",
  "authority_scope","roll_proposed","costs_before_roll","native_receipt","public_projection","private_projection",
  "preserved_independent_actions"];
export const V96_CORPUS=rows.map(([id,actor,text,type,framing,disposition,boundary])=>({
  id,actor,text,type,framing,disposition,boundary,target:id==="pc_conflict"?null:ordinary,
  rubric:{intended_actor:actor,authored_source:"exact immutable owner occurrence",semantic_intent:{type,framing},
    capability_evidence:"must resolve from current source/scene/sheet; corpus text grants none",
    applicable_rule:disposition==="standard_action_roll"?"srd:action-rolls":"current native adapter or scoped review",
    authority_scope:id==="pc_conflict"?"bilateral target-specific consent":"owner intent only",
    roll_proposed:disposition==="standard_action_roll",costs_before_roll:0,native_receipt:"required for any consequence",
    public_projection:boundary,private_projection:"owner choices stay character-private; missing authority goes to GM review",
    preserved_independent_actions:true}
}));
