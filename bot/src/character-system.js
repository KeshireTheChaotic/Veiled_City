/** Character creation and level-up validation rules for Veiled City Daggerheart characters. */
export const CLASS_DOMAINS=Object.freeze({
  Assassin:["Blade","Midnight"], Bard:["Codex","Grace"], Brawler:["Valor","Bone"],
  Druid:["Arcana","Sage"], Guardian:["Blade","Valor"], Ranger:["Bone","Sage"],
  Rogue:["Grace","Midnight"], Seraph:["Splendor","Valor"], Sorcerer:["Arcana","Midnight"],
  Warlock:["Dread","Grace"], Warrior:["Blade","Bone"], Witch:["Dread","Sage"], Wizard:["Codex","Splendor"]
});
export const CUSTOM_DOMAINS=new Set(["Hex","Signal","Veil","Pact"]);
export const TRAITS=["Agility","Strength","Finesse","Instinct","Presence","Knowledge"];
export const ADVANCEMENTS=["traits","hp","stress","experience","domain","evasion","subclass","proficiency","multiclass"];
export const SLOT_LIMITS=Object.freeze({
  2:{traits:3,hp:2,stress:2,experience:1,domain:1,evasion:1,subclass:0,proficiency:0,multiclass:0},
  3:{traits:3,hp:2,stress:2,experience:1,domain:1,evasion:1,subclass:1,proficiency:1,multiclass:1},
  4:{traits:3,hp:2,stress:2,experience:1,domain:1,evasion:1,subclass:1,proficiency:1,multiclass:1}
});

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

export function tierForLevel(level){ const n=Number(level)||1; return n<=1?1:n<=4?2:n<=7?3:4; }
export function tierAchievement(targetLevel){
  if([2,5,8].includes(Number(targetLevel))) return {new_experience:true,proficiency:+1,clear_trait_marks:Number(targetLevel)>=5};
  return {new_experience:false,proficiency:0,clear_trait_marks:false};
}
export function legalAdvancements(targetLevel){
  const n=Number(targetLevel); const out=["traits","hp","stress","experience","domain","evasion"];
  if(n>=5) out.push("subclass","proficiency","multiclass");
  return out;
}
function parseList(s){ return String(s||"").split(/[,|]/).map(x=>x.trim()).filter(Boolean); }
function experienceName(e){ return typeof e==="string"?e:String(e?.name||""); }
function experienceMod(e){ return typeof e==="object"&&e?Number(e.modifier??2):2; }
function normalizeExperiences(arr=[]){ return arr.map(e=>typeof e==="string"?{name:e,modifier:2}:{name:String(e.name||""),modifier:Number(e.modifier??2)}); }

function allocateAdvancementSlots(data,targetTier,choices){
  const usage=structuredClone(data.advancement_state?.slot_usage||{});
  const allocations=[];
  for(const choice of choices){
    const available=[];
    for(let t=targetTier;t>=2;t--){
      const limit=SLOT_LIMITS[t]?.[choice]||0; const used=Number(usage[t]?.[choice]||0);
      if(used<limit) available.push(t);
    }
    if(!available.length) throw new Error(`No unmarked ${choice} advancement slots remain in Tier ${targetTier} or below.`);
    const t=available[0]; usage[t]=usage[t]||{}; usage[t][choice]=Number(usage[t][choice]||0)+1; allocations.push({choice,tier_slot:t});
  }
  return {usage,allocations};
}

export function prepareLevelup(character,{advancementOne,advancementTwo,detailOne="",detailTwo="",domainCard="",domain="",cardLevel=null,tierExperience="",customCards={}}={}){
  const d=structuredClone(character.data||{}); const from=Number(d.level||1); if(from>=10) throw new Error("This character is already level 10.");
  const to=from+1; const legal=new Set(legalAdvancements(to));
  const a1=String(advancementOne||""); const a2=String(advancementTwo||"");
  if(!legal.has(a1)||!legal.has(a2)) throw new Error(`Legal advancements for level ${to}: ${[...legal].join(", ")}.`);
  if(["proficiency","multiclass"].includes(a1)||["proficiency","multiclass"].includes(a2)){
    if(a1!==a2 || !["proficiency","multiclass"].includes(a1)) throw new Error("Proficiency and multiclass each consume both advancement choices; choose the same option twice.");
  }
  if(a1==="subclass"&&a2==="multiclass" || a1==="multiclass"&&a2==="subclass") throw new Error("Upgraded subclass and multiclass are mutually exclusive in the same tier.");
  const ach=tierAchievement(to); if(ach.new_experience&&!String(tierExperience).trim()) throw new Error(`Level ${to} grants a new Experience at +2; provide tier_experience.`);
  const targetTier=tierForLevel(to);
  const slotChoices=(a1===a2 && ["proficiency","multiclass"].includes(a1))?[a1]:[a1,a2];
  const slotPlan=allocateAdvancementSlots(d,targetTier,slotChoices);
  const domains=d.domains||[];
  let cardMeta=null;
  const allCustom=Object.entries(customCards||{}).flatMap(([dom,cards])=>(cards||[]).map(c=>({...c,domain:dom})));
  const match=allCustom.find(c=>c.name.toLowerCase()===String(domainCard).trim().toLowerCase());
  if(match) cardMeta={name:match.name,domain:match.domain,level:Number(match.level),source:"Veiled City homebrew"};
  else cardMeta={name:String(domainCard||"").trim(),domain:String(domain||"").trim(),level:Number(cardLevel||0),source:"Daggerheart SRD metadata supplied by player"};
  if(!cardMeta.name) throw new Error("Every level-up grants a domain card; provide domain_card.");
  if(!domains.map(x=>x.toLowerCase()).includes(cardMeta.domain.toLowerCase())) throw new Error(`Domain card must come from an accessible domain: ${domains.join(", ")}.`);
  if(!cardMeta.level||cardMeta.level>to) throw new Error(`Domain card level must be 1-${to}.`);
  const details=[detailOne,detailTwo];
  const advancementChanges=[];
  for(const [i,a] of [a1,a2].entries()){
    const detail=details[i];
    if(a==="traits"){
      const ts=parseList(detail); if(ts.length!==2||ts.some(x=>!TRAITS.map(t=>t.toLowerCase()).includes(x.toLowerCase()))) throw new Error("traits advancement detail must name exactly two traits, e.g. Agility,Presence.");
      const marked=new Set((d.advancement_state?.trait_marks||[]).map(x=>String(x).toLowerCase()));
      if(ts.some(x=>marked.has(x.toLowerCase()))) throw new Error("A marked trait cannot be increased again until the next tier clears trait marks.");
      advancementChanges.push({type:a,traits:ts});
    }else if(a==="experience"){
      const xs=parseList(detail); if(xs.length!==2) throw new Error("experience advancement detail must name exactly two existing Experiences.");
      advancementChanges.push({type:a,experiences:xs});
    }else if(a==="domain"){
      const [name,dom,lvl]=String(detail||"").split("|").map(x=>x.trim()); if(!name||!dom||!lvl) throw new Error("additional domain advancement detail format: Card Name|Domain|Level.");
      if(!domains.map(x=>x.toLowerCase()).includes(dom.toLowerCase())||Number(lvl)>to) throw new Error("Additional domain card is not eligible for this character/level.");
      advancementChanges.push({type:a,card:{name,domain:dom,level:Number(lvl)}});
    }else if(a==="multiclass"){
      const [cls,dom,subclass]=String(detail||"").split("|").map(x=>x.trim()); const c=normalizeClassName(cls); if(!c||!CLASS_DOMAINS[c].includes(dom)||!subclass) throw new Error("multiclass detail format: Class|Domain|Subclass, using one valid domain from that class.");
      advancementChanges.push({type:a,class:c,domain:dom,subclass});
    }else advancementChanges.push({type:a});
  }
  return {from_level:from,to_level:to,tier:targetTier,tier_achievement:ach,tier_experience:String(tierExperience||"").trim(),advancements:[a1,a2],advancement_allocations:slotPlan.allocations,slot_usage_after:slotPlan.usage,advancement_changes:advancementChanges,automatic_domain_card:cardMeta};
}

export function applyLevelupToData(data,plan){
  const d=structuredClone(data); d.level=plan.to_level;
  d.proficiency=Number(d.proficiency||1)+(plan.tier_achievement.proficiency||0);
  d.experiences=normalizeExperiences(d.experiences||[]);
  if(plan.tier_achievement.new_experience) d.experiences.push({name:plan.tier_experience,modifier:2});
  d.advancement_state=d.advancement_state||{trait_marks:[],slot_usage:{},history:[]};
  d.advancement_state.slot_usage=plan.slot_usage_after||d.advancement_state.slot_usage||{};
  if(plan.tier_achievement.clear_trait_marks) d.advancement_state.trait_marks=[];
  for(const ch of plan.advancement_changes){
    if(ch.type==="traits") for(const t of ch.traits){ const key=Object.keys(d.traits||{}).find(k=>k.toLowerCase()===t.toLowerCase())||t.toLowerCase(); d.traits=d.traits||{}; d.traits[key]=Number(d.traits[key]||0)+1; d.advancement_state.trait_marks.push(t); }
    if(ch.type==="hp"){d.resources=d.resources||{}; d.resources.hp=d.resources.hp||{current:0,max:0}; d.resources.hp.max=Math.min(12,Number(d.resources.hp.max||0)+1);}
    if(ch.type==="stress"){d.resources=d.resources||{}; d.resources.stress=d.resources.stress||{current:0,max:6}; d.resources.stress.max=Math.min(12,Number(d.resources.stress.max||6)+1);}
    if(ch.type==="experience") for(const n of ch.experiences){const e=d.experiences.find(x=>experienceName(x).toLowerCase()===n.toLowerCase()); if(!e) throw new Error(`Experience not found: ${n}`); e.modifier=experienceMod(e)+1;}
    if(ch.type==="domain") d.domain_cards=[...(d.domain_cards||[]),ch.card];
    if(ch.type==="evasion") d.evasion=Number(d.evasion||0)+1;
    if(ch.type==="subclass") d.subclass_rank=d.subclass_rank==="specialization"?"mastery":"specialization";
    if(ch.type==="proficiency") d.proficiency=Number(d.proficiency||1)+0.5; // applied twice below totals +1
    if(ch.type==="multiclass" && !d.multiclass) d.multiclass={class:ch.class,domain:ch.domain,subclass:ch.subclass};
  }
  // Proficiency uses both advancement slots. Two +0.5 applications become the official +1.
  d.proficiency=Math.round(Number(d.proficiency||1)*2)/2;
  d.domain_cards=[...(d.domain_cards||[]),plan.automatic_domain_card];
  if(d.thresholds){ if(Number.isFinite(Number(d.thresholds.major))) d.thresholds.major=Number(d.thresholds.major)+1; if(Number.isFinite(Number(d.thresholds.severe))) d.thresholds.severe=Number(d.thresholds.severe)+1; }
  d.advancement_state.history.push(plan);
  return d;
}
