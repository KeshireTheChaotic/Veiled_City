import {nativeNpcEvidence} from './contracts/npc-evidence.js';
const {actorSource}=nativeNpcEvidence;
import {BATTLE_POINT_COSTS,HEAVY_ROLES,DIFFICULTY_ADJUSTMENTS,tierForLevel,baseBattlePoints,battlePointCost,derivedAdjustments,recomputeBudget} from './encounter-budget.js';
export {BATTLE_POINT_COSTS,HEAVY_ROLES,DIFFICULTY_ADJUSTMENTS,tierForLevel,baseBattlePoints,battlePointCost,derivedAdjustments,recomputeBudget} from './encounter-budget.js';
/** Encounter budget, composition, and adversary-library helpers. */
import { randomInt } from "node:crypto";
export {EncounterLibrary} from './encounter-library.js';
export {livePcRoster,partyTier,autoBuildComposition} from './encounter-composition-source.js';
import {encounterActors} from './encounter-actors-source.js';
export {encounterActors};
import {nativeWorldEvents} from './contracts/world-events.js';
function cityObject(...args){return nativeWorldEvents.cityObject(...args);}function cityKey(...args){return nativeWorldEvents.cityKey(...args);}function cityAudit(...args){return nativeWorldEvents.cityAudit(...args);}function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeWorldSource} from './contracts/world-source.js';
function requireCitySource(...args){return nativeWorldSource.requireCitySource(...args);}
import {nativeScenes} from './contracts/scenes.js';
function scenePresence(...args){return nativeScenes.scenePresence(...args);}function sceneAccess(...args){return nativeScenes.sceneAccess(...args);}function currentScene(...args){return nativeScenes.currentScene(...args);}
import {nativeWorldProxy} from './contracts/world-proxy.js';
function activeCityProxy(...args){return nativeWorldProxy.activeCityProxy(...args);}
import {inspectNativeEncounterActivation} from './encounter-activation-service.js';

/** Explicit GM template bindings, sourced proposals and review use the existing encounter resolver. */
export function encounterProposalContext(db,guild){
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) return [];
  return db.listCityRecords(guild,{kind:"encounter_actor",status:"active",includeGM:true,limit:16});
}
export function proposeWorldEncounter(db,guild,input,actorId){
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) throw new Error("Encounter intelligence is opt-in.");
  const key=cityKey(input.key),prior=db.getCityRecord(guild,"encounter_proposal",key);if(prior) return prior;
  const actors=encounterActors(db,guild,input),scene=currentScene(db,guild);
  if(!["escape","protect_evidence","containment","negotiation"].includes(input.objective)) throw new Error("A non-coercive scene objective is required.");
  cityKey(input.environment);
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"encounter_proposal",key,status:"pending",source_event:input.source_event,location_key:input.location_key,
      data:{actors:actors.map(row=>row.key),bindings:actors,scene:scene.key,objective:input.objective,environment:input.environment,
        alternative:"Negotiate, disengage, or decline combat; no PC action is implied."}});
    cityAudit(db,guild,"encounter_proposal",key,null,after,actorId);return after;
  });
}
export function manageWorldEncounter(...args){return groundingRules().manageWorldEncounter(...args);}

export function recordWorldEncounterOutcome(db,guild,encounter){
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) return null;
  const actualEncounter=db.getEncounter(encounter.id);
  if(actualEncounter?.guild_id!==guild||actualEncounter.status!=="ended") throw new Error("An actually ended encounter in this campaign is required.");
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);
  const proposal=binding&&db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  if(!proposal) return null;
  const key=`encounter-outcome:${encounter.id}`,prior=db.getCityRecord(guild,"encounter_outcome",key);if(prior) return prior;
  const combatants=db.listCombatants(encounter.id,{includeRemoved:true});
  return db.transaction(()=>{
  const source=indexWorldEvent(db,guild,{key,title:"Recorded encounter outcome",source_id:encounter.id,kind:"encounter_outcome",visibility:"gm",location_key:proposal.location_key,
    details:{encounter_id:encounter.id,results:combatants.map(row=>({id:row.id,template:row.base_name,hp:row.hp_current,status:row.status}))}},"encounter_resolver");
  if(db.getCityCalendar(guild).flags.tactical_memory===true){
    for(const bound of binding.data.combatants||[]){
      const actual=combatants.find(row=>row.id===bound.id);if(!actual||!db.getNpcProfile(guild,bound.actor)) continue;
      const observation=`Encounter ${encounter.encounter_number}: my tracked combatant status was ${actual.status}, HP ${actual.hp_current}/${actual.hp_max}. This does not establish death or any PC's hidden capabilities.`;
      const report=indexWorldEvent(db,guild,{key:`combat-report:${encounter.id}:${bound.actor}`,source_id:actual.id,kind:"combat_report",title:"Actor's own combat result",
        visibility:"gm",details:{npc_key:bound.actor,observation,encounter_id:encounter.id}},"encounter_resolver");
      db.addNpcMemory(guild,{npcKey:bound.actor,memoryType:"episodic",content:observation,sourceType:"experienced",sourceRef:report.event_key,
        importance:85,confidence:100,tags:["tactical_history","native_combat_result","nonlethal_possible"]});
      db.upsertNpcKnowledge(guild,{npcKey:bound.actor,knowledgeKey:`combat:${encounter.id}`,content:observation,sourceType:"experienced",sourceRef:report.event_key,confidence:100,isSecret:true});
    }
  }
  return db.saveCityRecord(guild,{kind:"encounter_outcome",key,source_event:source.event_key,data:{proposal:proposal.record_key,encounter_id:encounter.id,
    results:source.details.results,guidance:"Native combat results only. Defeated is not dead; location, witness knowledge and faction responses require separately sourced reviewed actions."}});
  });
}
/** Only native committed attacks, current actual combatants and genuine sight witnesses establish tactical history. */
export function recordObservedAttack(db,guild,request){
  const flags=db.getCityCalendar(guild).flags,data=request.data;
  if(flags.tactical_memory!==true||flags.scene_continuity!==true||!data.result||!data.breakdown.attack) return null;
  const key=`observed-attack:${request.record_key}`,prior=db.getWorldEvent(guild,key);if(prior) return prior;
  const encounter=db.getCurrentEncounter(data.session_id),attack=data.breakdown.attack;
  if(encounter?.id!==attack.encounter_id||encounter.status!=="active"||currentScene(db,guild).key!==data.scene) return null;
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);
  const combatants=db.listCombatants(encounter.id),participants=data.tag?.participants||[{character:data.character_id,roll_id:data.roll_id,breakdown:data.breakdown}];
  const observations=[];
  for(const participant of participants){
    const roll=db.getSavedRoll(guild,participant.roll_id),pc=db.getCharacter(participant.character);
    if(!roll||roll.character_id!==participant.character||roll.session_id!==data.session_id||roll.payload.request!==request.record_key
      ||pc?.guild_id!==guild) continue;
    for(const bound of binding?.data.combatants||[]){
      if(!combatants.some(row=>row.id===bound.id&&row.status==="active")||!db.getNpcProfile(guild,bound.actor)||activeCityProxy(db,guild,bound.actor)
        ||!sceneAccess(db,guild,{observer_type:"npc",observer_key:bound.actor,target_type:"character",target_key:pc.id,sense:"sight"})) continue;
      observations.push({npc:bound.actor,character:pc.id,roll_id:roll.id,
        observation:`I saw ${pc.name} attempt an attack with ${participant.breakdown.attack.weapon}. This establishes observable use, not hidden abilities, modifiers, intent, damage or death.`});
    }
  }
  if(!observations.length) return null;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key,source_id:request.record_key,kind:"tactical_observation",title:"Witnessed native attack",visibility:"gm",
      scene:data.scene,details:{encounter_id:encounter.id,observations}},"native_roll");
    for(const item of observations) db.addNpcMemory(guild,{npcKey:item.npc,memoryType:"episodic",content:item.observation,
      subjectType:"character",subjectKey:item.character,sourceType:"observed",sourceRef:source.event_key,confidence:100,importance:80,
      tags:["tactical_history","observed_native_attack",`roll:${item.roll_id}`,"no_new_mechanics"]});
    return source;
  });
}
export function worldCombatantDrafts(...args){return groundingRules().worldCombatantDrafts(...args);}

export function bindWorldCombatants(...args){return groundingRules().bindWorldCombatants(...args);}

export function validateWorldEncounterActivation(...args){return groundingRules().validateWorldEncounterActivation(...args);}

function pick(a){ return a.length?a[randomInt(a.length)]:null; }
export function defaultObjective(style="balanced"){
  const sets={
    boss:["Stop the central threat before it completes its objective.","Contain or defeat the major entity while preventing collateral damage."],
    swarm:["Hold the location long enough to complete an extraction.","Break through the hostile mass and secure the objective."],
    strike_team:["Secure the evidence before the opposing team can remove it.","Protect a witness while disabling the hostile operation."],
    hunt:["Find and pin down the hunters before they isolate a party member.","Escape the kill-zone while identifying who is directing the pursuit."],
    balanced:["Prevent the supernatural incident from escalating while neutralizing the immediate opposition.","Complete the scene objective without allowing a public Veil breach."]
  };
  return pick(sets[style]||sets.balanced);
}

import {createEncounterGroundingRules} from './encounter-grounding-rules.js';
let nativeGrounding;
function groundingRules(){return nativeGrounding??=createEncounterGroundingRules({requireCitySource,currentScene,scenePresence,actorSource,cityObject,cityKey,cityAudit,inspectNativeEncounterActivation,proposeWorldEncounter});}

import {nativeEncounterManagement} from './contracts/encounter-management.js';
// Same original management function, available before public native activation calls.
nativeEncounterManagement.bind({manageWorldEncounter});
