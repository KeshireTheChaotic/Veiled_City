/** Read-only query expansion over already-authorized aliases. Expansion finds records, never establishes identity/truth. */
export function scopedQueryPlan(db,guild,user,character,query,{contextId=character,owner=true}={}){
  const terms=[...new Set(String(query).toLowerCase().match(/[a-z0-9-]{3,}/g)||[])];
  const stop=new Set(['what','was','were','the','that','this','about','know','have','did','there','with','from','lead','leads','remember','remind','our','and','someone']);
  const search=terms.filter(term=>!stop.has(term)).slice(0,10);
  const groups=[["cafe","café","diner","restaurant","coffee"],["lead","clue","evidence"],["letter","note","message"]];
  for(const group of groups)if(group.some(word=>terms.includes(word)))search.push(...group);
  const aliases=[];
  const indexed=search.flatMap(term=>db.characterContinuity(guild,contextId,{kind:"narrative_context",query:term,limit:12}));
  const rows=[...new Map([...indexed,...db.characterContinuity(guild,contextId,{kind:"narrative_context",limit:8})]
    .map(row=>[row.record_key,row])).values()].slice(0,50);
  for(const row of rows){
    const input=db.getWorldEvent(guild,row.source_event);
    if(input?.status!=="active"||input.details.author!==user||!db.ownerAuthoredSource(guild,input.event_key,user))continue;
    for(const ref of row.data.interpretation.references||[]){
      if(ref.status!=="resolved"||!ref.source_refs.every(key=>{
        const source=db.getWorldEvent(guild,key.replace(/^event:/,""));return source?.status==="active"
          &&(!source.details.private_scene||!source.details.principal||source.details.principal.context_id===contextId)&&(
          ["party","public"].includes(source.visibility)||source.visibility==="character"&&source.subject_key===contextId
          ||source.visibility==="player"&&source.subject_key===user);
      }))continue;
      if(search.some(term=>`${ref.phrase} ${ref.entity_key}`.toLowerCase().includes(term))
        ||/\b(?:it|there|that place|that person|they|him|her)\b/i.test(query)&&aliases.length<3){
        aliases.push({phrase:ref.phrase,entity_key:ref.entity_key,entity_type:ref.entity_type,source_refs:ref.source_refs});
        search.push(ref.phrase.toLowerCase(),ref.entity_key.toLowerCase());
      }
    }
  }
  return {terms:[...new Set(search)].slice(0,24),aliases:aliases.slice(0,12),contextId,owner,
    authority:"Query expansion only; similarity/alias is not established identity. No hidden sources searched.",
    omissions:rows.length===50?[{reason:"alias_scan_limit",limit:50}]:[]};
}
export function queryScopedFacts(db,guild,user,character,plan,{limit=50}={}){
  return db.scopedFactSearch(guild,user,character,plan,{limit});
}
