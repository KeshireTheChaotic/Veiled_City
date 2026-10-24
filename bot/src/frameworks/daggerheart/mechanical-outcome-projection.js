/** Read-only native mechanical receipt projection for authoring and publication; never executes an effect. */
import {createHash} from 'node:crypto';
import {environmentOutcomeKinds} from './environment-output-rules.js';
import {noticeHash} from './native-notice-rules.js';
const mechanicalOutcomeKinds=Object.freeze([...environmentOutcomeKinds,'ordinary_effect_receipt','pvp_attack_roll_receipt','pvp_damage_roll_receipt','pc_effect_receipt','roll_request']);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fail(){throw Object.assign(new Error('Native output needs the exact committed outcome, current owner and audience.'),{code:'NARRATIVE_PVP'});}
export function createMechanicalOutcomeProjection({capabilities}){
const {currentScene,validatedPcEffectProjection,visibleIncomingInjury,renderNativeNotice,ordinaryEffectProjection,validatePvpAttackRoll,validatePvpDamageApplication,validatePvpDamageRoll,nativeEnvironmentOutput}=capabilities||{};
if([currentScene,validatedPcEffectProjection,visibleIncomingInjury,renderNativeNotice,ordinaryEffectProjection,validatePvpAttackRoll,validatePvpDamageApplication,validatePvpDamageRoll,nativeEnvironmentOutput].some(fn=>typeof fn!=='function'))throw new TypeError('Native mechanical output capabilities required');
function handlesOutcome(kind){return mechanicalOutcomeKinds.includes(kind);}
function projectMechanicalOutcome(db,guild,input,scope){
  if(!input||Object.keys(input).sort().join(',')!=='kind,receipt_kind,ref,version'||input.version!==4
    ||input.kind!=='native_outcome'||!mechanicalOutcomeKinds.includes(input.receipt_kind)||typeof input.ref!=='string'||!input.ref||input.ref.length>200)fail();
  if(environmentOutcomeKinds.includes(input.receipt_kind)){
    try{return nativeEnvironmentOutput(db,guild,input.receipt_kind,input.ref,scope);}catch(error){
      if(!['GM_ARBITRATION','SCENE_FICTION','STATE_CONFLICT'].includes(error.code))throw error;
      fail();
    }
  }
  if(input.receipt_kind==='ordinary_effect_receipt'){
    try{return ordinaryEffectProjection(db,guild,input.ref,scope);}catch(error){
      if(!['ORDINARY_EFFECT','SCENE_ACTION_WINDOW','TYPED_ROLL_PROOF'].includes(error.code))throw error;
      fail(); // Invalid read-side proposals are quarantined by the common composer, not treated as native outcomes.
    }
  }
  const row=db.getCityRecord(guild,input.receipt_kind,input.ref),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),scene=currentScene(db,guild);
  if(!row||!source||source.status!=='active')fail();
  let text;
  if(['pvp_attack_roll_receipt','pvp_damage_roll_receipt'].includes(input.receipt_kind)){
    const proof=input.receipt_kind==='pvp_attack_roll_receipt'?validatePvpAttackRoll(db,guild,input.ref):validatePvpDamageRoll(db,guild,input.ref);
    if(scope.mode!=='private'||scope.actorCharacterId!==proof.offer.actor||scope.actorUserId!==proof.offer.snapshot.actor_owner
      ||proof.offer.session!==scene.session_id||proof.offer.scene!==scene.key)fail();
    const result=proof.receipt.data.result;
    text=input.receipt_kind==='pvp_attack_roll_receipt'
      ?`Your saved native attack roll: ${result.total}, ${result.duality}; ${result.hit?'hit':'miss'}. No target response or HP change is implied.`
      :`Your saved native damage roll: ${result.total} ${result.type}. Target defenses and owner choices still govern any HP effect.`;
  }else if(input.receipt_kind==='pc_effect_receipt'){
    if(scope.mode!=='private'||scope.actorCharacterId!==row.subject_key
      ||db.getCharacter(row.subject_key)?.owner_user_id!==scope.actorUserId||d.session!==scene.session_id||d.scene!==scene.key)fail();
    if(d.cause_type==='verified_pvp_damage'){
      validatePvpDamageApplication(db,guild,row.record_key);
      text=`Your native resource receipt: HP marked +${d.hp_marks}; Armor spent ${d.armor?1:0}. No reaction, dialogue or death choice is implied.`;
    }else if(d.cause_type==='verified_npc_attack'){
      visibleIncomingInjury(db,guild,row.record_key,row.subject_key);
      text=`Native resource receipt: hp marked +${d.hp_marks}; before ${d.before.hp.current}, after ${d.after.hp.current}.`;
    }else{
      validatedPcEffectProjection(db,guild,row.record_key);
      text=`Native resource receipt: ${d.resource} changed ${d.amount>=0?'+':''}${d.amount}; before ${d.before}, after ${d.after}.`;
    }
  }else if(input.receipt_kind==='roll_request'){
    if(row.status!=='resolved'||d.session_id!==scene.session_id||d.scene!==scene.key)fail();
    const privateMode=scope.mode==='private';
    text=renderNativeNotice(db,guild,{kind:privateMode?'roll_private':'roll_party',ref:row.record_key,
      revision:noticeHash([row.status,row.data]),session:scene.session_id,scene:scene.key,
      ...(privateMode?{user:scope.actorUserId,character:scope.actorCharacterId}:{})});
  }
  return {text,source,revision:hash([row,source])};
}
return Object.freeze({handlesOutcome,projectMechanicalOutcome});
}
