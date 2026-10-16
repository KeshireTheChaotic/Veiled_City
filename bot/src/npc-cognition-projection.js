/** Purpose-limited actor evidence. Never promotes an arbitrary GM source/path to public evidence. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {conversationPrincipal} from './conversation-principal.js';
import {indexWorldEvent} from './city-calendar.js';
import {createHash} from 'node:crypto';

/** Only the trusted native importer calls this, never model output. The nonsecret
 * dossier `knows` field permits attributed actor testimony, not objective canon. */
export function recordImportedNpcKnowledge(db,guild,npc,key,content){
  const payload={version:1,npc,key,content,belief:'known',secret:false,disclosure:'nonsecret_actor_testimony'};
  const event=indexWorldEvent(db,guild,{key:`npc-import:${hash(payload)}`,kind:'native_npc_knowledge_import',
    title:'Native nonsecret actor-knowledge import',source_id:'native:npc-cognition-seed',visibility:'gm',
    details:{payload,payload_hash:hash(payload)}},'native:npc-cognition-seed');
  return event.event_key;
}
function heardEvidence(db,guild,npc,row,scope,event){
  const d=event.details,pc=db.getCharacter(d.character_id),typed=db.getCityRecord(guild,'typed_intent',d.typed_intent),t=typed?.data,
    input=t&&db.getWorldEvent(guild,typed.source_event);
  if(event.kind!=='authored_speech'||event.source_id!==`player:${d.author}`||!d.listeners?.includes(npc)
    ||!pc||pc.guild_id!==guild||pc.owner_user_id!==d.author||row.subject_key!==pc.id
    ||row.source_type!=='heard'||row.content!==`${pc.name} said: “${d.quote}” (claim unverified; not consent or binding terms)`
    ||typed?.status!=='accepted_for_adjudication'||t.type!=='speak'||t.actor!==pc.id||t.owner_user_id!==d.author
    ||t.target_key!==npc||t.utterance!==d.quote||typed.source_event!==d.input_source||input?.status!=='active'
    ||typeof input.details.raw_text!=='string'||input.details.raw_hash!==t.source_hash
    ||createHash('sha256').update(input.details.raw_text).digest('hex')!==t.source_hash
    ||input.details.raw_text?.slice(t.start,t.end)!==t.source_span||!db.ownerAuthoredSource(guild,input.event_key,d.author)
    ||!narrativeSourceVisible(db,guild,input.event_key,scope)
    ||d.private_scene&&(scope.mode!=='private'||scope.actorUserId!==d.author||scope.actorCharacterId!==pc.id))return false;
  let p;try{p=conversationPrincipal(db,guild,d.author,pc.id);}catch{return false;}
  return p.kind==='owner'&&p.revision===t.actor_principal_revision&&d.principal_revision===p.revision;
}
export function actorEvidenceVisible(db,guild,npc,row,scope){
  if(!row||row.is_secret||row.belief_state==='unknown'||!row.source_ref)return false;
  const event=db.getWorldEvent(guild,row.source_ref);
  if(event?.status!=='active')return false;
  if(event.kind==='authored_speech')return heardEvidence(db,guild,npc,row,scope,event);
  if(event.kind==='native_npc_knowledge_import'){
    const p=event.details.payload;
    return event.source_id==='native:npc-cognition-seed'&&event.details.payload_hash===hash(p)
      &&p?.version===1&&p.npc===npc&&p.key===row.knowledge_key&&p.content===row.content
      &&p.belief===row.belief_state&&p.secret===false&&p.disclosure==='nonsecret_actor_testimony';
  }
  // Avoid recursive actor-proof promotion. Recalled speech needs its original
  // native hearing/import proof, not another actor-relative output certificate.
  if(event.kind==='native_narrative_unit'&&event.details.actor_evidence_refs?.length)return false;
  return narrativeSourceVisible(db,guild,row.source_ref,scope);
}
/** Speech may cite an actor's actual evidence; other unit kinds retain generic closure. */
export function actorReferenceVisible(db,guild,npc,ref,scope){
  return db.listNpcKnowledge(guild,npc,{limit:200}).some(k=>k.source_ref===ref&&k.belief_state==='known'&&actorEvidenceVisible(db,guild,npc,k,scope))
    ||db.listNpcMemories(guild,npc,{status:'active',limit:200}).some(m=>m.source_ref===ref&&actorEvidenceVisible(db,guild,npc,m,scope));
}
