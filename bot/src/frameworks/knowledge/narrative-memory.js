/** Only complete acknowledged audience delivery grants narrative recall; establishment alone is GM-private. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {listNarrativeRecords} from './narrative-records.js';
export function createNarrativeMemory({narrativeSourceVisible,narrativeVisible,indexWorldEvent,rememberEntity,narrativeMemoryEpistemic,narrativeQueryRelevance,narrativeIdentityRelevance,BACKGROUND_WORLD_KINDS}){
function memoryInput(db,guild,row,source,visibility,subject){
  const u=row.data.unit,npc=u.subject_key&&db.getNpcProfile(guild,u.subject_key),place=u.location_key&&db.getSimulationEntity(guild,'location',u.location_key);
  const groups=[...new Map(u.source_refs.map(ref=>db.getWorldEvent(guild,ref.replace(/^event:/,'')))
    .filter(event=>event?.kind==='native_narrative_entity'&&event.source_id==='native:narrative-authority'&&BACKGROUND_WORLD_KINDS.includes(event.details.entity_type))
    .map(event=>db.getCityRecord(guild,'autonomous_entity',`${event.details.entity_type}:${event.details.entity_key}`)).filter(Boolean).map(r=>[r.record_key,r])).values()];
  if(groups.length===1){
    const identity=groups[0];return {version:2,world_identity_ref:identity.record_key,kind:identity.data.kind,name:identity.data.name,
      aliases:identity.data.aliases,parent_key:`world:${identity.record_key}`,source_event:source,visibility,subject_key:subject,
      summary:row.data.text.slice(0,600),epistemic:narrativeMemoryEpistemic(u)};
  }
  return {kind:npc?'npc':u.kind==='rumor'?'rumor':u.kind==='lead'?'clue':'detail',name:npc?.display_name||u.id,
    parent_key:`location:${u.location_key||row.data.binding.location||`camera-${row.data.binding.scene}`}`,aliases:[],source_event:source,
    visibility,subject_key:subject,summary:row.data.text.slice(0,600),epistemic:narrativeMemoryEpistemic(u)};
}
function retainPublishedLead(db,guild,job,unit){
  if(unit.data.unit.kind!=='lead')return null;
  const observation=indexWorldEvent(db,guild,{key:`narrative-lead-observation:${hash(unit.record_key)}`,
    kind:'observation',title:'Delivered narrative lead observation',source_id:'native:narrative-memory',
    session_id:unit.data.binding.session,scene:unit.data.binding.scene,location_key:unit.location_key||'',
    visibility:job.visibility,subject_key:job.subject_key,
    details:{observation:unit.data.text,unit:unit.record_key,payload_hash:hash(unit.data)}},'native:narrative-memory');
  const clue=db.addFact(guild,{category:'clue',key:`narrative-lead:${hash(unit.record_key)}`,content:unit.data.text,
    visibility:job.visibility,subjectCharacterId:job.data.character||null,sessionId:unit.data.binding.session,source:'ai_gm',
    provenance:{narrative_unit:unit.record_key,epistemic:{kind:'observation',source_refs:[observation.event_key],perspective:'audience'}}});
  const threadId=`narrative-lead:${hash(unit.record_key)}`;
  const thread=db.upsertThread(guild,{id:threadId,label:`Investigate: ${unit.data.text.slice(0,120)}`,status:'active',
    visibility:job.visibility,subjectUserId:job.visibility==='player'?job.data.user:null,
    subjectCharacterId:job.subject_key,notes:unit.data.text});
  return {clue,thread_id:threadId};
}
function retainPublishedNpcTestimony(db,guild,job,unit,ack){
  const u=unit.data.unit;if(u.kind!=='npc_speech'||unit.visibility!=='party'||!u.subject_key||!db.getNpcProfile(guild,u.subject_key))return null;
  const knowledgeKey=`narrative-speech:${hash(unit.record_key)}`;
  const payload={version:1,npc:u.subject_key,key:knowledgeKey,content:u.text,unit:unit.record_key,unit_source:unit.source_event,
    unit_hash:hash(unit.data),ack:ack.event_key,publications:job.data.publications};
  const proof=indexWorldEvent(db,guild,{key:`narrative-npc-testimony:${hash(unit.record_key)}`,kind:'native_npc_speech_testimony',
    title:'Delivered NPC speech retained as attributed self-testimony',source_id:'native:narrative-memory',visibility:'gm',
    session_id:unit.data.binding.session,scene:unit.data.binding.scene,
    details:{payload,payload_hash:hash(payload)}},'native:narrative-memory');
  return db.upsertNpcKnowledge(guild,{npcKey:u.subject_key,knowledgeKey,content:u.text,beliefState:'known',confidence:100,
    sourceType:'narrative_self_testimony',sourceRef:proof.event_key,isSecret:false});
}
function retainEstablishedNarrative(db,guild,row){
  if(!db.getCityCalendar(guild).flags.narrative_memory||row.data.unit.kind==='native_outcome_render')return;
  const key=`narrative-world-memory:${hash(row.record_key)}`;if(db.getCityRecord(guild,'narrative_world_memory',key))return;
  const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_narrative_memory',title:'GM-established fiction, not audience knowledge',
    source_id:'native:narrative-memory',visibility:'gm',session_id:row.data.binding.session,scene:row.data.binding.scene,
    details:{input_source:row.source_event,unit:row.record_key,disclosed:false}},'native:narrative-memory');
  const memory=rememberEntity(db,guild,memoryInput(db,guild,row,source.event_key,'gm',null));
  db.saveCityRecord(guild,{kind:'narrative_world_memory',key,status:'accepted_established',visibility:'gm',source_event:source.event_key,
    data:{version:1,unit:row.record_key,identity:memory.identity.record_key,revision:memory.revision.record_key,disclosed:false}});
}
/** Inside the authoritative outbox transaction; pending/uncertain chunks confer no knowledge. */
function queueNarrativeMemory(db,guild,rows){
  const memoryEnabled=db.getCityCalendar(guild).flags.narrative_memory;
  for(const row of rows){
    const proof=db.getCityRecord(guild,'pvp_output_publication',row.id);
    for(const partRef of proof?.data.parts||[]){
      const part=db.getCityRecord(guild,'pvp_output_part',partRef);if(part?.data.kind!=='gm_narrative_unit')continue;
      const unit=db.getCityRecord(guild,'narrative_unit',part.data.ref);
      if(!memoryEnabled&&!['lead','npc_speech'].includes(unit?.data?.unit?.kind))continue;
      const key=`narrative-delivery:${hash([unit.record_key,row.turn_id,row.visibility,row.target_user_id])}`,
        prior=db.getCityRecord(guild,'narrative_delivery',key);
      db.saveCityRecord(guild,{kind:'narrative_delivery',key,status:prior?.status||'queued_to_audience',source_event:unit.source_event,
        visibility:row.visibility,subject_key:row.target_character_id||null,data:{version:1,unit:unit.record_key,turn:row.turn_id,
          user:row.target_user_id||null,character:row.target_character_id||null,scope:unit.data.binding.scope,
          publications:[...new Set([...(prior?.data.publications||[]),row.id])],unit_hash:hash(unit.data)}});
    }
  }
}
/** Acknowledgment is idempotent and runs only after a real transport receipt or authenticated exact-message reconciliation. */
function acknowledgeNarrativeMemory(db,guild,publication){
  if(publication.status!=='delivered'||!publication.discord_message_id)return;
  const memoryEnabled=db.getCityCalendar(guild).flags.narrative_memory;
  for(const job of listNarrativeRecords(db,guild,'narrative_delivery').filter(r=>r.data.publications.includes(publication.id))){
    if(job.status==='acknowledged_to_audience')continue;
    const unit=db.getCityRecord(guild,'narrative_unit',job.data.unit),rows=job.data.publications.map(id=>db.getPublication(guild,id));
    if(!unit||hash(unit.data)!==job.data.unit_hash||!rows.length||rows.some(r=>r?.status!=='delivered'||!r.discord_message_id))continue;
    const source=indexWorldEvent(db,guild,{key:`${job.record_key}:ack`,kind:'native_narrative_disclosure',title:'Acknowledged narrative audience delivery',
      source_id:'native:narrative-memory',visibility:job.visibility,subject_key:job.subject_key,
      session_id:unit.data.binding.session,scene:unit.data.binding.scene,
      details:{input_source:unit.source_event,unit:unit.record_key,publications:rows.map(r=>({id:r.id,message:r.discord_message_id,channel:r.channel_id})),
        knowledge:unit.data.binding.viewpoint==='character'?'entitled narrative; no automatic NPC knowledge':'audience exposition, not PC witness'}},'native:narrative-memory');
    const memory=memoryEnabled&&unit.data.unit.kind!=='native_outcome_render'
      ?rememberEntity(db,guild,memoryInput(db,guild,unit,source.event_key,job.visibility,job.subject_key)):null;
    const lead=retainPublishedLead(db,guild,job,unit),testimony=retainPublishedNpcTestimony(db,guild,job,unit,source);
    db.saveCityRecord(guild,{...job,key:job.record_key,status:'acknowledged_to_audience',data:{...job.data,ack:source.event_key,
      identity:memory?.identity.record_key||null,revision:memory?.revision.record_key||null,
      ...(lead?{lead_thread:lead.thread_id,lead_clue:lead.clue}:{}),...(testimony?{npc_testimony:testimony.knowledge_key}:{})}});
  }
}
/** Historical read-side: validates disclosure/source, not current action eligibility or inferred PC/NPC knowledge. */
function disclosedNarrativeMemory(db,guild,scope,{location=null,limit=12,query='',preferLocation=null}={}){
  return selectDisclosedNarrativeMemory(db,guild,scope,{location,limit,query,preferLocation}).rows;
}
/** Selection diagnostics count only verified entitled units, never other audiences' private records. */
function selectDisclosedNarrativeMemory(db,guild,scope,{location=null,limit=12,query='',preferLocation=null}={}){
  const cap=Math.max(1,Math.min(40,limit));
  if(!db.getCityCalendar(guild).flags.narrative_memory)return {rows:[],selection:{eligible:0,selected:0,omitted:0,candidate_limit:cap}};
  const eligible=listNarrativeRecords(db,guild,'narrative_delivery').filter(job=>{
    if(job.status!=='acknowledged_to_audience')return false;
    if(!narrativeVisible(job,scope)||job.visibility==='character'&&(job.data.user!==scope.actorUserId||job.data.character!==scope.actorCharacterId||db.getCharacter(job.data.character)?.owner_user_id!==scope.actorUserId)
      ||!narrativeSourceVisible(db,guild,job.data.ack,scope))return false;
    const unit=db.getCityRecord(guild,'narrative_unit',job.data.unit);
    return unit?.status==='accepted_established'&&hash(unit.data)===job.data.unit_hash&&(!location||unit.location_key===location)
      &&job.data.publications.every(id=>{const p=db.getPublication(guild,id);return p?.status==='delivered'&&!!p.discord_message_id;});
  }).map(job=>{
    const unit=db.getCityRecord(guild,'narrative_unit',job.data.unit);
    return {unit:unit.record_key,source_ref:job.data.ack,text:unit.data.text,epistemic:unit.data.epistemic,location:unit.location_key,
      knowledge:unit.data.binding.viewpoint==='character'?'disclosed narrative, not NPC cognition':'camera exposition, not PC witness'};
  }).filter((row,i,all)=>all.findIndex(other=>other.unit===row.unit)===i);
    // Rank the bounded, already source/audience-verified scan BEFORE its output
    // cap. Stable ties preserve the historical most-recent ordering.
  const rows=eligible.map(row=>{
    const unit=db.getCityRecord(guild,'narrative_unit',row.unit)?.data.unit,
      entity=unit?.subject_key?`npc:${unit.subject_key}`:row.location?`location:${row.location}`:null;
    return {row,score:narrativeQueryRelevance(row.text,query)+narrativeIdentityRelevance(db,guild,entity,scope,query)
      +(preferLocation&&row.location===preferLocation?50:0)};
  }).sort((a,b)=>b.score-a.score).slice(0,cap).map(item=>item.row);
  return {rows,selection:{eligible:eligible.length,selected:rows.length,omitted:eligible.length-rows.length,candidate_limit:cap}};
}

return Object.freeze({retainEstablishedNarrative,queueNarrativeMemory,acknowledgeNarrativeMemory,disclosedNarrativeMemory,selectDisclosedNarrativeMemory});
}
