/** Source-bound Dead Platform reaction and failure cue for the entitled GM context. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:dead-platform:express-through-memory';
const RULE='**Express Through Memory — Action:** The PC makes a Knowledge Reaction Roll (14); on a failure, the next train opens onto a location associated with a painful memory rather than the intended stop.';

export function projectNativeEnvironmentExpressThroughMemoryContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_express_through_memory_context'
    ||contract?.handler!=='environment_express_through_memory_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound reaction and failure cue; the PC chooses their departure, declared destination and dice, while the GM authors any painful-memory location. Context commits no roll or consequence.'}];
}

export function nativeEnvironmentExpressThroughMemorySituation(db,guild,scope,location){
  return projectNativeEnvironmentExpressThroughMemoryContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
