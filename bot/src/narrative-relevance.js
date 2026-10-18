/** Bounded read-only text relevance. Never identity, knowledge, intent or effect authority. */
import {factVisibleTo} from './disclosure-authority.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
export function narrativeQueryRelevance(text,query){
  const words=value=>String(value||'').toLocaleLowerCase().match(/[\p{L}\p{N}-]{3,}/gu)||[];
  const wanted=[...new Set(words(String(query||'').slice(0,4000)))].slice(0,32);
  if(!wanted.length)return 0;
  const found=new Set(words(String(text||'').slice(0,6000)));
  return wanted.reduce((total,word)=>total+(found.has(word)?100:0),0);
}
/** Only native-established audience-entitled identity names may strengthen recall.
 * Mutable simulation aliases/model references are not establishment or disclosure proof. */
export function narrativeIdentityRelevance(db,guild,entity,scope,query){
  const row=entity&&db.getCityRecord(guild,'autonomous_entity',entity),d=row?.data,
    source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.status!=='active'||!d||entity!==`${d.kind}:${d.key}`
    ||!factVisibleTo({...row,subject_character_id:row.subject_key},scope)
    ||source?.status!=='active'||source.kind!=='native_narrative_entity'||source.source_id!=='native:narrative-authority'
    ||source.details.entity_type!==d.kind||source.details.entity_key!==d.key||source.details.input_source!==d.narrative_origin
    ||!narrativeSourceVisible(db,guild,row.source_event,scope))return 0;
  return narrativeQueryRelevance([d.key,d.name,...(Array.isArray(d.aliases)?d.aliases:[])].join(' '),query);
}
