/** Bounded ordinary follow-through via existing native adapters. Proposals cannot mint receipts or GM approval. */
import {validOrdinaryEffect} from './frameworks/daggerheart/public.js';
import {ordinaryActionProof,ordinaryPrerequisite,effectObservation,effectTarget,effectVisibility,effectHash,effectKey,effectFail,verifyOrdinaryEffect} from './ordinary-effect-proof.js';
import {dispatchAiIntents} from './ai-intents.js';
import {validateIntent} from './ai-intent-contracts.js';
import {activeCityProxy} from './city-constraints.js';
import {worldInputKey} from './autonomous-world.js';
import {conversationPrincipal} from './conversation-principal.js';
import {applicationPrincipal} from './application-authority.js';
import {applyRoutineEvidenceAnalysis,verifyRoutineEvidenceAnalysis,routineEvidenceContext} from './native-evidence-analysis.js';
import {clearNativeConditionFromOutcome} from './native-condition-recovery.js';
import {activeNativeConditions} from './native-group-features.js';
import {clearNativeEnvironmentNoise} from './native-environment-noise.js';
import {resolveNativeEnvironmentEvent,environmentResolutionText} from './native-environment-recovery.js';

function route(db,guild,p,payload,proof,scope){
  if(p.adapter==='observation'&&p.effect_class==='observation')return;
  if(p.adapter==='evidence_excerpt'&&p.effect_class==='evidence')return;
  if(p.adapter==='condition_clear'&&p.effect_class==='special')return;
  if(p.adapter==='environment_quiet'&&p.effect_class==='environment')return;
  if(p.adapter==='environment_resolve'&&p.effect_class==='environment')return;
  const i=payload.intent,v=i?.payload,loc=proof.pc.data.location;
  if(p.adapter!=='delegated'||!validateIntent(i))effectFail('UNSUPPORTED_NATIVE_ADAPTER');
  const sources=[v.source_event,...i.source_prerequisites].map(ref=>db.getWorldEvent(guild,ref)),s=sources[0];
  if(!sources.every(s=>s&&s.status==='active'&&s.source_kind==='gm'&&!s.source_id?.startsWith('player:')
    &&!['authored_turn','ai_gm_input','player_declaration','roll_adjudication'].includes(s.kind)
    &&['observed','established'].includes(s.truth_status)&&s.session_id===proof.scene.session_id&&s.scene===proof.scene.key
    &&s.location_key===loc&&(['party','public'].includes(s.visibility)||scope.mode==='private'&&s.visibility==='character'&&s.subject_key===proof.pc.id)))
    effectFail('NATIVE_EFFECT_EVIDENCE_REQUIRED');
  if(i.feature==='goal'&&p.effect_class==='npc_intent'&&v.actor_type==='npc'&&['propose','reprioritize','pause','resume'].includes(v.op)){
    if(db.getCharacter(v.actor_key)||activeCityProxy(db,guild,v.actor_key)
      ||db.getSimulationEntity(guild,'npc',v.actor_key)?.state.location_key!==loc)effectFail('LOCAL_NATIVE_NPC_AUTHORITY_REQUIRED');
  }else if(i.feature==='scene'&&['environment','access','position','scene_state'].includes(p.effect_class)&&v.op==='record'
    &&['hazard','barrier','entrance'].includes(v.entity_type)&&v.location_key===loc){
    if(s.details.entity_key!==v.entity_key)effectFail('EXACT_SCENE_EFFECT_SOURCE_REQUIRED');
    const {source_event,op,...material}=v;
    if(effectHash(s.details.scene_effect)!==effectHash(material))effectFail('EXACT_SCENE_EFFECT_FIELDS_REQUIRED');
    if(!['party','gm','character'].includes(v.visibility)||v.visibility==='character'&&v.subject_key!==proof.pc.id)effectFail('SCENE_EFFECT_AUDIENCE_REQUIRED');
  }else if(i.feature==='consequence'&&['environment','scene_state'].includes(p.effect_class)&&v.op==='apply'&&v.handler==='service'){
    const c=db.getCityRecord(guild,'consequence',i.target_key);
    if(!c||c.source_event!==s.event_key||c.data.handler!=='service'||c.data.entity_key!==v.entity_key
      ||v.delta!==c.data.payload.delta||v.delta===0||v.location_key!==loc)effectFail('EXACT_CAUSAL_EFFECT_REQUIRED');
  }else effectFail('DEDICATED_NATIVE_ADAPTER_REQUIRED');
}
function review(db,guild,key,p,proof,reason){
  const prior=db.getCityRecord(guild,'unsupported_action',key);
  if(prior&&prior.status!=='needs_review')return prior;
  const d=proof.row.data;
  return db.saveCityRecord(guild,{kind:'unsupported_action',key,status:'needs_review',visibility:'gm',source_event:proof.row.source_event,
    data:{version:1,effect_proposal:p,action:proof.row.record_key,owner:d.owner_user_id,actor:d.actor,scene:d.scene,session:d.session_id,
      source_hash:d.source_hash,principal_revision:d.actor_principal_revision,ruling:null,category:'native_adapter_absence',reason_code:reason,
      private_scene:proof.scope.mode==='private',origin_scope:proof.scope,
      alternative:'The original outcome is saved. Revise unsupported follow-through or request scoped native revalidation; no effect was substituted.',
      authority:'Effect review only. No action, dice, cost, consent, ability or outcome authority.'}});
}
export function applyOrdinaryEffects(db,guild,proposals,scope,{typedIntents=[],budget={operations:0,cost:0},provenance={}}={}){
  if(!Array.isArray(proposals)||proposals.length>4)effectFail('BOUNDED_PROPOSALS_REQUIRED');
  return proposals.map(raw=>{
    let proof,p=raw,key;
    try{
      if(typeof raw?.accepted_intent_ref!=='string'||raw.accepted_intent_ref.length>4000)effectFail('CLOSED_SOURCE_LOCATOR_REQUIRED');
      const actual=db.getCityRecord(guild,'typed_intent',raw?.accepted_intent_ref)
        ||typedIntents.filter(a=>a.data.source_span===raw?.accepted_intent_ref).filter((_,i,all)=>all.length===1)[0];
      proof=ordinaryActionProof(db,guild,actual?.record_key,scope);
      p={...raw,accepted_intent_ref:actual.record_key};key=effectKey(p,proof.scope);
      const done=db.getCityRecord(guild,'ordinary_effect_receipt',key);
      if(done){verifyOrdinaryEffect(db,guild,key,{...scope,mode:done.visibility==='character'?'private':scope.mode});return done;}
      const held=db.getCityRecord(guild,'unsupported_action',key);
      if(held&&held.status!=='needs_review')return held;
      if(!validOrdinaryEffect(p))effectFail('CLOSED_PROPOSAL_REQUIRED');
      if(db.getCityCalendar(guild).flags.gm_discretion!==true||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')effectFail('GM_DISCRETION_UNAVAILABLE');
      const payload=JSON.parse(p.payload_json);
      if(!payload||Object.keys(payload).sort().join(',')!==(p.adapter==='observation'?'query,when':p.adapter==='evidence_excerpt'?'evidence,when':p.adapter==='condition_clear'?'condition,when':['environment_quiet','environment_resolve'].includes(p.adapter)?'environment,when':'intent,when'))effectFail('CLOSED_NATIVE_PAYLOAD_REQUIRED');
      route(db,guild,p,payload,proof,scope);
      const pre=ordinaryPrerequisite(db,guild,p,proof),r=pre.receipt;
      if(payload.when==='no_roll'?r.data.outcome!=='resolved_no_roll':payload.when==='success'?r.data.outcome!=='success'
        :payload.when==='failure_fear'?r.data.outcome!=='failure'||r.data.duality!=='Fear':true)effectFail('EXACT_RESULT_PRECONDITION_REQUIRED');
      const privateResult=['condition_clear','environment_quiet','environment_resolve'].includes(p.adapter)||scope.mode==='private'||r.visibility==='character',effectiveScope={...scope,mode:privateResult?'private':scope.mode};
      return db.transaction(()=>{
        let result,text,native=null,evidenceResult=null;
        if(p.adapter==='observation'){
          result=effectObservation(db,guild,payload.query,proof,effectiveScope);text=result.text;
        }else if(p.adapter==='evidence_excerpt'){
          if(!payload.evidence||Object.keys(payload.evidence).sort().join(',')!=='excerpt_end,excerpt_start,expected_revision,handout_id,source_event')effectFail('CLOSED_EVIDENCE_EXCERPT_REQUIRED');
          native=applyRoutineEvidenceAnalysis(db,guild,{...payload.evidence,version:1,accepted_intent_ref:proof.row.record_key,
            prerequisite_ref:r.record_key},effectiveScope,{principal:applicationPrincipal(guild,'evidence.analyze','ordinary-evidence-excerpt')});
          evidenceResult=verifyRoutineEvidenceAnalysis(db,guild,native.record_key,effectiveScope);
          result={hash:effectHash(evidenceResult)};text=evidenceResult.text;
        }else if(p.adapter==='condition_clear'){
          if(!payload.condition||Object.keys(payload.condition).join()!=='condition'
            ||!['no_roll','success'].includes(payload.when))effectFail('CLOSED_NATIVE_CONDITION_CLEAR_REQUIRED');
          native=clearNativeConditionFromOutcome(db,guild,{...payload.condition,accepted_intent:proof.row.record_key,
            prerequisite:r.record_key},effectiveScope);
          result={hash:effectHash(native)};text='Your source-verified Vulnerable condition has ended. No resources or other conditions changed.';
        }else if(p.adapter==='environment_quiet'){
          if(!payload.environment||Object.keys(payload.environment).join()!=='environment'||!['no_roll','success'].includes(payload.when))effectFail('CLOSED_ENVIRONMENT_RECOVERY_REQUIRED');
          native=clearNativeEnvironmentNoise(db,guild,{...payload.environment,accepted_intent:proof.row.record_key,prerequisite:r.record_key},proof.scope);
          result={hash:effectHash(native)};text='The source-verified environmental noise has been quieted. No character resources changed.';
        }else if(p.adapter==='environment_resolve'){
          if(!payload.environment||Object.keys(payload.environment).join()!=='effect'||!['no_roll','success'].includes(payload.when))effectFail('CLOSED_ENVIRONMENT_RESOLUTION_REQUIRED');
          native=resolveNativeEnvironmentEvent(db,guild,{...payload.environment,accepted_intent:proof.row.record_key,prerequisite:r.record_key},proof.scope);
          result={hash:effectHash(native)};text=environmentResolutionText();
        }else{
          const ordinaryEffect={key,proposal:p,scope:proof.scope,source_hash:effectHash(proof.source),world_hash:effectHash(proof.world||null),prerequisite_hash:effectHash(r)};
          const nativeResults=dispatchAiIntents(db,guild,[payload.intent],{scope:effectiveScope,sessionId:proof.scene.session_id,origin:key,budget,ordinaryEffect});
          native=nativeResults[0];
          if(native.status!=='accepted')return review(db,guild,key,p,proof,'NATIVE_DELEGATION_OR_ADAPTER_REVIEW_REQUIRED');
          const target=effectTarget(db,guild,payload.intent);
          if(!target)effectFail('NATIVE_EFFECT_TARGET_REQUIRED');
          result={hash:effectHash(target)};
          text=`Native world consequence: ${JSON.stringify({adapter:payload.intent.feature,operation:payload.intent.payload.op,
            target:payload.intent.target_key,status:'applied'})}.`;
        }
        const visibility=evidenceResult?.visibility||effectVisibility(db,guild,p,payload,proof.scope,r);
        const row=db.saveCityRecord(guild,{kind:'ordinary_effect_receipt',key,status:'applied',source_event:proof.row.source_event,
          visibility,subject_key:visibility==='character'?proof.pc.id:null,
          data:{version:1,origin_scope:proof.scope,action:proof.row.record_key,source:proof.row.source_event,source_hash:effectHash(proof.source),world_hash:effectHash(proof.world||null),
            owner:proof.principal.user,actor:proof.pc.id,principal_revision:proof.principal.revision,scene:proof.scene.key,session:proof.scene.session_id,
            prerequisite:r.record_key,prerequisite_hash:effectHash(r),proposal:p,payload,result_hash:result.hash,text,
            native_ref:native?.record_key||null,native_hash:native?effectHash(native):null,
            native_evidence_hash:native&&p.adapter==='delegated'?effectHash([native.source_event,...payload.intent.source_prerequisites].map(ref=>db.getWorldEvent(guild,ref))):null,
            authority:'Separate native follow-through; original dice and costs unchanged.'}});
        if(held)db.saveCityRecord(guild,{...held,key,status:'resolved',data:{...held.data,effect_receipt:row.record_key}});
        verifyOrdinaryEffect(db,guild,key,effectiveScope);return row;
      });
    }catch(error){
      if(error.code!=='ORDINARY_EFFECT'&&error.code!=='SCENE_ACTION_WINDOW'&&error.code!=='TYPED_ROLL_PROOF'&&error.code!=='NATIVE_EVIDENCE_ANALYSIS'
        &&!(['condition_clear','environment_quiet','environment_resolve'].includes(p?.adapter)&&['GM_ARBITRATION','PC_NATIVE_ELIGIBILITY','SCENE_FICTION'].includes(error.code))&&!(error instanceof SyntaxError))throw error;
      if(proof)return review(db,guild,key||effectKey(p,proof.scope),p,proof,error.reason||error.code);
      // A foreign/stale requested action cannot create a review attributed to that owner.
      const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),source=db.getWorldEvent(guild,worldInputKey(provenance.messageId,scope.actorCharacterId));
      if(principal.kind!=='owner'||source?.status!=='active'||source.details.author!==principal.user||source.details.revision!==principal.revision)throw error;
      return db.saveCityRecord(guild,{kind:'ordinary_effect_diagnostic',key:`effect-diagnostic:${effectHash([source.event_key,raw])}`,
        status:'needs_review',visibility:'gm',source_event:source.event_key,data:{version:1,reason:'CURRENT_SOURCE_AUTHORITY_REQUIRED',authority:'Diagnostic only; no effect applied.'}});
    }
  });
}
/** Owner-scoped locators only. No private result or other character's declaration is disclosed. */
export function ordinaryEffectContext(db,guild,scope){
  if(!scope.actorCharacterId||!db.getActiveSession(guild))return [];
  let clearable=[];
  try{clearable=activeNativeConditions(db,guild,scope.actorCharacterId)
    .filter(c=>c.data.feature==='adversary:aster-vale-contractor:flashbang'&&c.data.expiry==='until_cleared'
      &&c.data.owner===scope.actorUserId).map(c=>({ref:c.record_key,condition:c.data.condition,
      source:c.source_event,authority:'Owner source and native successful clear_condition outcome required; not permission from this locator.'}));
  }catch(error){if(error.code!=='GM_ARBITRATION'&&error.code!=='PC_EFFECT_AUTHORITY')throw error;}
  const candidates=db.ownedTypedActionLocators(guild,scope.actorCharacterId,scope.actorUserId);
  return candidates
    .flatMap(a=>{try{ordinaryActionProof(db,guild,a.record_key,scope);return [{action:a.record_key,source_excerpt:a.data.source_span.slice(0,120),
      excerpt_truncated:a.data.source_span.length>120,source_ref:a.source_event,
      prerequisite:a.data.outcome_receipt||'',status:a.status,evidence:routineEvidenceContext(db,guild,a,scope),
      clearable_conditions:clearable}];}catch(error){if(error.code==='ORDINARY_EFFECT'||error.code==='SCENE_ACTION_WINDOW')return [];throw error;}});
}
