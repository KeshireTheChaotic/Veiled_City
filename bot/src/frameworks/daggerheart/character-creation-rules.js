/** Existing native character creation constraints; source vocabulary and narrative hook review remain character-owned. */
export function createCharacterCreationRules({classDomains:CLASS_DOMAINS,customDomains:CUSTOM_DOMAINS,traits:TRAITS,normalizeClassName}){
if(!CLASS_DOMAINS||!(CUSTOM_DOMAINS instanceof Set)||!Array.isArray(TRAITS)||typeof normalizeClassName!=='function')throw new TypeError('Character creation source capabilities required');
function validateDomainAccess(className,domains=[]){
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
function validateTraitSpread(traits={}){
  const vals=TRAITS.map(k=>Number(traits?.[k.toLowerCase()]??traits?.[k]));
  if(vals.some(Number.isNaN)) return {ok:false,error:"Traits must provide Agility, Strength, Finesse, Instinct, Presence, and Knowledge."};
  const expected=[-1,0,0,1,1,2].sort((a,b)=>a-b).join(",");
  if(vals.slice().sort((a,b)=>a-b).join(",")!==expected) return {ok:false,error:"Level 1 traits must use exactly -1, 0, 0, +1, +1, +2."};
  return {ok:true};
}

function validateStartingLoadout(d){const errors=[];
  if((d?.experiences||[]).length!==2) errors.push("exactly two starting Experiences are required");
  if((d?.domain_cards||[]).length!==2) errors.push("exactly two starting domain cards are required");
return errors;}
return Object.freeze({validateDomainAccess,validateTraitSpread,validateStartingLoadout});
}
