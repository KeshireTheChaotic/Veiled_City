/** Bounded GM-private decision proposals; never a roll resolver or source of PC intent. */
export const decisionAdvisorySchema={anyOf:[{type:"null"},{type:"object",additionalProperties:false,
  properties:{mode:{type:"string",enum:["narrate","roll","clarify","provisional","silence"]},
    check:{type:"string",enum:["action","reaction",""]},reason:{type:"string",maxLength:600},
    uncertainty:{type:"string",maxLength:300},consequence:{type:"string",maxLength:300},
    referent_uncertainty:{type:"string",maxLength:300},fictional_uncertainty:{type:"string",maxLength:300}},
  required:["mode","check","reason","uncertainty","consequence","referent_uncertainty","fictional_uncertainty"]}]};
// Per-request enabled schema; leave the nullable compatibility schema unchanged for disabled/other operations.
export const requiredDecisionAdvisorySchema={...decisionAdvisorySchema.anyOf[1],properties:{...decisionAdvisorySchema.anyOf[1].properties,
  reason:{...decisionAdvisorySchema.anyOf[1].properties.reason,minLength:1}}};
export function decisionPromptContext(advisory,rulings){
  if(!advisory||!Array.isArray(advisory.rulings)||JSON.stringify(advisory.rulings)!==JSON.stringify(rulings))return advisory;
  const {rulings:duplicate,...context}=advisory;
  const projected={...context,rulings_ref:{section:'SAVED GM RULINGS (authoritative)'}};
  return JSON.stringify(projected).length<JSON.stringify(advisory).length?projected:advisory;
}
export function decisionContext(db,guild,message){
  if(db.getCityCalendar(guild).flags.decision_advisory!==true) return null;
  return {rulings:db.searchRulesRulings(guild,message),local_sources:["ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md","ENGINE/MULTIPLAYER_GM_RULES.md"],
    guidance:"Enabled: return a non-null decision_advisory object for the declared action only, with all seven schema fields. reason: nonempty, max 600 chars; other text: max 300. Only roll uses check=action/reaction with meaningful mechanical uncertainty AND consequence; other modes check=''; narrate uncertainty=''. Referent/fictional uncertainty does not block narration. Describe established surroundings and acknowledge pending intent without resolving it. Clarify only material missing information; conflicting rules need provisional human adjudication. Player-player RP stays silent, with no narration or effects. Never invent difficulty, modifiers, dice, PC consent or acceptance. GM-private advisory is not native effect authority."};
}
export function validateDecisionAdvisory(db,guild,result){
  if(db.getCityCalendar(guild).flags.decision_advisory!==true) return null;
  const value=result.decision_advisory;
  const fail=(message,category)=>{throw Object.assign(new Error(message),{code:'DECISION_ADVISORY',diagnostic:{category,
    recovery:'Return a bounded non-null advisory matching enabled guidance; it never grants native effects.'}});};
  const allowed=["check","consequence","mode","reason","uncertainty","referent_uncertainty","fictional_uncertainty"];
  if(!value||Object.keys(value).some(key=>!allowed.includes(key))
    ||!["narrate","roll","clarify","provisional","silence"].includes(value.mode)
    ||typeof value.reason!=="string"||!value.reason.trim()||value.reason.length>600
    ||["uncertainty","consequence"].some(key=>typeof value[key]!=="string"||value[key].length>300)
    ||["referent_uncertainty","fictional_uncertainty"].some(key=>value[key]!==undefined&&(typeof value[key]!=="string"||value[key].length>300))
    ||!["action","reaction",""].includes(value.check)) fail("Bounded GM decision advisory required.",'shape');
  if(value.mode==="roll"?(!value.check||!value.uncertainty.trim()||!value.consequence.trim()):value.check!=="")
    fail("Checks require explicit uncertainty/consequence; other modes cannot fabricate checks.",'check_contract');
  if(value.mode==="narrate"&&value.uncertainty.trim()) fail("Uncertain adjudication is not an established no-roll outcome.",'outcome_uncertainty');
  if(value.mode==="silence"&&(result.respond||result.narration?.trim()||["events","relationships","handouts","npc_memories","npc_knowledge","npc_goals","simulation_updates","canon_proposals","ai_intents","private_messages"].some(key=>result[key]?.length)))
    fail("Silent RP cannot commit hidden effects or publish narration.",'silence_effects');
  return {...value,authority:"Advisory only; application rolls/native resolvers and human rulings remain authoritative."};
}
