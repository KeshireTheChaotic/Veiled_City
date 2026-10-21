/** Source-bound clue prompt; clue choice, roll and faction movement remain player/GM fiction. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:occult-crime-scene:three-vectors';
const RULE='**Three Vectors — Action:** Offer three clue vectors from physical, digital, witness, occult, financial, historical, relationship, or contradiction evidence. The PC chooses one to pursue; on Fear, another interested party moves on a different vector.';

export function projectNativeEnvironmentThreeVectorsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_three_vectors_context'
    ||contract?.handler!=='environment_three_vectors_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound clue prompt; the PC chooses a vector and the GM authors clues and any interested-party movement. Context records no clue, choice, roll or movement.'}];
}

export function nativeEnvironmentThreeVectorsSituation(db,guild,scope,location){
  return projectNativeEnvironmentThreeVectorsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
