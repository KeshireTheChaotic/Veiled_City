/** Source-qualified passive procedure context; it cannot mint a credential or decide access. */
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {featureDisposition,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';

const FEATURE='environment:after-hours-emergency-department:hipaa-and-procedure';
export function projectNativeEnvironmentProcedureContext(capabilities){
  const exposed=capabilities?.features?.find(row=>row.key===FEATURE);
  if(!exposed)return [];
  const disposition=featureDisposition(FEATURE),feature=disposition.feature,
    contract=environmentProposalContract(feature),source=nativeFeatureRuleContext(FEATURE);
  if(disposition.status!=='supported'||feature.native_handler!=='environment_patient_procedure_context'
    ||contract?.entry!=='scene_context'||hash(feature)!==exposed.hash||source?.catalog_status!=='supported'
    ||source.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
    ||source.printed_rule!=='**HIPAA and Procedure — Passive:** Routine access to patient information requires appropriate credentials, consent, or a credible workaround.')return [];
  return [{receipt_kind:'native_environment_feature_context',receipt_ref:capabilities.instance,source_ref:feature.source_ref,
    text:source.printed_rule,authority:'Exact passive source context only; no credential, consent, workaround or access outcome is created.'}];
}
export function nativeEnvironmentProcedureSituation(db,guild,scope,location){
  return projectNativeEnvironmentProcedureContext(nativeEnvironmentInstanceForScope(db,guild,scope,location));
}
