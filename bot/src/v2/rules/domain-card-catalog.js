import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const key=s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
/** Current packaged card content only; no GM-private library, activation or effect authority. */
export function createDomainCardCatalog(filename){
 return Object.freeze({findDomainCard(ref){
  if(typeof ref!=='string'||!ref.startsWith('domain:')||ref.length>200)return null;
  const domains=JSON.parse(readFileSync(filename,'utf8')),matches=[];
  for(const [domain,cards] of Object.entries(domains))if(Array.isArray(cards))for(const [index,card] of cards.entries()){
   if(!card||typeof card.name!=='string')continue;
   const feature=`domain:${key(domain)}:${key(card.name)}`;
   if(feature===ref)matches.push({feature,domain,card,source_ref:`content/CARDS/domain_cards.json#${domain}/${index}`,source_hash:createHash('sha256').update(JSON.stringify(card)).digest('hex')});
  }
  if(matches.length>1)throw new Error('Ambiguous packaged domain card source');return matches[0]??null;
 }});
}
