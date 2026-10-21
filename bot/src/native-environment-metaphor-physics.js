/** Source-qualified passive invitation to player symbolism; no player action is authored. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:networked-dream:metaphor-is-physics';
export function projectNativeEnvironmentMetaphorPhysicsContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_metaphor_physics_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**Metaphor Is Physics — Passive:** Clever symbolic actions can substitute for literal tools if the player explains the connection.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive invitation only; the player owns their action and native adjudication owns its result.'}];
}
export function nativeEnvironmentMetaphorPhysicsSituation(db,guild,scope,location){
  return projectNativeEnvironmentMetaphorPhysicsContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
