import fs from 'node:fs';
import path from 'node:path';
import {randomInt} from 'node:crypto';
import {jsonHash} from '../../kernel/json-hash.js';

function pick(a){ return a.length?a[randomInt(a.length)]:null; }
function slug(s){ return String(s||"").trim().toLowerCase(); }

export class EncounterLibrary{
  constructor(contentRoot){
    this.contentRoot=contentRoot;
    this.adversaries=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ADVERSARIES/adversaries.json"),"utf8"));
    this.environments=JSON.parse(fs.readFileSync(path.join(contentRoot,"GM_PRIVATE/ENVIRONMENTS/environments.json"),"utf8"));
  }
  findAdversary(q){
    const s=slug(q); if(!s) return null;
    return this.adversaries.find(x=>slug(x.name)===s)||this.adversaries.find(x=>slug(x.name).includes(s))||null;
  }
  findEnvironment(q,tier=null){
    const s=slug(q);
    let pool=tier?this.environments.filter(x=>Number(x.tier)===Number(tier)):this.environments;
    if(!s) return pick(pool);
    return pool.find(x=>slug(x.name)===s)||pool.find(x=>slug(x.name).includes(s))||null;
  }
  /** Exact read-only domain-card identity; missing PC content does not disable encounter sources. */
  findDomainCard(ref){
    if(typeof ref!=='string'||!ref.startsWith('domain:')||ref.length>200)return null;
    const file=path.join(this.contentRoot,'CARDS/domain_cards.json');
    if(!fs.existsSync(file))return null;
    const domains=JSON.parse(fs.readFileSync(file,'utf8')),matches=[],key=s=>slug(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    for(const [domain,cards] of Object.entries(domains)){
      if(!Array.isArray(cards))continue;
      for(const [index,card] of cards.entries()){
        if(!card||typeof card.name!=='string')continue;
        const feature=`domain:${key(domain)}:${key(card.name)}`;
        if(feature===ref)matches.push({feature,domain,card,source_ref:`content/CARDS/domain_cards.json#${domain}/${index}`,source_hash:jsonHash(card)});
      }
    }
    return matches.length===1?matches[0]:null;
  }
}
export const loadEncounterLibrary=root=>new EncounterLibrary(root);
export const isEncounterLibrary=value=>value instanceof EncounterLibrary;
