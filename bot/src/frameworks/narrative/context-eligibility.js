/** Original retrieval-only availability and eligibility; no truth, audience or effect grant. */
export function nativeSalienceAvailable(db,guild){
  const flags=db.getCityCalendar(guild).flags;
  return flags.narrative_salience===true||flags.narrative_authority===true&&flags.playable_narration===true
    &&(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')==='autonomous';
}
export function names(db,guild,entity){
  const d=db.getCityRecord(guild,'autonomous_entity',entity)?.data;
  return d?[d.key,d.name,...(d.aliases||[])].filter(x=>typeof x==='string'&&x.length>=3):[];
}
export const mentions=(text,values)=>values.some(name=>String(text).toLocaleLowerCase().includes(name.toLocaleLowerCase()));
export function createNarrativeContextEligibility({narrativeImportance}){if(typeof narrativeImportance!=='function')throw new TypeError('Original Narrative importance source required.');
function narrativeContextEligible(db,guild,entity,scope,{query='',location=null}={}){
  if(!nativeSalienceAvailable(db,guild))return true;
  const importance=narrativeImportance(db,guild,entity,scope);
  return importance?.status!=='prompt_archived'||importance.pins.length>0||mentions(query,names(db,guild,entity))||entity===`location:${location}`;
}
return Object.freeze({narrativeContextEligible});}
