/** Owner-established private arcs and zero-write discovery. Identity comes from the interaction, never caller-supplied scope or aliases. */
import { cityObject, cityKey, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { motivationKey } from "./simulation-motivation.js";
import { PermissionError, StateConflictError, UserInputError } from "./errors.js";
import { stateRevision } from "./ai-intents.js";
import { handoutPlayerView } from "./handout.js";
import { organizationInbox } from "./owned-community.js";
import { evidenceView } from "./evidence-custody.js";
import { evidenceType, activeEvidence } from "./epistemic.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { scopedQueryPlan, queryScopedFacts } from "./scoped-query.js";
export function personalCharacter(db,guild,userId,characterId){
  const session=db.getActiveSession(guild),assignment=session?db.activeAssignment(session.id,userId):null;
  const id=characterId||assignment?.character_id,character=id?db.getCharacter(id):null;
  if(!character||character.guild_id!==guild||character.owner_user_id!==userId||assignment?.character_id!==id||!["active","reserve","guest"].includes(character.status))
    throw new PermissionError("An active owned character assignment is required; proxies do not gain private continuity.");
  const present=db.roster(session.id).some(row=>row.character_id===id&&["present","late","guest"].includes(row.presence));
  if(!present) throw new PermissionError("Personal continuity requires attendance.");
  return character;
}
export function personalArc(db,guild,userId,input){
  cityObject(input);if(db.getCityCalendar(guild).flags.personal_arcs!==true) throw new StateConflictError("Personal arcs are opt-in.");
  const character=personalCharacter(db,guild,userId,input.character_id),rawKey=cityKey(input.key),
    key=rawKey.startsWith(`${character.id}:`)?rawKey:`${character.id}:${rawKey}`,op=input.op||"state";
  if(["confirm","reject","defer"].includes(op)){
    const candidate=db.getCityRecord(guild,"arc_candidate",key);
    if(!candidate||candidate.subject_key!==character.id||candidate.status!=="pending"||stateRevision(candidate)!==input.expected_revision
      ||db.getSimulationClock(guild).minute>=candidate.data.expires_minute) throw new StateConflictError("Current owned candidate and revision required.");
    requireCitySource(db,guild,candidate.source_event);
    return db.transaction(()=>{
      const arc=op==="confirm"?personalArc(db,guild,userId,{key:input.arc_key||input.key,type:candidate.data.type,statement:candidate.data.statement}):null;
      const after=db.saveCityRecord(guild,{...candidate,key,status:{confirm:"confirmed",reject:"rejected",defer:"deferred"}[op],
        data:{...candidate.data,responded_by:userId,arc_key:arc?.record_key||null}});
      cityAudit(db,guild,"arc_candidate_response",key,candidate,after,userId);return after;
    });
  }
  if(op==="respond"){
    const beat=db.getCityRecord(guild,"arc_beat",key);
    if(!beat||beat.subject_key!==character.id||!["accept","decline","defer"].includes(input.decision)) throw new UserInputError("Your own proposed beat and explicit decision required.");
    if(beat.status!=="pending") return beat;
    if(beat.data.arc_revision!==undefined&&(db.getCityRecord(guild,"arc",beat.data.arc_key)?.data.revision!==beat.data.arc_revision
      ||db.getSimulationClock(guild).minute>=beat.data.expires_minute||input.expected_revision!==stateRevision(beat)))
      throw new StateConflictError("Invitation expired or changed; refresh your private continuity inbox.");
    requireCitySource(db,guild,beat.source_event);
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{...beat,key,status:{accept:"accepted",decline:"declined",defer:"deferred"}[input.decision],data:{...beat.data,response_by:userId}});
      cityAudit(db,guild,"arc_response",key,beat,after,userId);return after;
    });
  }
  if(op!=="state"||!["dilemma","stake","relationship","vow","choice","desire"].includes(input.type)
    ||typeof input.statement!=="string"||!input.statement.trim()||input.statement.length>1500)
    throw new UserInputError("A bounded player-stated arc type and statement required; no inferred PC feelings.");
  const before=db.getCityRecord(guild,"arc",key),revision=(before?.data.revision||0)+1;
  if(before?.data.statement===input.statement&&before.data.type===input.type) return before;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`arc:${motivationKey([key,revision,input.statement])}`,source_kind:"gm",source_id:`player:${userId}`,
      title:"Owner-established personal statement",kind:"player_statement",visibility:"character",subject_key:character.id,
      details:{authority:"player_established_not_world_truth"}},userId);
    const after=db.saveCityRecord(guild,{kind:"arc",key,visibility:"character",subject_key:character.id,source_event:source.event_key,
      data:{type:input.type,statement:input.statement,established_by:userId,revision,authority:"player_stated",
        history:[...(before?.data.history||[]),...(before?[{revision:before.data.revision,statement:before.data.statement,source_event:before.source_event}]:[])].slice(-20)}});
    cityAudit(db,guild,"arc_established",key,before,after,userId);return after;
  });
}
export function proposeArcBeat(db,guild,input,actorId){
  cityObject(input);if(db.getCityCalendar(guild).flags.personal_arcs!==true) throw new StateConflictError("Personal arcs are opt-in.");
  const character=db.getCharacter(input.character_id);
  if(!character||character.guild_id!==guild) throw new PermissionError("Campaign character required.");
  personalCharacter(db,guild,character.owner_user_id,character.id);
  const arc=db.getCityRecord(guild,"arc",`${character.id}:${cityKey(input.arc_key)}`);
  if(!arc||arc.subject_key!==character.id) throw new StateConflictError("A player-established arc is required.");
  requireCitySource(db,guild,input.source_event);
  if(typeof input.invitation!=="string"||!input.invitation.trim()||input.invitation.length>1000) throw new UserInputError("Bounded nonbinding invitation required.");
  const key=`${character.id}:${cityKey(input.key)}`,prior=db.getCityRecord(guild,"arc_beat",key);if(prior) return prior;
  if(db.characterContinuity(guild,character.id,{kind:"arc_beat"}).some(row=>row.data.arc_key===arc.record_key
    &&db.getSimulationClock(guild).minute-row.minute<1440)) throw new StateConflictError("Callback cooldown preserves decline/defer and prevents repeated invitations.");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"arc_beat",key,status:"pending",visibility:"character",subject_key:character.id,source_event:input.source_event,
      data:{arc_key:arc.record_key,arc_revision:arc.data.revision,expires_minute:db.getSimulationClock(guild).minute+1440,
        invitation:input.invitation,authority:"GM_opportunity_not_PC_choice",nonbinding:true,costs:[],proposed_by:actorId}});
    cityAudit(db,guild,"arc_invitation",key,null,after,actorId);return after;
  });
}
export function captureArcCandidate(db,guild,user,characterId,messageId,message){
  if(db.getCityCalendar(guild).flags.personal_arcs!==true||!characterId||!messageId) return null;
  if(typeof message!=="string"||message.length>4000) return null;
  const match=/\bI (vow|swear|want|wish|choose|promise)\b[^\n.!?]{1,1400}[.!?]?/i.exec(message);if(!match) return null;
  const character=personalCharacter(db,guild,user,characterId),key=`${character.id}:candidate-${motivationKey(messageId)}`;
  const prior=db.getCityRecord(guild,"arc_candidate",key);if(prior) return prior;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`owner-message:${motivationKey([guild,messageId])}`,title:"Explicit owner statement candidate",
      kind:"player_statement_candidate",source_id:`player:${user}`,visibility:"character",subject_key:character.id,
      details:{statement:match[0],character_id:character.id,owner_user_id:user,not_consent:true}},user);
    const row=db.saveCityRecord(guild,{kind:"arc_candidate",key,status:"pending",source_event:source.event_key,visibility:"character",subject_key:character.id,
      data:{statement:match[0],type:["vow","swear","promise"].includes(match[1].toLowerCase())?"vow":"desire",created_by:user,
        expires_minute:db.getSimulationClock(guild).minute+1440,authority:"unconfirmed_owner_quote_not_belief_or_consent"}});
    cityAudit(db,guild,"arc_candidate",key,null,row,user);return row;
  });
}
export function personalInbox(db,guild,user){
  const character=personalCharacter(db,guild,user);
  return ["arc_candidate","arc_beat","project_draft","consent_reply"].flatMap(kind=>db.characterContinuity(guild,character.id,{kind})
    .map(row=>({...row,expected_revision:stateRevision(row)})));
}
export function discoverPersonal(db,guild,userId,input={}){
  cityObject(input);if(db.getCityCalendar(guild).flags.discovery!==true) throw new StateConflictError("Discovery lookup is opt-in.");
  const principal=conversationPrincipal(db,guild,userId,input.character_id),character={id:principal.character_id},query=input.query||"",mode=input.mode||"know";
  if(typeof query!=="string"||query.length>300||!["know","leads","changed","witness","arcs","evidence","commitments","organizations","case"].includes(mode)) throw new UserInputError("Bounded literal query and discovery mode required.");
  if(input.since_minute!==undefined) cityInteger(input.since_minute,0,1000000000);
  if(principal.kind!=="owner"&&["arcs","commitments","organizations","evidence","case"].includes(mode))throw new PermissionError("Owner-only personal workflows are not proxy authority.");
  const query_plan=scopedQueryPlan(db,guild,userId,character.id,query,{contextId:principal.context_id,owner:principal.kind==="owner"});
  const found=queryScopedFacts(db,guild,userId,character.id,query_plan);
  const facts=["evidence","commitments","organizations"].includes(mode)?[]:found.rows
    .filter(row=>mode!=="leads"||["clue","lead"].includes(row.category)).map(row=>({id:row.id,key:row.fact_key,content:row.content,
      category:row.category,epistemic:evidenceType(row),evidence_active:activeEvidence(db,guild,row.id),
      confidence:row.confidence,source:row.source,last_recorded:row.created_at,authority:"recorded_knowledge_not_global_truth"}));
  const queries=query_plan.terms.length?query_plan.terms:[""];
  const unique=(rows,key)=>[...new Map(rows.map(row=>[row[key],row])).values()];
  const events=mode==="changed"?unique(queries.flatMap(term=>db.listWorldEvents(guild,{characterId:principal.context_id,userId,query:term,limit:50})),"event_key").slice(0,50)
    .filter(row=>row.status==="active"&&row.minute>(input.since_minute??-1)).map(row=>({source:row.event_key,title:row.title,minute:row.minute,truth_status:row.truth_status})):[];
  const personal=mode==="arcs"?["arc","arc_beat"].flatMap(kind=>db.characterContinuity(guild,character.id,{kind,query}).map(row=>({key:row.record_key,
    kind,status:row.status,source:row.source_event,data:row.data}))):[];
  const evidence=["evidence","case"].includes(mode)?unique(queries.flatMap(term=>db.listHandoutsFor(guild,userId,{characterId:character.id,query:term,limit:30})),"id").slice(0,30).map(handoutPlayerView):[];
  const case_view=mode==="case"?{
    evidence:evidence.map(row=>({...row,custody:evidenceView(db,guild,row.id,userId).history})),
    hypotheses:facts.filter(row=>row.epistemic.kind==="hypothesis"),
    claims:facts.filter(row=>row.epistemic.kind!=="hypothesis").map(row=>({...row,label:`${row.epistemic.kind}; recorded claim, not automatic global truth`})),
    limits:"Scoped query expansion within authorized records before limits; alias/similarity is not identity and unknown is not disproven. No sealed holdings, hidden solution, private NPC beliefs or other PCs' findings. Creative inquiry needs separate adjudication."}:null;
  const organizations=mode==="organizations"?organizationInbox(db,guild,userId,query).communities:[];
  const commitments=mode==="commitments"?[
    ...db.characterContinuity(guild,character.id,{kind:"arc",query}).filter(row=>row.status==="active"&&row.data.type==="vow"&&row.data.established_by===userId)
      .map(row=>({key:row.record_key,text:row.data.statement,status:"owner-stated vow; not an adjudicated binding contract"})),
    ...db.characterContinuity(guild,character.id,{kind:"organization_request",query}).filter(row=>["consented","approved"].includes(row.status)&&row.data.confirmed_by===userId)
      .map(row=>({key:row.record_key,text:`${row.data.title}: ${row.data.terms}`,status:`${row.status} initiative; no automatic spending or binding`})),
    ...db.acceptedProjectContinuity(guild,character.id,userId,query).map(row=>({key:row.record_key,text:`${row.title}: ${row.phase}`,status:`${row.status}; explicitly accepted current project phase`}))]:[];
  return {character_id:character.id,mode,query,query_plan,omissions:[...query_plan.omissions,...(found.omitted?[{reason:"fact_result_limit",count:found.omitted}]:[])],facts,events,personal,evidence,organizations,commitments,case_view,
    unknown:![facts,events,personal,evidence,organizations,commitments].some(rows=>rows.length),
    authority:"Read-only scoped recorded knowledge; query aliases are not established identities. Unknown is not disproven; no new discoveries."};
}
