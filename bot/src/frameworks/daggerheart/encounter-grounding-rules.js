/** Existing native encounter grounding, review, actor mapping and activation rules. World learning and creative producers remain outside this engine. */
import {randomInt} from 'node:crypto';
import {createEncounterCompositionRules} from './encounter-composition-rules.js';
import {battlePointCost,baseBattlePoints,recomputeBudget} from './encounter-budget.js';
import {createEncounterActors} from './encounter-actors.js';
const {livePcRoster,partyTier}=createEncounterCompositionRules({randomInt});
export function createEncounterGroundingRules({requireCitySource,currentScene,scenePresence,actorSource,cityObject,cityKey,cityAudit,inspectNativeEncounterActivation,proposeWorldEncounter}){
const encounterActors=createEncounterActors({requireCitySource,currentScene,scenePresence,actorSource,cityKey});
function manageWorldEncounter(db,guild,input,actorId,lib){
  cityObject(input);
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) throw new Error("Encounter intelligence is opt-in.");
  if(input.op==="bind"){
    if(Object.keys(input).some(key=>!["op","actor","template","information_key","source_event"].includes(key))) throw new Error("Closed encounter binding required.");
    const key=cityKey(input.actor),template=lib.adversaries.find(row=>row.name===input.template);
    // Group bodies need explicit member grounding; do not let a single actor spawn minions/hordes.
    if(!template||["Minion","Horde"].includes(template.type)) throw new Error("Exact approved single-body template required; group templates are not inferred.");
    actorSource(db,guild,{actor_type:"npc",actor_key:key,information_key:input.information_key,source_event:input.source_event});
    return db.transaction(()=>{
      const before=db.getCityRecord(guild,"encounter_actor",key),after=db.saveCityRecord(guild,{kind:"encounter_actor",key,source_event:input.source_event,
        actor_key:`npc:${key}`,data:{template:template.name,information_key:input.information_key}});
      cityAudit(db,guild,"encounter_binding",key,before,after,actorId);return after;
    });
  }
  if(input.op==="propose") return proposeWorldEncounter(db,guild,input,actorId);
  if(!["accept","decline"].includes(input.op)||Object.keys(input).some(key=>!["op","key"].includes(key))) throw new Error("Explicit encounter review required.");
  const row=db.getCityRecord(guild,"encounter_proposal",cityKey(input.key));
  if(!row) throw new Error("Proposal not found in this campaign.");
  if(row.status!=="pending") return row;
  return db.transaction(()=>{
    let encounter=null;
    if(input.op==="accept"){
      if(row.data.scene!==currentScene(db,guild).key) throw new Error("Scene changed; propose again.");
      const actors=encounterActors(db,guild,{...row.data,location_key:row.location_key,source_event:row.source_event});
      if(JSON.stringify(actors)!==JSON.stringify(row.data.bindings)) throw new Error("Actor binding or presence changed; propose again.");
      const session=db.getActiveSession(guild),roster=livePcRoster(db,session.id).filter(pc=>scenePresence(db,guild,"character",pc.character_id)?.data.state==="actually_present"
        &&scenePresence(db,guild,"character",pc.character_id)?.location_key===row.location_key);
      if(roster.length<2) throw new Error("Two actually present eligible PCs required; offscreen and proxies do not count.");
      if(db.getCurrentEncounter(session.id)) throw new Error("Review/end the existing encounter first.");
      const tier=partyTier(roster),composition=actors.map(actor=>{
        const template=lib.adversaries.find(item=>item.name===actor.template);
        if(!template||template.tier>tier||["Minion","Horde"].includes(template.type)) throw new Error("Approved template is not legal for this encounter.");
        return {name:template.name,type:template.type,tier:template.tier,quantity:1,unit_count:1,bp_cost:battlePointCost(template.type),spent_bp:battlePointCost(template.type)};
      });
      const env=lib.environments.find(item=>item.name===row.data.environment&&Number(item.tier)===tier);
      if(!env) throw new Error("Exact established tier-appropriate environment required.");
      const calc=recomputeBudget({tier,base_bp:baseBattlePoints(roster.length),difficulty:"standard",composition});
      if(calc.spent>calc.budget) throw new Error("Grounded composition exceeds the native BP budget; GM must adjudicate separately.");
      encounter=db.createEncounter(guild,session.id,{tier,pc_count:roster.length,difficulty:"standard",style:"balanced",base_bp:baseBattlePoints(roster.length),
        budget_bp:calc.budget,spent_bp:calc.spent,composition,adjustments:calc.derived,objective:row.data.objective,environment_name:env.name,notes:`World proposal: ${row.record_key}; nonviolent alternative remains available.`});
      db.saveCityRecord(guild,{kind:"encounter_binding",key:encounter.id,source_event:row.source_event,data:{proposal:row.record_key,composition,roster:roster.map(pc=>pc.character_id).sort()}});
    }
    const after=db.saveCityRecord(guild,{...row,key:row.record_key,status:input.op==="accept"?"accepted":"declined",data:{...row.data,encounter_id:encounter?.id||null,reviewed_by:actorId}});
    cityAudit(db,guild,"encounter_review",row.record_key,row,after,actorId);return after;
  });
}
function worldCombatantDrafts(db,guild,encounter,rows){
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);if(!binding) return rows;
  const proposal=db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  if(rows.length!==proposal.data.bindings.length) throw new Error("Explicit single-body world combatant mapping required.");
  return rows.map((row,index)=>({...row,notes:`[world_actor:${proposal.data.bindings[index].key}]\n${row.notes}`}));
}
function bindWorldCombatants(db,guild,encounter,rows){
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);if(!binding) return;
  const proposal=db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  const combatants=proposal.data.bindings.map(actor=>{
    const actual=rows.filter(row=>row.notes.startsWith(`[world_actor:${actor.key}]\n`));
    if(actual.length!==1) throw new Error("Unique world actor/combatant mapping required.");
    return {actor:actor.key,id:actual[0].id};
  });
  db.saveCityRecord(guild,{...binding,key:binding.record_key,data:{...binding.data,combatants}});
}
function validateWorldEncounterActivation(db,guild,encounter){
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);if(!binding) return;
  if(binding.data.native_activation)inspectNativeEncounterActivation(db,guild,binding.data.native_activation,{current:true});
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) throw new Error("World encounter disabled; review/cancel the plan explicitly.");
  const proposal=db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  if(!proposal||proposal.status!=="accepted"||proposal.data.scene!==currentScene(db,guild).key) throw new Error("World encounter scene/review changed.");
  const actors=encounterActors(db,guild,{...proposal.data,source_event:proposal.source_event,location_key:proposal.location_key});
  const roster=livePcRoster(db,encounter.session_id).filter(pc=>scenePresence(db,guild,"character",pc.character_id)?.data.state==="actually_present"
    &&scenePresence(db,guild,"character",pc.character_id)?.location_key===proposal.location_key).map(pc=>pc.character_id).sort();
  if(JSON.stringify(actors)!==JSON.stringify(proposal.data.bindings)||JSON.stringify(roster)!==JSON.stringify(binding.data.roster)
    ||JSON.stringify(encounter.composition)!==JSON.stringify(binding.data.composition)) throw new Error("World encounter actors, composition or attendance changed; review a fresh proposal.");
}
return Object.freeze({encounterActors,manageWorldEncounter,worldCombatantDrafts,bindWorldCombatants,validateWorldEncounterActivation});
}
