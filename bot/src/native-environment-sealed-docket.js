/** Source-qualified docket prompt; actual document and access choice remain fictional/player-owned. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:archive-beneath-the-courthouse:sealed-docket';
const RULE='**Sealed Docket — Action:** Reveal a document that changes the legal or supernatural interpretation of a current conflict. Accessing it requires sacrificing time, secrecy, or a favor.';

export function projectNativeEnvironmentSealedDocketContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_sealed_docket_context'
    ||contract?.handler!=='environment_sealed_docket_context'||contract?.entry!=='scene_context'
    ||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash||source.printed_rule!==RULE)return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Source-bound GM docket prompt; the document and interpretation remain GM-authored, the PC owns their response, and context alone records no document or cost agreement.'}];
}

export function nativeEnvironmentSealedDocketSituation(db,guild,scope,location){
  return projectNativeEnvironmentSealedDocketContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
