/** Shared release feature contract and read-only GM diagnostics; absent flags are disabled and records never imply PC authority. */
import {EXPANSION_FEATURES} from './frameworks/narrative/public.js';
export {EXPANSION_FEATURES} from './frameworks/narrative/public.js';
export function expansionStatus(db,guild){
  const flags=db.getCityCalendar(guild).flags;
  return {visibility:"gm",schema_version:db.schemaVersion(),features:Object.entries(EXPANSION_FEATURES).map(([flag,contract])=>({flag,
    enabled:flags[flag]===true,default:false,...contract})),records:db.cityRecordCounts(guild),
    bounds:{director_actions:{round:1,scene:3,downtime:4},institution_actions:2,materialized_density_candidates:32,density_packets:4,
      density_packet_characters:12000,density_total_characters:24000,consequence_event_window:50,consequence_subscriptions:20},
    recovery:"Disabling flags stops new extension opportunities, not already queued native actions. Review/cancel queued actions; preserve evidence. Backup before upgrades; explicit snapshots restore state.",
    authority:"Recorded configuration/counts only, not proof of narrative quality or live deployment; no reads advance time."};
}
