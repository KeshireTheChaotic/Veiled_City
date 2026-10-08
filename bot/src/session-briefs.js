/** Read-only reconstructed brief views. Public text never inherits GM planning, private thoughts or raw event details. */
import { personalCharacter, personalInbox } from "./personal-continuity.js";
import { reconcileHistory } from "./history-reconciliation.js";
export function sessionBrief(db,guild,{mode="shared",user="",gm=false}={}){
  if(db.getCityCalendar(guild).flags.session_briefs!==true) throw new Error("Session briefs are opt-in.");
  if(!["shared","character","gm"].includes(mode)||mode==="gm"&&!gm) throw new Error("Authenticated GM preparation access required.");
  const pc=mode==="character"?personalCharacter(db,guild,user):null,scope=mode==="gm"?"gm":pc?"character":"party";
  const facts=db.contextFacts(guild,{scope,userId:pc?user:"",characterId:pc?.id||"",limit:30}).map(row=>
    ({id:row.id,key:row.fact_key,text:row.content,confidence:row.confidence,source:row.source,category:row.category,
      authority:row.category==="hypothesis"?"owner hypothesis; not proof":"recorded scoped assertion; confidence is not objective truth"}));
  const events=db.listWorldEvents(guild,{includeGM:mode==="gm",userId:pc?user:null,characterId:pc?.id||null,limit:30}).map(row=>
    ({source:row.event_key,title:row.title,status:row.status,truth_status:row.truth_status,minute:row.minute,
      authority:row.status==="active"?"scoped indexed event; details not disclosed":"historical source, not authority for new effects"}));
  const ended=db.latestEndedSession(guild),session=db.getActiveSession(guild);
  const packet={mode,visibility:mode==="gm"?"gm":pc?"character":"party",character_id:pc?.id||null,
    session_id:session?.id||ended?.id||null,read_only:true,fictional_minute:db.getSimulationClock(guild).minute,
    saved_recap:ended?.recap?{session_id:ended.id,text:ended.recap,authority:"previously saved player-safe recap, not a new ruling"}:null,
    facts,events,personal:pc?personalInbox(db,guild,user):[],
    limits:"Bounded persisted records only; omissions are not absence. No new facts, invented quotes, PC intentions, time advance, resources or provider requests."};
  if(mode==="gm") Object.assign(packet,{
    motives:db.listNpcProfiles(guild,{limit:12}).map(npc=>({npc:npc.npc_key,goals:db.listNpcGoals(guild,npc.npc_key,{status:"active",limit:3}),
      authority:"actor-owned motive, not guaranteed future action or global truth"})),
    reviews:["ai_intent","world_draft","strategy","organization_request"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:12})
      .filter(row=>["pending","draft","consented","blocked"].includes(row.status)).map(row=>({kind,key:row.record_key,status:row.status,source:row.source_event}))),
    upcoming:db.upcomingCitySchedules(guild,20).map(row=>({key:row.schedule_key,due_minute:row.due_minute,review_status:row.review_status,
      authority:"fictional schedule; not attendance, acceptance or executed consequence"})),
    continuity:reconcileHistory(db,guild)
  });
  packet.coverage={fact_limit:30,event_limit:30,possibly_truncated:facts.length===30||events.length===30,omitted_for_size:0};
  const arrays=[packet.personal,packet.motives||[],packet.reviews||[],packet.upcoming||[],packet.events,packet.facts];
  for(const rows of arrays) while(rows.length&&JSON.stringify(packet).length>32000){rows.pop();packet.coverage.omitted_for_size++;}
  if(packet.saved_recap?.text.length>8000){packet.saved_recap.text=packet.saved_recap.text.slice(0,8000);packet.saved_recap.truncated=true;}
  return packet;
}
export function formatSessionBrief(packet){
  return [`${packet.mode} brief — recorded continuity, not a new ruling.`,packet.saved_recap?.text||"No completed-session recap is saved.",
    ...packet.facts.slice(0,8).map(row=>`${row.text} (${row.category}; ${row.confidence}%; source ${row.source||row.id})`),
    ...packet.events.slice(0,5).map(row=>`${row.title} (${row.status}; source ${row.source})`),packet.limits].join("\n").slice(0,1900);
}
