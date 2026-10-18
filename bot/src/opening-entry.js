/** Native entry delivery uses the existing certified output and outbox; it never calls a planner or publishes shared prose. */
import {inspectOpeningEntryOpportunity} from './session-opening-attendance.js';
import {openingEntryProjection} from './opening-entry-context.js';
import {prepareOpeningEntryOutput} from './pvp-output.js';
import {queueTurnPublications} from './publication-outbox.js';
import {deliverQueuedTurn} from './publishing.js';
import {inspectSessionOpening} from './session-opening.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
function save(db,guild,key,row,status,data){
  return db.saveCityRecord(guild,{kind:'opening_entry_delivery',key,status,visibility:'gm',actor_key:row.data.character,
    source_event:row.source_event,data});
}
function acknowledged(db,guild,record){
  if(!record?.data.turn_id)return false;
  const rows=db.listTurnPublications(guild,record.data.turn_id);return rows.length>0&&rows.every(p=>p.status==='delivered');
}
function priorAssembly(db,guild,opportunity,view){
  const d=opportunity.data,initial=db.getCityRecord(guild,'session_opening_job',d.session);
  if(!initial||!initial.data.origin.roster.some(r=>r.user===d.user&&r.character===d.character
    &&r.control_revision===db.activeAssignment(d.session,d.user)?.control_revision))return null;
  inspectSessionOpening(db,guild,d.session);
  const jobs=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1001});
  if(jobs.length>1000)throw Object.assign(new Error('Opening acknowledgement history needs scoped review.'),{code:'OPENING_ENTRY_HISTORY'});
  return jobs.find(r=>r.data.session===d.session&&r.data.scope?.mode==='private'&&r.data.scope.actorUserId===d.user
    &&r.data.scope.actorCharacterId===d.character&&hash(r.data.evidence?.hook_source_refs||[])===hash(view.source_refs)&&acknowledged(db,guild,r));
}
export async function deliverOpeningEntry({db,guild,key}){
  const opportunity=inspectOpeningEntryOpportunity(db,guild.id,key),d=opportunity.data,
    scope={mode:'private',actorUserId:d.user,actorCharacterId:d.character},view=openingEntryProjection(db,guild.id,key,scope),
    prior=db.getCityRecord(guild.id,'opening_entry_delivery',key);
  let job=prior;
  try{
    if(prior){
      if(prior.source_event!==opportunity.source_event||prior.visibility!=='gm'||prior.data.revision!==view.revision)
        return save(db,guild.id,key,opportunity,'needs_review',{...prior.data,hold_code:'OPENING_ENTRY_STALE'});
      if(prior.status==='retained_acknowledgement'||acknowledged(db,guild.id,prior))return prior;
    }else{
      const previous=db.listCityRecords(guild.id,{kind:'opening_entry_delivery',actor:d.character,includeGM:true,limit:101});
      if(previous.length>100)return save(db,guild.id,key,opportunity,'needs_review',{version:1,session:d.session,user:d.user,character:d.character,
        revision:view.revision,hold_code:'OPENING_ENTRY_HISTORY_REVIEW'});
      const retained=previous.find(r=>r.data.session===d.session&&r.data.user===d.user&&r.data.material_revision===view.material_revision&&acknowledged(db,guild.id,r))
        ||priorAssembly(db,guild.id,opportunity,view);
      if(retained)return save(db,guild.id,key,opportunity,'retained_acknowledgement',{version:1,session:d.session,user:d.user,character:d.character,
        revision:view.revision,material_revision:view.material_revision,turn_id:retained.data.turn_id,evidence:retained.data.evidence});
      job=db.transaction(()=>{
        const result=prepareOpeningEntryOutput(db,guild.id,key,scope),turn=db.beginTurnAttempt({guildId:guild.id,sessionId:d.session,
          messageId:`owner-entry:${key}`,actorPrincipal:d.user,audience:'private'});
        queueTurnPublications(db,{guild,session:db.getActiveSession(guild.id),result,scope,turnId:turn.turn_id});
        db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:key});
        return save(db,guild.id,key,opportunity,'pending',{version:1,session:d.session,user:d.user,character:d.character,
          revision:view.revision,material_revision:view.material_revision,turn_id:turn.turn_id,evidence:result.entry_evidence});
      });
    }
    if(!job?.data.turn_id)return job;
    const delivered=await deliverQueuedTurn({db,guild,turnId:job.data.turn_id}),rows=db.listTurnPublications(guild.id,job.data.turn_id),
      status=rows.some(p=>['uncertain','delivering'].includes(p.status))?'uncertain':delivered.pending.length?'pending':'delivered';
    return save(db,guild.id,key,opportunity,status,job.data);
  }catch(error){
    const code=/^[A-Z_]{2,60}$/.test(error.code||'')?error.code:'OPENING_ENTRY_REVIEW';
    return save(db,guild.id,key,opportunity,'needs_review',{...(job?.data||{version:1,session:d.session,user:d.user,character:d.character,revision:view.revision}),hold_code:code});
  }
}
