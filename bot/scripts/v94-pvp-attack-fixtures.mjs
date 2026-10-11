/** Shared synthetic native v3 consent/weapon/presence fixture. No test registration or production data. */
import {proposeDamagePvp,reviewDamagePvp,respondDamagePvp,stageDamagePvp} from "../src/pvp-profiles.js";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
export async function attackFixture(f,{count=2,kind="weapon"}={}){
  const pcs=f.pcs.slice(0,count),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true,roll_requests:true,roll_collaboration:true}});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  const source=indexWorldEvent(f.db,f.guild,{key:"attack-scene",kind:"observation",source_id:"gm",title:"Established scene positions",
    session_id:f.session.id,scene:scene.key,visibility:"party",location_key:"terminal"},"gm");
  for(const pc of pcs){
    f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.proficiency=2;d.thresholds={major:7,severe:14};
      d.inventory=[{name:"Practice Blade",equipped:true,trait:"Finesse",range:"Melee",damage_die:8,damage_modifier:2,damage_type:"physical"}];});
    recordScenePresence(f.db,f.guild,{source_event:source.event_key,entity_type:"character",entity_key:pc.id,
      location_key:"terminal",zone:"floor",range:"Melee",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  }
  const accepted=f.accepted(0,"I attempt to strike Choso.",pcs[1].id,{operation:"attack"}),terms={
    version:3,profile:"damage_enabled",objective:"Voluntary arms test with real death risk.",participants:pcs.map(pc=>({character:pc.id,team:null})),
    interaction_scope:count===2?"duel":"free_for_all",target_permissions:pcs.flatMap(a=>pcs.filter(t=>t.id!==a.id).map(t=>({actor:a.id,target:t.id,effect_class:"attack_damage",max_risk:"lethal"}))),
    stakes:pcs.map(pc=>({character:pc.id,best:"My own permitted success.",worst:"Real damage and my own death move may follow."})),
    boundaries:["no_forced_player_dialogue","no_private_information_disclosure","no_forced_player_control","no_involuntary_item_loss","no_authored_permanent_scar"],
    allow_damage:true,lethality:"lethal",last_hp_policy:"owner_selected_srd_death_move",critical_stress_policy:"disabled",
    hope_policy:"no_pvp_hope_generation",fear_policy:"immediate_contextual_fear",scoring_policy:"none",features:[],
    resource_spending:"owner_native_only",audience:"private",stop_policy:"neutral_withdrawal_preserve_committed_effects",expires_minute:1000};
  let p=proposeDamagePvp(f.db,f.guild,pcs[0].owner_user_id,{accepted_intent:accepted.record_key,terms},{interactionId:"attack-offer"});
  for(const pc of pcs){reviewDamagePvp(f.db,f.guild,pc.owner_user_id,p.record_key);p=respondDamagePvp(f.db,f.guild,pc.owner_user_id,
    {contract:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"},{interactionId:`attack-sign:${pc.id}`});}
  const staged=stageDamagePvp(f.db,f.guild,accepted);
  f.db.upsertRulesRuling(f.guild,{key:"pc-attack",createdBy:"gm",ruling:"SRD 2.0: owned equipped Blade uses Finesse, Melee, proficiency d8+2 physical; unarmed Strength or Finesse, proficiency d4 physical. Standard target Evasion; no extra defender roll."});
  return {contract:p,staged,input:{attack:staged.record_key,kind,weapon:kind==="unarmed"?null:"Practice Blade",
    trait:kind==="unarmed"?"Strength":"Finesse",modifier_keys:[],ruling:"pc-attack"}};
}
