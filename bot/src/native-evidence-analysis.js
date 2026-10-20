/** Native reading of an already visible, owner-held original. No custody, facts, disclosure or inferred conclusions. */
import {principalAllows} from './application-authority.js';
import {ordinaryActionProof,ordinaryPrerequisite,effectHash} from './ordinary-effect-proof.js';

const fields=['version','accepted_intent_ref','prerequisite_ref','handout_id','source_event','expected_revision','excerpt_start','excerpt_end'];
const authority='Source-bound reading of an existing document claim; not verification, guilt, canon, custody or knowledge disclosure.';
function fail(reason){throw Object.assign(new Error(`Evidence analysis held: ${reason}`),{code:'NATIVE_EVIDENCE_ANALYSIS',reason,expected:true});}
function proposalShape(p){
  if(!p||Object.keys(p).sort().join(',')!==fields.slice().sort().join(',')||p.version!==1
    ||['accepted_intent_ref','prerequisite_ref','handout_id','source_event','expected_revision'].some(k=>typeof p[k]!=='string'||!p[k]||p[k].length>200)
    ||!Number.isSafeInteger(p.excerpt_start)||!Number.isSafeInteger(p.excerpt_end)||p.excerpt_start<0
    ||p.excerpt_end<=p.excerpt_start||p.excerpt_end-p.excerpt_start>600)fail('CLOSED_SOURCE_EXCERPT_REQUIRED');
}
function visible(row,scope,handout=false){
  if(['party','public'].includes(row?.visibility))return true;
  return scope.mode==='private'&&(row?.visibility==='character'&&(handout?row.subject_character_id:row.subject_key)===scope.actorCharacterId
    ||row?.visibility==='player'&&(handout?row.subject_user_id:row.subject_key)===scope.actorUserId);
}
/** Entitled proposal material only; pending actions still require a later native prerequisite. */
export function routineEvidenceContext(db,guild,accepted,scope){
  const proof=ordinaryActionProof(db,guild,accepted.record_key,scope),row=db.getHandout(accepted.data.target_key),e=row?.metadata?.evidence;
  if(row?.guild_id!==guild||row.status!=='active'||!visible(row,scope,true)||typeof row.content!=='string'||!row.content.length
    ||!e?.original||e.pending||e.original.holder!==`character:${proof.pc.id}`)return null;
  const last=(e.history||[]).filter(h=>h.copy==='original').at(-1),source=last&&db.getWorldEvent(guild,last.source_event);
  if(source?.status!=='active'||!visible(source,scope))return null;
  return {handout_id:row.id,title:row.title,source_event:source.event_key,expected_revision:effectHash(e),
    excerpt_start:0,excerpt_end:Math.min(600,row.content.length),document_claim_excerpt:row.content.slice(0,600),
    authority:'Existing entitled document claim only; pending native result, custody provenance and output audience are revalidated before any receipt.'};
}
function inspect(db,guild,p,scope){
  proposalShape(p);
  const flags=db.getCityCalendar(guild).flags;
  if(flags.evidence_custody!==true||flags.gm_discretion!==true||db.isDirectorPaused(guild)
    ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')fail('NATIVE_EVIDENCE_SERVICE_UNAVAILABLE');
  const proof=ordinaryActionProof(db,guild,p.accepted_intent_ref,scope),a=proof.row;
  const pre=ordinaryPrerequisite(db,guild,p,proof);
  if(!['observe','search','interact'].includes(a.data.type)||a.data.target_key!==p.handout_id
    ||!['resolved_no_roll','success'].includes(pre.receipt.data.outcome))fail('EXACT_OWNER_TARGET_AND_NATIVE_RESULT_REQUIRED');
  const row=db.getHandout(p.handout_id),e=row?.metadata?.evidence;
  if(row?.guild_id!==guild||row.status!=='active'||!visible(row,scope,true)||typeof row.content!=='string'
    ||p.excerpt_end>row.content.length)fail('VISIBLE_EXISTING_DOCUMENT_REQUIRED');
  // This bounded adapter reads the original only. Copies and contested/closed physical states require their own adapters.
  if(!e?.original||e.pending||e.original.holder!==`character:${proof.pc.id}`
    ||!['collected','held','analyzed','transferred'].includes(e.original.state))fail('CURRENT_OWNER_HELD_ORIGINAL_REQUIRED');
  if(effectHash(e)!==p.expected_revision)fail('EVIDENCE_REVISION_CHANGED');
  const history=Array.isArray(e.history)?e.history.filter(h=>h.copy==='original'):[],last=history.at(-1);
  const source=db.getWorldEvent(guild,p.source_event);
  if(source?.status!=='active')fail('CURRENT_VISIBLE_CUSTODY_SOURCE_REQUIRED');
  const s=source.details?.evidence;
  const custody=last&&db.getCityRecord(guild,'evidence_receipt',`${row.id}:${last.key}`);
  if(!last||last.source_event!==source.event_key||last.holder!==e.original.holder
    ||custody?.source_event!==source.event_key||custody.data.handout_id!==row.id||custody.data.operation!==last.op
    ||s?.handout_id!==row.id||(s.copy||'original')!=='original'||!visible(source,scope))fail('CURRENT_VISIBLE_CUSTODY_SOURCE_REQUIRED');
  const visibility=scope.mode==='private'||a.visibility==='character'||!['party','public'].includes(row.visibility)
    ||!['party','public'].includes(source.visibility)?'character':'party';
  const terms={version:1,proposal:structuredClone(p),owner:proof.principal.user,actor:proof.pc.id,
    principal_revision:proof.principal.revision,scene:proof.scene.key,session:proof.scene.session_id,
    location:proof.pc.data.location,source:a.source_event,source_hash:effectHash(proof.source),world_hash:effectHash(proof.world||null),
    prerequisite:pre.receipt.record_key,prerequisite_hash:effectHash(pre.receipt),handout_hash:effectHash(row),
    evidence_source:source.event_key,evidence_source_hash:effectHash(source),custody_receipt_hash:effectHash(custody),visibility,
    subject:visibility==='character'?proof.pc.id:null,origin_scope:structuredClone(proof.scope),
    excerpt:row.content.slice(p.excerpt_start,p.excerpt_end),authority};
  return {proof,terms};
}
const receiptKey=(guild,p)=>`evidence-analysis:${effectHash([guild,p.accepted_intent_ref,p.prerequisite_ref,p.handout_id])}`;

/** Only the authenticated application adapter can execute; serialized model roles/principals do not qualify. */
export function applyRoutineEvidenceAnalysis(db,guild,proposal,scope,{principal}={}){
  if(!principalAllows(principal,guild,'evidence.analyze'))fail('APPLICATION_AUTHORITY_REQUIRED');
  return db.transaction(()=>{
    const {terms}=inspect(db,guild,proposal,scope),key=receiptKey(guild,proposal);
    const prior=db.getCityRecord(guild,'evidence_analysis',key);
    if(prior){
      if(effectHash(prior.data)!==effectHash(terms))fail('IMMUTABLE_ANALYSIS_TERMS_CHANGED');
      verifyRoutineEvidenceAnalysis(db,guild,key,scope);return prior;
    }
    return db.saveCityRecord(guild,{kind:'evidence_analysis',key,status:'resolved',visibility:terms.visibility,
      subject_key:terms.subject,source_event:terms.source,data:terms});
  });
}

/** Shared current-use, saved receipt and output reader: revalidates source/owner/scene/audience after restart. */
export function verifyRoutineEvidenceAnalysis(db,guild,ref,scope){
  const row=db.getCityRecord(guild,'evidence_analysis',ref),d=row?.data;
  if(row?.status!=='resolved'||d?.version!==1||ref!==receiptKey(guild,d.proposal)
    ||row.source_event!==d.source||row.visibility!==d.visibility||(row.subject_key||null)!==d.subject
    ||d.owner!==scope?.actorUserId||d.actor!==scope?.actorCharacterId
    ||d.visibility==='character'&&scope?.mode!=='private')fail('SAVED_ANALYSIS_AUDIENCE_REQUIRED');
  // Replay uses the ORIGINAL scope, so a party receipt does not silently acquire a new private ancestry.
  const {terms}=inspect(db,guild,d.proposal,d.origin_scope);
  if(effectHash(terms)!==effectHash(d))fail('SAVED_ANALYSIS_ANCESTRY_CHANGED');
  return {text:`Existing document claim (unverified): ${d.excerpt}`,authority:d.authority,
    visibility:row.visibility,subject:row.subject_key||null,receipt:ref,revision:effectHash(row)};
}
