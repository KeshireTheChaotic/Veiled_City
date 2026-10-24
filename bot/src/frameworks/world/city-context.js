/** GM-private reference and provisional world proposals. No actor knowledge or canonical promotion. */
import {cityAudit} from './city-calendar.js';
export function cityContext(db,guildId,query){
  if(!String(query||"").trim()) return {records:[]};
  const terms=String(query).toLowerCase().match(/[a-z0-9-]{4,}/g)||[];
  const found=new Map();
  for(const term of terms.slice(0,6)) for(const row of db.listCityRecords(guildId,{query:term,includeGM:true,limit:4})) found.set(`${row.kind}:${row.record_key}`,row);
  const records=[];let budget=0;
  for(const row of found.values()){
    if(row.kind.startsWith("pvp_")||["character_visible_fact","character_perception_receipt","world_visible_fact","unsupported_action","gm_action_ruling","gm_action_review_receipt","owner_action_terminal"].includes(row.kind))continue;
    if(["action_continuation","action_continuation_signal","native_notice","roll_publication","roll_party_publication","publication_reconciliation","roll_share_preview","roll_menu_token","roll_option_registry","pvp_ui_token","pvp_ui_delivery"].includes(row.kind)
      ||row.kind==="compound_action"&&row.visibility==="character")continue;
    const temporal=row.kind==="weather"?{...row,temporal_state:db.getSimulationClock(guildId).minute<row.data.start?"forecast"
      :db.getSimulationClock(guildId).minute<row.data.end?"active":"past"}:row;
    const size=JSON.stringify(temporal).length;if(records.length>=8||budget+size>10000) break;records.push(temporal);budget+=size;
  }
  return {records,authority:"GM_PRIVATE_REFERENCE_NOT_ACTOR_KNOWLEDGE",chars:budget};
}
export function proposeCityOpportunity(db,guildId,query,actorId){
  if(!db.getCityCalendar(guildId).flags.opportunities) return {enabled:false};
  const relevant=cityContext(db,guildId,query).records.filter(row=>row.status==="active"&&row.kind!=="cycle");
  if(relevant.length<2) return {enabled:true,proposals:[]};
  const sources=[...new Set(relevant.map(row=>row.source_event))].sort();
  const key=`opportunity:${sources.join(":").slice(0,130)}`;
  const prior=db.getCityRecord(guildId,"opportunity",key);if(prior) return prior;
  return db.transaction(()=>{
    const after=db.saveCityRecord(guildId,{kind:"opportunity",key,source_event:sources[0],status:"proposed",data:{sources,
      records:relevant.map(row=>({kind:row.kind,key:row.record_key})),options:["Investigate the conjunction","Negotiate with involved actors","Repair or mitigate the established condition"],
      authority:"proposal_only",does_not_define_culprit:true}});
    cityAudit(db,guildId,"city_opportunity",key,null,after,actorId);return after;
  });
}
