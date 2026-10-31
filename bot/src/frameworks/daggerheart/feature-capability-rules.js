/** Honest source-local runtime capability reporting. This never authorizes execution or disclosure. */
import fs from 'node:fs';
import {featureOperationDescriptor} from './feature-operation-descriptors.js';
const holds=JSON.parse(fs.readFileSync(new URL('./native-feature-holds.json',import.meta.url),'utf8'));
if(holds.version!==1||new Set(holds.entries.map(e=>e.feature)).size!==holds.entries.length)throw new TypeError('Unique source-bound feature holds required.');
const result=(capability,operations,missing,limitation)=>Object.freeze({capability,operations:Object.freeze(operations),missing:Object.freeze(missing),
  limitation,execution_authorized:false,publication_authorized:false});
export function featureRuntimeCapability(feature){
  if(!feature)return result('held',[],['Unregistered exact source occurrence.'],'No source or effect authority.');
  if(feature.status==='supported'){
    if(feature.native_handler?.endsWith('_context'))return result('rule_context_only',[],[],feature.reason);
    const spec=featureOperationDescriptor(feature.feature_key);
    if(spec){
      if(spec.source_hash!==feature.source_hash||spec.template_hash!==feature.template_hash||spec.native_handler!==feature.native_handler)
        return result('held',[],['Shared operation source/template/handler identity changed.'],feature.reason);
      return result('native_bounded',[spec.operation.kind],[],feature.reason);
    }
    return result('native_bounded',[feature.native_handler==='native_token_gain'?'token_gain':'specialized_native_proof'],[],feature.reason);
  }
  const hold=holds.entries.find(row=>row.feature===feature.feature_key);
  if(!hold||hold.source_hash!==feature.source_hash||hold.template_hash!==feature.template_hash)
    return result('held',[],['Exact source operation/trigger contract is not qualified for this revision.'],feature.reason);
  return result(hold.fiction_only?'fiction_only':'held',[],[...hold.missing],
    hold.fiction_only?'GM-owned fictional interpretation only; the listed factual predicates and durable effects still need native proof.':feature.reason);
}
