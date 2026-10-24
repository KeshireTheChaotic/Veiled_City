/** Existing native proposal qualification; world profile establishment remains an explicit source capability. */
export function createEnvironmentProfileProposalRules({capabilities}){
const {inspectArbitrationOrigin,buildNarrativeContext,establishNativeEnvironmentInstance,compileNativeActors,executableNativeFeatures,hash,fail}=capabilities||{};
if([inspectArbitrationOrigin,buildNarrativeContext,establishNativeEnvironmentInstance,compileNativeActors,executableNativeFeatures,hash,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native environment proposal capabilities required');
function applyNativeEnvironmentProfileProposals(db,guild,origin,proposals){
  if(!Array.isArray(proposals)||proposals.length>1)throw fail('environment_profile_proposal_budget');
  const o=inspectArbitrationOrigin(db,guild,origin);
  return proposals.map(proposal=>{
    if(!proposal||Object.keys(proposal).sort().join()!=='environment,location,version'||proposal.version!==1
      ||typeof proposal.environment!=='string'||proposal.environment.length>200||typeof proposal.location!=='string'||proposal.location.length>160)
      throw fail('environment_closed_profile_proposal');
    const key=`environment-profile-review:${hash([o.binding.source,o.scope,proposal])}`,
      prior=db.getCityRecord(guild,'native_environment_profile_review',key);
    if(prior)return prior; // Never silently promote a held old proposal after later support/policy changes.
    try{
      const template=compileNativeActors().find(a=>a.actor_kind==='environment'&&a.actor_key===proposal.environment);
      if(!template||!executableNativeFeatures('environment').some(f=>f.template_hash===template.template_hash))
        throw fail('environment_profile_has_no_supported_native_features');
      if(proposal.location!==o.binding.location)throw fail('environment_profile_current_location_required');
      const frame=buildNarrativeContext(db,guild,o.scope,o.binding.source);
      return establishNativeEnvironmentInstance(db,guild,frame,proposal);
    }catch(error){
      if(!['GM_ARBITRATION','SCENE_FICTION'].includes(error.code))throw error;
      return db.saveCityRecord(guild,{kind:'native_environment_profile_review',key,status:'needs_review',
        source_event:o.binding.source,visibility:'gm',data:{version:1,proposal:structuredClone(proposal),scope:o.scope,
          scene:o.binding.scene,session:o.binding.session,reason:error.message,execution_authorized:false,
          recovery:'No feature or profile effect executed. Independent native actions remain available; use a new current source after explicit support or source reconciliation.'}});
    }
  });
}

return Object.freeze({applyNativeEnvironmentProfileProposals});
}
