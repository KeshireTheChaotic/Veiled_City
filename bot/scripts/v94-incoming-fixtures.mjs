/** Synthetic native incoming encounter, reusable without importing test registrations. */
import {EncounterLibrary} from "../src/encounter.js";
import {buildCombatants} from "../src/combat.js";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
export function incomingFixture(f){
  const pc=f.pcs[1],lib=new EncounterLibrary("../content"),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"guard",displayName:"Guard"});f.db.setSimulationEntity(f.guild,"npc","guard",{location_key:"terminal"});
  f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const s=indexWorldEvent(f.db,f.guild,{key:"incoming-scene",kind:"observation",source_id:"gm",title:"Established guard and target",
    session_id:f.session.id,scene:scene.key,location_key:"terminal",visibility:"party"},"gm");
  for(const [type,key] of [["npc","guard"],["character",pc.id]])recordScenePresence(f.db,f.guild,{source_event:s.event_key,entity_type:type,
    entity_key:key,location_key:"terminal",zone:"scene",range:"Close",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  const e=f.db.createEncounter(f.guild,f.session.id,{status:"active",tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:"Aster Vale Contractor",quantity:1}]});
  const c=f.db.initializeCombatants(e.id,buildCombatants(e,lib))[0];
  f.db.saveCityRecord(f.guild,{kind:"encounter_binding",key:e.id,source_event:s.event_key,data:{combatants:[{actor:"guard",id:c.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:"incoming-standard",ruling:"Current guard standard attack, current base target defenses.",createdBy:"gm"});
  return {pc,lib,input:{npc:"guard",combatant:c.id,character:pc.id,source:s.event_key,ruling:"incoming-standard",
    defenses:{resistance:"none",armor_reduction:1,armor_allowed:true,source:"base"}}};
}
