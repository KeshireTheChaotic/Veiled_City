/** Native source-qualified passive token opportunities. No PC roll, cognition or disclosure is inferred. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {createFeatureTokenRules} from './feature-token-rules.js';

const EXPECTED='adversary:aster-vale-forecast-engine:expected-value';
export function createFeatureOpportunityRules({capabilities}){
  const {compileNativeFeatures,nativeHouseErratum,nativeEncounterActor,nativeActorControl,currentScene,indexWorldEvent,captureAdvantageGain,inspectAdvantageGain}=capabilities||{};
  if([compileNativeFeatures,nativeHouseErratum,nativeEncounterActor,nativeActorControl,currentScene,indexWorldEvent,captureAdvantageGain,inspectAdvantageGain].some(fn=>typeof fn!=='function'))
    throw new TypeError('Complete native opportunity capabilities required.');

  function sourceRule(){
    const feature=compileNativeFeatures().find(f=>f.feature_key===EXPECTED),rule=nativeHouseErratum('HR15',1),
      source=rule?.sources?.find(s=>s.kind==='feature'&&s.key===EXPECTED);
    if(feature?.status!=='supported'||feature.native_handler!=='native_token_gain'||rule?.status!=='supported'
      ||rule.native_handler!=='native_token_gain'||rule.authority_ref!=='owner:expected-value-once-per-scene:v1'
      ||source?.source_hash!==feature.source_hash||source.template_hash!==feature.template_hash
      ||rule.interpretation.scope!=='once_per_engine_actor_per_scene_total'||rule.interpretation.per_pc!==false
      ||rule.interpretation.gain!==1||rule.interpretation.cap!==3)throw fail('feature_opportunity_source_not_qualified');
    return {feature,rule};
  }
  function enabled(db,guild){return db.getCityCalendar(guild).flags.gm_discretion===true
    &&db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='autonomous';}

  function authorize(db,guild,input,{historical=false}={}){
    const {feature,rule}=sourceRule();
    if(input.feature!==EXPECTED)throw fail('feature_opportunity_not_supported');
    const cause=inspectAdvantageGain(db,guild,input.cause,{historical});
    if(!cause||cause.advantage!==true||!cause.eligible_actors?.includes(input.actor))throw fail('feature_opportunity_native_advantage_required');
    if(!historical){
      if(!enabled(db,guild))throw fail('feature_opportunity_autonomy_disabled');
      const actor=nativeEncounterActor(db,guild,input.actor),control=nativeActorControl(db,guild,'npc',input.actor),scene=currentScene(db,guild);
      if(control.owner_control_type!=='ai_world'||actor.scene!==cause.scene||actor.session!==cause.session
        ||scene.key!==cause.scene||scene.session_id!==cause.session||actor.presence.location_key!==cause.location
        ||hash(actor.template)!==feature.template_hash)throw fail('feature_opportunity_current_actor');
    }
    return {actor:input.actor,feature:EXPECTED,pool:'Forecast',feature_hash:hash(feature),source_hash:feature.source_hash,template_hash:feature.template_hash,
      scene:cause.scene,session:cause.session,location:cause.location,cause:input.cause,occurrence:cause.scene,operation:'gain',amount:rule.interpretation.gain,cap:rule.interpretation.cap};
  }
  const tokens=createFeatureTokenRules({authorize,inspectCause:inspectAdvantageGain,indexWorldEvent});

  /** Independent optional failures are returned as local holds, never roll back the PC's valid request. */
  function captureAdvantageFeatureOpportunities(db,guild,requestRow){
    if(!enabled(db,guild))return [];
    // A review-only source is unavailable, not an implicit fiction-only success.
    try{sourceRule();}catch(error){if(error.code!=='GM_ARBITRATION')throw error;return [];}
    let request,cause;
    try{request=captureAdvantageGain(db,guild,requestRow);if(!request)return [];cause=inspectAdvantageGain(db,guild,request);}
    catch(error){if(!['GM_ARBITRATION','STATE_CONFLICT','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;
      return [{status:'held',feature:EXPECTED,reason:error.message}];}
    if(!cause?.advantage)return [];
    return cause.eligible_actors.map(actor=>{
      try{
        const plan=tokens.preflightFeatureToken(db,guild,{feature:EXPECTED,actor,cause:request});
        return plan.status==='already_committed'?tokens.inspectFeatureTokenReceipt(db,guild,plan.receipt):tokens.commitFeatureToken(db,guild,plan.token);
      }catch(error){
        if(!['GM_ARBITRATION','STATE_CONFLICT','PC_NATIVE_ELIGIBILITY'].includes(error.code))throw error;
        return {status:'held',feature:EXPECTED,actor,reason:error.message};
      }
    });
  }
  return Object.freeze({captureAdvantageFeatureOpportunities,inspectFeatureTokenReceipt:tokens.inspectFeatureTokenReceipt});
}
