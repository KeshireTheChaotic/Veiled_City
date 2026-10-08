/** Encounter budget, composition, and adversary-library helpers. */
import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { cityObject, cityKey, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { scenePresence, currentScene } from "./scene-continuity.js";
import { actorSource } from "./simulation-motivation.js";

export const BATTLE_POINT_COSTS=Object.freeze({
  Minion:1, Social:1, Support:1,
  Horde:2, Ranged:2, Skulk:2, Standard:2,
  Leader:3, Bruiser:4, Solo:5
});
export const HEAVY_ROLES=new Set(["Bruiser","Horde","Leader","Solo"]);
export const DIFFICULTY_ADJUSTMENTS=Object.freeze({easy:-1,standard:0,hard:2});

export function tierForLevel(level=1){
  const n=Number(level)||1;
  if(n<=1) return 1;
  if(n<=4) return 2;
  if(n<=7) return 3;
  return 4;
}
export function baseBattlePoints(pcCount){ return (3*Number(pcCount))+2; }
export function battlePointCost(type){
  const c=BATTLE_POINT_COSTS[type];
  if(c==null) throw new Error(`Unknown Daggerheart adversary role: ${type}`);
  return c;
}
export function livePcRoster(db,sessionId){
  return db.roster(sessionId).filter(r=>["present","guest","late"].includes(r.presence) && r.character_id && r.status!=="dead" && r.status!=="retired");
}
export function partyTier(roster){
  if(!roster.length) return 1;
  return Math.max(...roster.map(r=>tierForLevel(r.data?.level||1)));
}

/** Explicit GM template bindings, sourced proposals and review use the existing encounter resolver. */
export function encounterProposalContext(db,guild){
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) return [];
  return db.listCityRecords(guild,{kind:"encounter_actor",status:"active",includeGM:true,limit:16});
}
function encounterActors(db,guild,input){
  requireCitySource(db,guild,input.source_event);
  const scene=currentScene(db,guild),actors=input.actors;
  if(!Array.isArray(actors)||!actors.length||actors.length>12||new Set(actors).size!==actors.length) throw new Error("One to twelve distinct established encounter actors required.");
  return actors.map(key=>{
    const binding=db.getCityRecord(guild,"encounter_actor",cityKey(key)),presence=scenePresence(db,guild,"npc",key);
    if(!binding||binding.status!=="active") throw new Error("GM-approved actor template binding required.");
    requireCitySource(db,guild,binding.source_event);
    if(presence?.data.state!=="actually_present"||presence.location_key!==input.location_key
      ||db.getSimulationEntity(guild,"npc",key)?.state.location_key!==input.location_key) throw new Error("Actor must actually occupy this scene; budget cannot create arrivals.");
    requireCitySource(db,guild,presence.source_event);
    actorSource(db,guild,{actor_type:"npc",actor_key:key,information_key:binding.data.information_key,source_event:input.source_event});
    return {key,template:binding.data.template,source_event:binding.source_event,presence_source:presence.source_event,scene:scene.key};
  });
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
export function manageWorldEncounter(db,guild,input,actorId,lib){
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
export function recordWorldEncounterOutcome(db,guild,encounter){
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) return null;
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);
  const proposal=binding&&db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  if(!proposal) return null;
  const key=`encounter-outcome:${encounter.id}`,prior=db.getCityRecord(guild,"encounter_outcome",key);if(prior) return prior;
  const combatants=db.listCombatants(encounter.id,{includeRemoved:true});
  const source=indexWorldEvent(db,guild,{key,title:"Recorded encounter outcome",source_id:encounter.id,kind:"encounter_outcome",visibility:"gm",location_key:proposal.location_key,
    details:{encounter_id:encounter.id,results:combatants.map(row=>({id:row.id,template:row.base_name,hp:row.hp_current,status:row.status}))}},"encounter_resolver");
  return db.saveCityRecord(guild,{kind:"encounter_outcome",key,source_event:source.event_key,data:{proposal:proposal.record_key,encounter_id:encounter.id,
    results:source.details.results,guidance:"Native combat results only. Defeated is not dead; location, witness knowledge and faction responses require separately sourced reviewed actions."}});
}
export function validateWorldEncounterActivation(db,guild,encounter){
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id);if(!binding) return;
  if(db.getCityCalendar(guild).flags.encounter_intelligence!==true) throw new Error("World encounter disabled; review/cancel the plan explicitly.");
  const proposal=db.getCityRecord(guild,"encounter_proposal",binding.data.proposal);
  if(!proposal||proposal.status!=="accepted"||proposal.data.scene!==currentScene(db,guild).key) throw new Error("World encounter scene/review changed.");
  const actors=encounterActors(db,guild,{...proposal.data,source_event:proposal.source_event,location_key:proposal.location_key});
  const roster=livePcRoster(db,encounter.session_id).filter(pc=>scenePresence(db,guild,"character",pc.character_id)?.data.state==="actually_present"
    &&scenePresence(db,guild,"character",pc.character_id)?.location_key===proposal.location_key).map(pc=>pc.character_id).sort();
  if(JSON.stringify(actors)!==JSON.stringify(proposal.data.bindings)||JSON.stringify(roster)!==JSON.stringify(binding.data.roster)
    ||JSON.stringify(encounter.composition)!==JSON.stringify(binding.data.composition)) throw new Error("World encounter actors, composition or attendance changed; review a fresh proposal.");
}
function pick(a){ return a.length?a[randomInt(a.length)]:null; }
function slug(s){ return String(s||"").trim().toLowerCase(); }

export class EncounterLibrary{
  constructor(contentRoot){
    this.contentRoot=contentRoot;
    this.adversaries=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ADVERSARIES/adversaries.json"),"utf8"));
    this.environments=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ENVIRONMENTS/environments.json"),"utf8"));
  }
  findAdversary(q){
    const s=slug(q); if(!s) return null;
    return this.adversaries.find(x=>slug(x.name)===s)||this.adversaries.find(x=>slug(x.name).includes(s))||null;
  }
  findEnvironment(q,tier=null){
    const s=slug(q);
    let pool=tier?this.environments.filter(x=>Number(x.tier)===Number(tier)):this.environments;
    if(!s) return pick(pool);
    return pool.find(x=>slug(x.name)===s)||pool.find(x=>slug(x.name).includes(s))||null;
  }
}

export function derivedAdjustments(composition,{tier,damageBoosted=false}={}){
  const rows=composition||[];
  const soloCount=rows.filter(x=>x.type==="Solo").reduce((n,x)=>n+(x.quantity||1),0);
  const hasLower=rows.some(x=>Number(x.tier)<Number(tier));
  const hasHeavy=rows.some(x=>HEAVY_ROLES.has(x.type));
  const mods=[];
  if(soloCount>=2) mods.push({key:"two_plus_solos",delta:-2,label:"2+ Solo adversaries"});
  if(damageBoosted) mods.push({key:"boosted_damage",delta:-2,label:"boosted all adversary damage"});
  if(hasLower) mods.push({key:"lower_tier",delta:+1,label:"lower-tier adversary present"});
  if(rows.length && !hasHeavy) mods.push({key:"no_heavy",delta:+1,label:"no Bruiser/Horde/Leader/Solo"});
  return mods;
}
export function recomputeBudget(encounter){
  const comp=typeof encounter.composition_json==="string"?JSON.parse(encounter.composition_json||"[]"):(encounter.composition||[]);
  const derived=derivedAdjustments(comp,{tier:encounter.tier,damageBoosted:!!encounter.damage_boosted});
  const diff=DIFFICULTY_ADJUSTMENTS[encounter.difficulty]??0;
  const custom=Number(encounter.custom_adjustment_bp||0);
  const budget=Number(encounter.base_bp)+diff+custom+derived.reduce((n,x)=>n+x.delta,0);
  const spent=comp.reduce((n,x)=>n+Number(x.spent_bp||0),0);
  return {budget,spent,derived,difficultyAdjustment:diff,remaining:budget-spent};
}

function makeItem(a,pcCount){
  const cost=battlePointCost(a.type);
  return {name:a.name,type:a.type,tier:a.tier,bp_cost:cost,quantity:1,unit_count:a.type==="Minion"?pcCount:1,spent_bp:cost};
}
function addItem(comp,item,pcCount){
  const existing=comp.find(x=>x.name===item.name);
  if(existing){
    existing.quantity+=1;
    existing.unit_count+=item.type==="Minion"?pcCount:1;
    existing.spent_bp+=item.bp_cost;
  } else comp.push(item);
}

export function autoBuildComposition({adversaries,tier,budget,pcCount,style="balanced"}){
  const primary=adversaries.filter(x=>Number(x.tier)===Number(tier) && x.type!=="Social");
  if(!primary.length) throw new Error(`No Tier ${tier} adversaries are available.`);
  const comp=[]; let remaining=budget;
  const rolePrefs={
    balanced:["Leader","Bruiser","Horde","Solo"],
    boss:["Solo","Leader","Bruiser"],
    swarm:["Horde","Leader","Bruiser"],
    strike_team:["Leader","Bruiser","Horde"],
    hunt:["Leader","Bruiser","Horde"]
  }[style]||["Leader","Bruiser","Horde","Solo"];
  let first=null;
  for(const role of rolePrefs){
    const candidates=primary.filter(x=>x.type===role && battlePointCost(x.type)<=remaining);
    if(candidates.length){ first=pick(candidates); break; }
  }
  if(first){ const i=makeItem(first,pcCount); addItem(comp,i,pcCount); remaining-=i.spent_bp; }
  const duplicateAllowed=(a)=>{
    const row=comp.find(x=>x.name===a.name);
    if(!row) return true;
    const max=a.type==="Minion"?3:a.type==="Standard"||a.type==="Ranged"||a.type==="Skulk"||a.type==="Support"?2:1;
    return row.quantity<max;
  };
  let guard=0;
  while(remaining>0 && guard++<100){
    const soloCount=comp.filter(x=>x.type==="Solo").reduce((n,x)=>n+x.quantity,0);
    const valid=(x)=>battlePointCost(x.type)<=remaining && !(x.type==="Solo"&&soloCount>=1) && duplicateAllowed(x);
    let candidates=primary.filter(valid);
    if(style==="swarm") candidates.sort((a,b)=>Number(["Minion","Horde"].includes(b.type))-Number(["Minion","Horde"].includes(a.type)));
    if(style==="hunt") candidates.sort((a,b)=>Number(["Skulk","Ranged"].includes(b.type))-Number(["Skulk","Ranged"].includes(a.type)));
    if(style==="strike_team") candidates.sort((a,b)=>Number(["Standard","Ranged","Support"].includes(b.type))-Number(["Standard","Ranged","Support"].includes(a.type)));
    if(!candidates.length) break;
    const chosen=pick(candidates.slice(0,Math.min(candidates.length,8)));
    const item=makeItem(chosen,pcCount);
    addItem(comp,item,pcCount); remaining-=item.spent_bp;
  }
  return comp;
}

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
