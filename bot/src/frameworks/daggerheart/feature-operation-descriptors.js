/** Source-pinned declarative operations, beneath existing actor/trigger/owner/receipt gates. */
import fs from 'node:fs';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {nativeModifierPlan,nativeResourcePlan} from './feature-operation-plans.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const data=freeze(JSON.parse(fs.readFileSync(new URL('./native-feature-operations.json',import.meta.url),'utf8')));
if(data.version!==1||new Set(data.entries.map(e=>e.feature)).size!==data.entries.length)throw fail('feature_operation_registry_shape');
export function featureOperationDescriptor(key){return data.entries.find(entry=>entry.feature===key)||null;}
export function requireFeatureOperation(feature,kind){
  const spec=featureOperationDescriptor(feature?.feature_key);
  if(!spec||feature.status!=='supported'||spec.native_handler!==feature.native_handler||spec.source_hash!==feature.source_hash
    ||spec.template_hash!==feature.template_hash||spec.operation.kind!==kind)throw fail('feature_operation_source_changed');
  return spec.operation;
}
export function planFeatureModifier(feature,facts){
  const operation=requireFeatureOperation(feature,'modifier');return nativeModifierPlan(operation.operator,facts);
}
export function planFeatureRecovery(feature,balance,{eligible=true}={}){
  const operation=requireFeatureOperation(feature,'resource_recovery');
  if(operation.resource!=='npc_stress'||!Number.isSafeInteger(operation.amount)||operation.amount<0||typeof eligible!=='boolean')throw fail('feature_recovery_operation_shape');
  return nativeResourcePlan(balance,eligible?-Math.min(balance.current,operation.amount):0);
}
