/** Civic domain validation and institutional knowledge firewall. All descriptors are non-player simulation, never mechanical modifiers. */
import {cityObject,cityAudit} from './frameworks/world/public.js';
import { EXPANSION_FEATURES } from "./expansion-contracts.js";








export const CITY_FEATURE_FLAGS=Object.freeze(["institutions","opportunities","economy","minor_npcs","adaptive_context","conversations","pacing","negotiations","voice_direction","authoring",
    "autonomous_pvp_fear",
    "pvp_private_ui",
    "gm_discretion",
    "scoped_disclosure_recovery","scene_descriptions","post_projection_answers","playable_narration",
    "narrative_authority","narrative_memory","narrative_camera","narrative_encounters","narrative_salience","narrative_completeness",
    ...Object.keys(EXPANSION_FEATURES)]);
export function configureCityFlags(db,guildId,input,actorId){
  cityObject(input);
  if(Object.keys(input).some(key=>!CITY_FEATURE_FLAGS.includes(key)||typeof input[key]!=="boolean")) throw new Error("Unknown city feature flag.");
  return db.transaction(()=>{
    const before=db.getCityCalendar(guildId),flags={...before.flags,...input};
    const subordinate=['narrative_memory','narrative_camera','narrative_encounters','narrative_salience','narrative_completeness'];
    if(input.playable_narration===false)flags.narrative_authority=false;
    if(flags.narrative_authority===false)for(const key of subordinate)flags[key]=false;
    if(input.narrative_memory===false)flags.narrative_salience=false;
    if(flags.narrative_authority&&(!flags.playable_narration||!flags.scene_continuity)
      ||subordinate.some(key=>flags[key]&&!flags.narrative_authority)||flags.narrative_salience&&!flags.narrative_memory)
      throw new Error('Narrative flags require authority + playable narration + scene continuity; salience also requires narrative memory.');
    const after=db.setCityCalendar(guildId,{...before,flags});
    cityAudit(db,guildId,"city_flags",guildId,before,after,actorId);return after;
  });
}
/** Deterministic bounded Institution Director: validated queued intent, no new per-actor LLM calls. */
export {establishCommitment} from './frameworks/world/public.js';
export function cityContext(...args){return worldCityContext(...args);}
export function proposeCityOpportunity(...args){return worldProposeCityOpportunity(...args);}

export {INSTITUTION_ACTIONS,requireCitySource,cityStrings,requireCityRecord} from './frameworks/world/public.js';
import {cityContext as worldCityContext,proposeCityOpportunity as worldProposeCityOpportunity} from './frameworks/world/public.js';

export {updateCityCore,assignDistrictLocation,addWorldLink,inspectInstitutionAction,submitInstitutionAction,reviewInstitutionAction,executeInstitutionAction,runInstitutionDirector,fileInstitutionReport} from './frameworks/world/public.js';
