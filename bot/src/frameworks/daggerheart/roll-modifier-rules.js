/** Native source-bound roll eligibility; never an owner choice, payment or die execution. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
export function createRollModifierRules({capabilities}){
const {inspectArbitrationOrigin,consentAction,historicalActionSource,gmRulingContext,nativeGmSceneContext,narrativeSourceVisible,indexWorldEvent,isPvpIntent,prepareEnvironmentNoiseOdds,prepareEnvironmentMemoryOdds,inspectEnvironmentNoiseOdds}=capabilities||{};
if([inspectArbitrationOrigin,consentAction,historicalActionSource,gmRulingContext,nativeGmSceneContext,narrativeSourceVisible,indexWorldEvent,isPvpIntent,prepareEnvironmentNoiseOdds,prepareEnvironmentMemoryOdds,inspectEnvironmentNoiseOdds].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native roll eligibility capabilities required.');
const issuer='native:ordinary-roll-modifier';
const declaration=a=>({intent:a.record_key,source:a.source_event,hash:a.data.source_hash,actor:a.data.actor,
  owner:a.data.owner_user_id,principal:a.data.actor_principal_revision,session:a.data.session_id,scene:a.data.scene,
  audience:a.visibility,subject:a.subject_key||null,operation:a.data.operation,type:a.data.type,framing:a.data.framing,
  target:a.data.target_key||'',dependencies:a.data.dependencies||[]});
function evidence(db,guild,scope){
  const native=nativeGmSceneContext(db,guild,scope),context=gmRulingContext(db,guild,scope);
  return {native:native?.ref||null,events:context.evidence.map(e=>db.getWorldEvent(guild,e.ref)).map(e=>({ref:e.event_key,hash:hash(e)}))};
}

/** Called from the sealed scene-board path only. The model's role, source IDs and claimed receipts are ignored. */
function prepareOrdinaryRollModifier(db,guild,origin,entry,p){
  if(!p.advantage&&!p.disadvantage)return [];
  const o=inspectArbitrationOrigin(db,guild,origin),a=consentAction(db,guild,entry.intent_ref).row;
  const environment=p.feature_ref=== 'environment:haunted-nightclub:too-loud-to-think'?prepareEnvironmentNoiseOdds(db,guild,origin,entry,p)
    :p.feature_ref==='environment:storm-drain-shrine:local-memory'?prepareEnvironmentMemoryOdds(db,guild,origin,entry,p):null;
  if(entry.actor.type!=='character'||a.data.actor!==entry.actor.key||isPvpIntent(db,guild,a)
    ||a.data.session_id!==o.binding.session||a.data.scene!==o.binding.scene||!narrativeSourceVisible(db,guild,a.source_event,o.scope)
    ||p.disposition!=='request_pc_action_roll'||p.stakes_kind!=='attempt_only'||p.feature_ref&&!environment||p.experience_ref
    ||p.advantage===p.disadvantage||!p.reason?.trim()||p.reason.length>600
    ||!p.rule_basis_refs.includes('srd:action-rolls')||a.data.coordination||a.data.framing!=='immediate')
    throw fail('ordinary_modifier_requires_exact_nonfeature_action');
  const scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:a.data.actor};
  const context=evidence(db,guild,scope);
  if(!context.native&&!context.events.length)throw fail('ordinary_modifier_context_unverified');
  const binding={version:1,issuer,declaration:declaration(a),origin:o.binding,context,trait:p.trait,roll_kind:'action',
    kind:p.advantage?'advantage':'disadvantage',amount:1,reason:p.reason,...(environment?{environment}:{})};
  const key=`ordinary-modifier:${hash(binding)}`;
  return db.transaction(()=>{
    const prior=db.getWorldEvent(guild,key);
    if(!prior){
      const mutation=db.recordMutation(guild,{sessionId:a.data.session_id,actorType:'ai_gm',actorId:issuer,
        sourceLayer:'native_roll_modifier',mutationType:'prepare_ordinary_modifier',entityKey:a.record_key,visibility:'gm',after:binding});
      indexWorldEvent(db,guild,{key,kind:'roll_adjudication',title:'Native ordinary contextual roll modifier',
        source_kind:'mutation',source_id:mutation.id,session_id:a.data.session_id,scene:a.data.scene,
        visibility:'gm',details:{issuer,binding,payload_hash:hash(binding),
          roll_modifier:{name:'Contextual GM ruling',trait:p.trait,roll_kind:'action',kind:binding.kind,amount:1,ruling_key:''}}},issuer);
    }
    inspectOrdinaryRollModifier(db,guild,{accepted_intent:a.record_key,trait:p.trait,kind:'action'},db.getCharacter(a.data.actor),db.getWorldEvent(guild,key));
    return [key];
  });
}

/** Shared current-use and saved-reader proof. Historical reads never create a new permission or reroll. */
function inspectOrdinaryRollModifier(db,guild,input,pc,event,{historical=false}={}){
  const b=event?.details?.binding,a=db.getCityRecord(guild,'typed_intent',input.accepted_intent);
  if(!b||!a)throw fail('ordinary_modifier_missing_native_binding');
  (historical?historicalActionSource:consentAction)(db,guild,a.record_key,{resolved:a.status==='resolved'});
  const m=db.getMutation(guild,event.source_id),mod=event.details.roll_modifier,origin=db.getWorldEvent(guild,b.origin?.source);
  if(event.status!=='active'||event.kind!=='roll_adjudication'||event.source_kind!=='mutation'
    ||event.visibility!=='gm'||event.subject_key!==null||pc.id!==a.data.actor
    ||event.session_id!==a.data.session_id||event.scene!==a.data.scene
    ||b.version!==1||b.issuer!==issuer||event.details.issuer!==issuer||event.details.payload_hash!==hash(b)
    ||event.event_key!==`ordinary-modifier:${hash(b)}`||hash(b.declaration)!==hash(declaration(a))
    ||m?.actor_type!=='ai_gm'||m.actor_id!==issuer||m.source_layer!=='native_roll_modifier'
    ||m.mutation_type!=='prepare_ordinary_modifier'||m.entity_key!==a.record_key||m.visibility!=='gm'
    ||m.session_id!==a.data.session_id||hash(JSON.parse(m.after_json))!==hash(b)
    ||origin?.status!=='active'||hash(origin.details)!==b.origin.source_hash
    ||b.trait!==input.trait||b.roll_kind!==input.kind||!['advantage','disadvantage'].includes(b.kind)||b.amount!==1
    ||hash(mod)!==hash({name:'Contextual GM ruling',trait:b.trait,roll_kind:b.roll_kind,kind:b.kind,amount:1,ruling_key:''}))
    throw fail('ordinary_modifier_native_ancestry_changed');
  for(const source of b.context.events){const e=db.getWorldEvent(guild,source.ref);if(e?.status!=='active'||hash(e)!==source.hash)throw fail('ordinary_modifier_evidence_changed');}
  if(b.environment){
    inspectEnvironmentNoiseOdds(db,guild,b.environment,a,{historical});
    if(b.kind!==b.environment.kind||b.reason!==b.environment.applicability_ruling)throw fail('environment_modifier_exact_ruling_required');
  }
  if(!historical){
    const scope={mode:a.visibility==='character'?'private':'party',actorUserId:a.data.owner_user_id,actorCharacterId:a.data.actor};
    if(!gmRulingContext(db,guild,scope).enabled||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual'
      ||hash(evidence(db,guild,scope))!==hash(b.context))throw fail('ordinary_modifier_current_context_changed');
  }
  return mod;
}

return Object.freeze({prepareOrdinaryRollModifier,inspectOrdinaryRollModifier});
}
