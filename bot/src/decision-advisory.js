/** Bounded GM-private decision proposals; never a roll resolver or source of PC intent. */
export const decisionAdvisorySchema={anyOf:[{type:"null"},{type:"object",additionalProperties:false,
  properties:{mode:{type:"string",enum:["narrate","roll","clarify","provisional","silence"]},
    check:{type:"string",enum:["action","reaction",""]},reason:{type:"string",maxLength:600},
    uncertainty:{type:"string",maxLength:300},consequence:{type:"string",maxLength:300},
    referent_uncertainty:{type:"string",maxLength:300},fictional_uncertainty:{type:"string",maxLength:300}},
  required:["mode","check","reason","uncertainty","consequence","referent_uncertainty","fictional_uncertainty"]}]};
export function decisionContext(db,guild,message){
  if(db.getCityCalendar(guild).flags.decision_advisory!==true) return null;
  return {rulings:db.searchRulesRulings(guild,message),local_sources:["ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md","ENGINE/MULTIPLAYER_GM_RULES.md"],
    guidance:"Return decision_advisory for the actually declared action only. uncertainty means unresolved MECHANICAL OUTCOME only; referent_uncertainty and fictional_uncertainty do not prevent ordinary narration. Narrate established surroundings and acknowledge intent while an action remains pending. Clarify only missing information that materially affects a consequential operation. Meaningful outcome uncertainty AND consequence may propose an action/reaction check; conflicting rules remain PROVISIONAL for human adjudication. Player-player RP stays silent. Never invent difficulty, modifiers, dice, PC consent or acceptance. Advisory reason is GM-private."};
}
export function validateDecisionAdvisory(db,guild,result){
  if(db.getCityCalendar(guild).flags.decision_advisory!==true) return null;
  const value=result.decision_advisory;
  const allowed=["check","consequence","mode","reason","uncertainty","referent_uncertainty","fictional_uncertainty"];
  if(!value||Object.keys(value).some(key=>!allowed.includes(key))
    ||!["narrate","roll","clarify","provisional","silence"].includes(value.mode)
    ||typeof value.reason!=="string"||!value.reason.trim()||value.reason.length>600
    ||["uncertainty","consequence"].some(key=>typeof value[key]!=="string"||value[key].length>300)
    ||["referent_uncertainty","fictional_uncertainty"].some(key=>value[key]!==undefined&&(typeof value[key]!=="string"||value[key].length>300))
    ||!["action","reaction",""].includes(value.check)) throw new Error("Bounded GM decision advisory required.");
  if(value.mode==="roll"?(!value.check||!value.uncertainty.trim()||!value.consequence.trim()):value.check!=="")
    throw new Error("Checks require explicit uncertainty/consequence; other modes cannot fabricate checks.");
  if(value.mode==="narrate"&&value.uncertainty.trim()) throw new Error("Uncertain adjudication is not an established no-roll outcome.");
  if(value.mode==="silence"&&(result.respond||result.narration?.trim()||["events","relationships","handouts","npc_memories","npc_knowledge","npc_goals","simulation_updates","canon_proposals","ai_intents","private_messages"].some(key=>result[key]?.length)))
    throw new Error("Silent RP cannot commit hidden effects or publish narration.");
  return {...value,authority:"Advisory only; application rolls/native resolvers and human rulings remain authoritative."};
}
