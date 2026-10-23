/** Character creation source vocabulary and validation. Level advancement policy is owned by Daggerheart. */
export const CLASS_DOMAINS=Object.freeze({
  Assassin:["Blade","Midnight"], Bard:["Codex","Grace"], Brawler:["Valor","Bone"],
  Druid:["Arcana","Sage"], Guardian:["Blade","Valor"], Ranger:["Bone","Sage"],
  Rogue:["Grace","Midnight"], Seraph:["Splendor","Valor"], Sorcerer:["Arcana","Midnight"],
  Warlock:["Dread","Grace"], Warrior:["Blade","Bone"], Witch:["Dread","Sage"], Wizard:["Codex","Splendor"]
});
export const CUSTOM_DOMAINS=new Set(["Hex","Signal","Veil","Pact"]);
export const TRAITS=["Agility","Strength","Finesse","Instinct","Presence","Knowledge"];
export const ADVANCEMENTS=["traits","hp","stress","experience","domain","evasion","subclass","proficiency","multiclass"];

export function normalizeClassName(name=""){
  const q=String(name).trim().toLowerCase();
  return Object.keys(CLASS_DOMAINS).find(x=>x.toLowerCase()===q)||null;
}
export function validateDomainAccess(className,domains=[]){
  const cls=normalizeClassName(className); if(!cls) return {ok:false,error:`Unknown SRD 2.0 class: ${className}`};
  const ds=(domains||[]).map(x=>String(x).trim()).filter(Boolean);
  if(ds.length!==2) return {ok:false,error:"A character must have exactly two active class domains."};
  const base=CLASS_DOMAINS[cls];
  const customs=ds.filter(x=>CUSTOM_DOMAINS.has(x));
  if(customs.length>1) return {ok:false,error:"Veiled City allows at most one custom-domain replacement at character creation."};
  if(customs.length===0 && !ds.every(x=>base.includes(x))) return {ok:false,error:`${cls}'s normal domains are ${base.join(" & ")}.`};
  if(customs.length===1){
    const official=ds.find(x=>!CUSTOM_DOMAINS.has(x));
    if(!base.includes(official)) return {ok:false,error:`With one Veiled City replacement, the remaining official domain must be one of ${base.join(" / ")}.`};
  }
  return {ok:true,className:cls,domains:ds};
}
export function validateTraitSpread(traits={}){
  const vals=TRAITS.map(k=>Number(traits?.[k.toLowerCase()]??traits?.[k]));
  if(vals.some(Number.isNaN)) return {ok:false,error:"Traits must provide Agility, Strength, Finesse, Instinct, Presence, and Knowledge."};
  const expected=[-1,0,0,1,1,2].sort((a,b)=>a-b).join(",");
  if(vals.slice().sort((a,b)=>a-b).join(",")!==expected) return {ok:false,error:"Level 1 traits must use exactly -1, 0, 0, +1, +1, +2."};
  return {ok:true};
}
export function validateConceptDraft(d){
  const errors=[];
  if(!d?.name?.trim()) errors.push("name is required");
  const dom=validateDomainAccess(d?.class,d?.domains||[]); if(!dom.ok) errors.push(dom.error);
  if(d?.traits && Object.keys(d.traits).length){const tv=validateTraitSpread(d.traits); if(!tv.ok) errors.push(tv.error);}
  if((d?.experiences||[]).length!==2) errors.push("exactly two starting Experiences are required");
  if((d?.domain_cards||[]).length!==2) errors.push("exactly two starting domain cards are required");
  if((d?.hook_proposals||[]).some(h=>!["established","open_question","permission_to_complicate"].includes(h.classification))) errors.push("hook proposal classification is invalid");
  return {ok:!errors.length,errors,normalizedClass:dom.className||d?.class};
}

