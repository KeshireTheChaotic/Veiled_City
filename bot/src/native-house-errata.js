/** Explicit owner-authored errata, not a claim about original RAW or an executable model payload. */
import fs from 'node:fs';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const data=freeze(JSON.parse(fs.readFileSync(new URL('./native-house-errata.json',import.meta.url),'utf8')));
const handlers=Object.freeze({many_deaths_fear_opportunity:Object.freeze([1]),local_mesh_allied_zone:Object.freeze([2])});
export function compileNativeHouseErrata(){
  const features=compileNativeFeatures(),signal=fs.readFileSync(new URL('../../content/CARDS/DOMAINS/SIGNAL.md',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  if(data.version!==1||data.authority!=='owner:ua7-ua11-conflict-resolution:v1'||new Set(data.entries.map(e=>`${e.id}:${e.version}`)).size!==data.entries.length)
    throw fail('house_errata_source_registry');
  for(const entry of data.entries){
    if(!Number.isSafeInteger(entry.version)||entry.version<1||!['supported','review_only'].includes(entry.status)||!entry.sources.length
      ||entry.status==='supported'&&(!Object.hasOwn(handlers,entry.native_handler)||!handlers[entry.native_handler].includes(entry.version))
      ||entry.status==='review_only'&&entry.native_handler!==null)throw fail('house_errata_native_handler');
    for(const source of entry.sources){
      if(source.kind==='feature'){
        const feature=features.find(f=>f.feature_key===source.key);
        if(feature?.source_hash!==source.source_hash||feature.template_hash!==source.template_hash)throw fail('house_errata_source_hash_changed');
      }else if(source.kind==='signal_card'){
        const start=signal.indexOf(`### ${source.key}\n`),end=signal.indexOf('\n### ',start+1),section=signal.slice(start,end<0?signal.length:end).split('\n## Level')[0].trim();
        if(start<0||hash(section)!==source.source_hash)throw fail('house_errata_card_source_hash_changed');
      }else throw fail('house_errata_source_kind');
    }
  }
  return data.entries;
}
export function nativeHouseErratum(id,version=1){
  return typeof id==='string'&&Number.isSafeInteger(version)&&version>0?compileNativeHouseErrata().find(e=>e.id===id&&e.version===version)||null:null;
}
/** GM-private diagnosis, never an execution capability or a replacement for player choice. */
export function nativeFeatureReviewContract(key){
  if(typeof key!=='string')return null;
  const entry=compileNativeHouseErrata().filter(e=>e.sources.some(s=>s.kind==='feature'&&s.key===key)).sort((a,b)=>b.version-a.version)[0];
  if(!entry)return null;
  return freeze({version:1,erratum:entry.id,erratum_version:entry.version,erratum_hash:hash(entry),feature:key,
    requirements:entry.interpretation,missing:entry.interpretation.missing||entry.limitations?.join(' ')||'Native adapter for this exact operation.',
    native_authority_granted:false,effect_status:'not_executed',
    recovery:'Implement and qualify the missing source/owner/rules adapter, then obtain a fresh native adjudication. No PC choice, dice, consent, cost or terminal outcome is inferred.'});
}
