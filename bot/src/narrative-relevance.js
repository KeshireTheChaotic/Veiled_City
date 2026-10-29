/** Bounded read-only text relevance. Never identity, knowledge, intent or effect authority. */
import {narrativeWorldIdentityOrigin} from './frameworks/narrative/public.js';
function worldIdentityOrigin(...args){return narrativeWorldIdentityOrigin.worldIdentityOrigin(...args);}
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
  const row=entity&&db.getCityRecord(guild,'autonomous_entity',entity),d=row?.data;
  if(!d||!worldIdentityOrigin(db,guild,row,scope))return 0;
  return narrativeQueryRelevance([d.key,d.name,...(Array.isArray(d.aliases)?d.aliases:[])].join(' '),query);
}
import {narrativeRelevanceSource} from './frameworks/narrative/public.js';
// Provide this module's original relevance functions to the fixed Narrative slot; no other authority is granted.
narrativeRelevanceSource.bind({narrativeQueryRelevance,narrativeIdentityRelevance});
