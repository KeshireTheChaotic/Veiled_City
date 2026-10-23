/** Existing native environment encounter eligibility. World/profile evidence alone is never an effect grant. */
export function environmentEncounterRejection({guild,ref,scene,location,actual,encounter,currentEncounter,binding,proposal,source,template}){
  if(!encounter||encounter.guild_id!==guild||encounter.session_id!==actual.session_id||encounter.status!=='active'
    ||currentEncounter?.id!==ref||actual.key!==scene||!location
    ||binding?.status!=='active'||proposal?.status!=='accepted'||proposal.data.encounter_id!==ref
    ||proposal.data.scene!==scene||proposal.location_key!==location||proposal.data.environment!==encounter.environment_name
    ||source?.status!=='active'||binding.source_event!==source.event_key||source.session_id!==actual.session_id||source.scene!==scene
    ||!proposal.data.reviewed_by||!template||Number(template.tier)!==Number(encounter.tier))
    return 'environment_native_encounter_location_source';
  return null;
}
