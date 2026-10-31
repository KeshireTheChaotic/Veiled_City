/** Native interpretation of explicitly owner-authored errata; source files remain provider-owned. */
export function createNativeHouseErrata({data,signal,compileNativeFeatures,nativeFeatureRuleContext,hash,fail}){
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const handlers=Object.freeze({native_token_gain:Object.freeze([1]),many_deaths_fear_opportunity:Object.freeze([1]),local_mesh_allied_zone:Object.freeze([2]),intrusion_trace_owner_payment:Object.freeze([1])});

function compileNativeHouseErrata(){
  const features=compileNativeFeatures();
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
function nativeHouseErratum(id,version=1){
  return typeof id==='string'&&Number.isSafeInteger(version)&&version>0?compileNativeHouseErrata().find(e=>e.id===id&&e.version===version)||null:null;
}
/** GM-private diagnosis, never an execution capability or a replacement for player choice. */
function nativeFeatureReviewContract(key){
  if(typeof key!=='string')return null;
  const source=nativeFeatureRuleContext(key);if(!source)return null;
  const entry=compileNativeHouseErrata().filter(e=>e.sources.some(s=>s.kind==='feature'&&s.key===key)).sort((a,b)=>b.version-a.version)[0];
  if(!entry)return freeze({version:1,feature:key,source,
    missing:source.capability?.missing?.join('; ')||'Exact source-defined native trigger/effect/current-and-saved adapter is not implemented; printed text is not execution permission.',
    native_authority_granted:false,effect_status:'not_executed',
    recovery:'Hold only this feature; select another legal source-backed ability or ordinary GM action. Native receipts and owner controls are required before any promised effect; do not infer costs or substitute generic success.'});
  return freeze({version:1,erratum:entry.id,erratum_version:entry.version,erratum_hash:hash(entry),feature:key,
    source,
    requirements:entry.interpretation,missing:entry.interpretation.missing||entry.limitations?.join(' ')||source.capability?.missing?.join('; ')||'Native adapter for this exact operation.',
    native_authority_granted:false,effect_status:'not_executed',
    recovery:'Hold only this feature; select another legal source-backed ability or ordinary GM action. Qualify the missing source/owner/rules adapter before fresh native adjudication. No PC choice, dice, consent, cost or terminal outcome is inferred.'});
}

return Object.freeze({compileNativeHouseErrata,nativeHouseErratum,nativeFeatureReviewContract});
}
