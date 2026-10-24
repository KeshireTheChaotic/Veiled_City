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
export function validateDomainAccess(...args){return characterCreationConsumer.validateDomainAccess(...args);}
export function validateTraitSpread(...args){return characterCreationConsumer.validateTraitSpread(...args);}
export function validateConceptDraft(d){
  const errors=[];
  if(!d?.name?.trim()) errors.push("name is required");
  const dom=validateDomainAccess(d?.class,d?.domains||[]); if(!dom.ok) errors.push(dom.error);
  if(d?.traits && Object.keys(d.traits).length){const tv=validateTraitSpread(d.traits); if(!tv.ok) errors.push(tv.error);}
  errors.push(...characterCreationConsumer.validateStartingLoadout(d));
  if((d?.hook_proposals||[]).some(h=>!["established","open_question","permission_to_complicate"].includes(h.classification))) errors.push("hook proposal classification is invalid");
  return {ok:!errors.length,errors,normalizedClass:dom.className||d?.class};
}


import {characterCreationConsumer} from './frameworks/character/public.js';
characterCreationConsumer.provideSources(()=>({classDomains:CLASS_DOMAINS,customDomains:CUSTOM_DOMAINS,traits:TRAITS,normalizeClassName}));
