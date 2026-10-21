/** Source-qualified GM fiction prompt; the PC response remains player-owned. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:pale-court-townhouse:private-room';
const RULE='**Private Room — Action:** An NPC offers a confidential conversation that grants leverage but separates the PC from allies or exits.';

export function projectNativeEnvironmentPrivateRoomContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_private_room_context'
    ||contract?.handler!=='environment_private_room_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM fiction prompt; narration remains GM-authored, the PC response remains player-owned, and context alone records no acceptance or consequence.'}];
}

export function nativeEnvironmentPrivateRoomSituation(db,guild,scope,location){
  return projectNativeEnvironmentPrivateRoomContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
