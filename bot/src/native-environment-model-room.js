/** Source-qualified forecast prompt; fiction is GM-authored and Hope remains player-owned. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:aster-vale-predictive-lab:model-room';
const RULE='**Model Room — Action:** Reveal a forecast that is frighteningly accurate but incomplete. The PC may take a Hope by accepting that one listed risk is real and immediately relevant.';

export function projectNativeEnvironmentModelRoomContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_model_room_context'
    ||contract?.handler!=='environment_model_room_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM forecast prompt; forecast remains fiction, the PC decides whether to accept the risk and take Hope, and context alone changes no resource.'}];
}

export function nativeEnvironmentModelRoomSituation(db,guild,scope,location){
  return projectNativeEnvironmentModelRoomContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
