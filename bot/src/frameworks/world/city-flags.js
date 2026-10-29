import {cityObject,cityAudit} from './city-calendar.js';
/** Preserve the original flag policy with an explicit catalog input. */
export function createCityFlagService(EXPANSION_FEATURES){
const CITY_FEATURE_FLAGS=Object.freeze(["institutions","opportunities","economy","minor_npcs","adaptive_context","conversations","pacing","negotiations","voice_direction","authoring",
    "autonomous_pvp_fear",
    "pvp_private_ui",
    "gm_discretion",
    "scoped_disclosure_recovery","scene_descriptions","post_projection_answers","playable_narration",
    "narrative_authority","narrative_memory","narrative_camera","narrative_encounters","narrative_salience","narrative_completeness",
    ...Object.keys(EXPANSION_FEATURES)]);
function configureCityFlags(db,guildId,input,actorId){
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
return Object.freeze({CITY_FEATURE_FLAGS,configureCityFlags});
}
