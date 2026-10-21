/** Source-bound shrine reaction cue; hostility and restitution remain GM-authored fiction. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:storm-drain-shrine:wrong-offering';
const RULE='**Wrong Offering — Reaction:** When someone desecrates or carelessly removes an offering, the environment becomes hostile until restitution is made.';

export function projectNativeEnvironmentWrongOfferingContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_wrong_offering_context'
    ||contract?.handler!=='environment_wrong_offering_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact source-bound shrine reaction cue; the GM authors any hostile response and restitution. Context records no PC action or consequence.'}];
}

export function nativeEnvironmentWrongOfferingSituation(db,guild,scope,location){
  return projectNativeEnvironmentWrongOfferingContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
