/** Encounter budget, composition, and adversary-library helpers. */
import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";

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
