/** Existing native encounter roster/tier/composition policy. Source loading, world memory and creative objective selection remain in their original provider. */
import {tierForLevel,battlePointCost} from "./encounter-budget.js";
export function createEncounterCompositionRules({randomInt}){
if(typeof randomInt!=="function")throw new TypeError("Native encounter random-index capability required.");
function pick(a){return a.length?a[randomInt(a.length)]:null;}
function livePcRoster(db,sessionId){
  return db.roster(sessionId).filter(r=>["present","guest","late"].includes(r.presence) && r.character_id && r.status!=="dead" && r.status!=="retired");
}
function partyTier(roster){
  if(!roster.length) return 1;
  return Math.max(...roster.map(r=>tierForLevel(r.data?.level||1)));
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

function autoBuildComposition({adversaries,tier,budget,pcCount,style="balanced"}){
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


return Object.freeze({livePcRoster,partyTier,autoBuildComposition});
}
