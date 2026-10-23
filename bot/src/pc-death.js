/** Owner-selected SRD death moves. Native dice and receipts, never AI or GM character choices. */
import {createHash,randomUUID} from "node:crypto";
import {d,dualityRoll} from "./frameworks/daggerheart/public.js";
import {historicalOwnerPrincipal} from "./conversation-principal.js";
import {currentScene} from "./scene-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {validatePvpDamageApplication,settlePvpDamageAction} from "./pvp-damage.js";
import {hopeCap} from "./pc-native-eligibility.js";
import {historicalActionSource,consentAction} from "./action-consent.js";
import {validateIncomingDamageApplication} from "./pc-incoming.js";
import {validateAllyHealingApplication} from "./pc-effects.js";
import {settlePreRollFearForIncoming} from './pre-roll-fear.js';
import {createPcDeathEligibility} from './frameworks/daggerheart/pc-death-eligibility.js';
import {riskItAllOutcome,avoidDeathOutcome} from './frameworks/daggerheart/pc-death-outcomes.js';
export {hopeCap} from "./pc-native-eligibility.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"PC_DEATH_MOVE",expected:true});}
function closed(v,keys){if(!v||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))fail("Closed native death-choice fields required.");}
const {assertFinalHp:finalHp,assertDeathMapping}=createPcDeathEligibility({fail});
function requestProof(db,guild,user,key){
  const row=db.getCityRecord(guild,"pc_death_move_request",key),data=row?.data,pc=data&&db.getCharacter(data.character);
  if(!pc||pc.guild_id!==guild||user!==data.owner||pc.owner_user_id!==user)fail("Only the current affected owner may select or inspect a death move.");
  const principal=historicalOwnerPrincipal(db,guild,user,pc.id),scene=currentScene(db,guild);
  const {digest,...material}=data;
  if(data.version!==2||hash(material)!==digest||row.visibility!=="character"||row.subject_key!==pc.id
    ||principal.revision!==data.principal||scene.key!==data.scene||scene.session_id!==data.session)
    fail("Native death request/source/owner/principal/scene changed; reviewed recovery required.");
  const raw=db.getCityRecord(guild,"pc_effect_receipt",data.cause);
  const cause=raw?.data.cause_type==="verified_npc_attack"?validateIncomingDamageApplication(db,guild,data.cause):validatePvpDamageApplication(db,guild,data.cause);
  if(cause.subject_key!==pc.id||cause.source_event!==row.source_event||cause.data.after.hp.current!==cause.data.after.hp.max
    ||key!==(cause.data.cause_type==="verified_npc_attack"?`${cause.data.roll.replace(/:roll$/u,"")}:death`:`${cause.data.group}:death`))fail("Actual native final-HP cause required; no model-created death request.");
  return {row,pc,principal,cause};
}
export function reviewPcDeathMove(db,guild,user,key){return db.transaction(()=>{
  const f=requestProof(db,guild,user,key);
  if(f.row.status!=="awaiting_owner"){
    const row=validatePcDeathOutcome(db,guild,`${key}:outcome`),o=row.data;
    if(row.status!=="awaiting_allocation")return {request:key,status:row.status};
    if(hash(snapshot(f.pc))!==hash(o.after))fail("Recovery allocation compare-and-set is stale; reviewed recovery required.");
    const r=o.after.data.resources;
    return {request:key,status:row.status,revision:o.digest,move:o.move,result:o.result,
      recovery:{budget:Math.min(o.payload.hope,r.hp.current+r.stress.current),hp_marked:r.hp.current,stress_marked:r.stress.current},
      instruction:"Privately choose how to divide this native recovery budget between your marked HP and Stress using death-allocate and this exact revision. No reroll or automatic allocation."};
  }
  finalHp(f.pc);
  db.saveCityRecord(guild,{kind:"pc_death_review",key:`${key}:review`,status:"reviewed",visibility:"character",subject_key:f.pc.id,
    source_event:f.row.source_event,data:{owner:user,revision:f.row.data.digest,before:hash(f.pc.data)}});
  return {request:key,revision:f.row.data.digest,character:f.pc.id,
    instruction:"YOUR choice: Risk It All (Hope recovery allocation; Fear death; matching dice full recovery), Avoid Death (unconscious; Hope die may permanently remove a Hope slot), or Blaze of Glory (one GM-approved final action, then death). No automatic selection, authored scar, Hope award or extra Fear move. Dice and committed choices cannot be rerolled."};
});}
function saveOutcome(db,guild,f,material,status){return db.saveCityRecord(guild,{kind:"pc_death_outcome",key:`${f.row.record_key}:outcome`,
  status,visibility:"character",subject_key:f.pc.id,source_event:material.choice,data:{...material,digest:hash(material)}});}
function mutation(db,guild,f,before,after,key){return db.recordMutation(guild,{sessionId:f.row.data.session,actorType:"player",actorId:f.pc.owner_user_id,
  sourceLayer:"pc_death",mutationType:"owner_selected_srd_death_move",entityKey:f.pc.id,visibility:"character",before,after,
  rationale:"Native owner-selected death move; never generic PvP metacurrency.",payload:{request:f.row.record_key,outcome:key}}).id;}
function snapshot(pc){return {status:pc.status,data:pc.data};}
function settle(db,guild,f){
  db.saveCityRecord(guild,{...f.row,key:f.row.record_key,status:"resolved"});
  if(f.cause.data.cause_type==="verified_npc_attack")return settlePreRollFearForIncoming(db,guild,f.cause.data.roll.replace(/:roll$/u,''));
  const group=db.getCityRecord(guild,"pvp_damage_offer",f.cause.data.group);
  for(const source of group.data.binding.sources){const damage=db.getCityRecord(guild,"pvp_damage_roll_receipt",source.key);
    const attack=db.getCityRecord(guild,"pvp_attack_roll_receipt",damage.data.attack_receipt);settlePvpDamageAction(db,guild,attack.data.attack);}
}
export function choosePcDeathMove(db,guild,user,input,{interactionId,rng=d}={}){
  closed(input,["request","expected_revision","move"]);
  if(!interactionId||!["risk_it_all","avoid_death","blaze_of_glory"].includes(input.move))fail("Authenticated affected-owner native death move choice required.");
  return db.transaction(()=>{
    const f=requestProof(db,guild,user,input.request),old=db.getCityRecord(guild,"pc_death_outcome",`${input.request}:outcome`);
    if(input.expected_revision!==f.row.data.digest)fail("Death request revision is stale.");
    if(old){const prior=validatePcDeathOutcome(db,guild,old.record_key);if(prior.data.move!==input.move)fail("Committed death choice cannot change or reroll.");return prior;}
    if(f.row.status!=="awaiting_owner")fail("Death choice is no longer pending.");
    const review=db.getCityRecord(guild,"pc_death_review",`${input.request}:review`);
    if(review?.status!=="reviewed"||review.visibility!=="character"||review.subject_key!==f.pc.id||review.source_event!==f.row.source_event
      ||review.data.owner!==user||review.data.revision!==input.expected_revision)fail("Privately review your exact death risks before choosing.");
    if(hash(f.pc.data)!==review.data.before||hash(f.pc.data.resources)!==hash(f.cause.data.after))fail("Death choice compare-and-set is stale; review current resources.");
    finalHp(f.pc);assertDeathMapping(f.pc,input.move);const before=snapshot(f.pc),move=input.move;
    const choice=indexWorldEvent(db,guild,{key:`${input.request}:choice`,kind:"pc_death_owner_choice",title:"Owner-selected native SRD death move",
      source_id:`player:${user}`,visibility:"character",subject_key:f.pc.id,session_id:f.row.data.session,scene:f.row.data.scene,
      details:{author:user,request:input.request,revision:input.expected_revision,move,principal:f.principal.revision,interaction:interactionId}},user);
    let result,status="resolved",roll=null,payload=null,scar=false,deathOutcome=null;
    if(move==="risk_it_all"){
      payload={...dualityRoll({},rng),roll_type:"pc_death",request:input.request,move};
      result=riskItAllOutcome(payload.duality);
      if(result==="allocate_recovery")status="awaiting_allocation";
    }else if(move==="avoid_death"){
      const hope=rng(12);if(!Number.isSafeInteger(hope)||hope<1||hope>12)fail("Native Hope die out of range.");
      payload={id:randomUUID(),roll_type:"pc_death",request:input.request,move,hope};
      deathOutcome=avoidDeathOutcome(f.pc.data,hope,f.pc.data.level);scar=deathOutcome.scar;result=deathOutcome.result;
    }else {result="blaze_pending";status="awaiting_final_action";}
    if(payload)roll=db.addRoll(guild,f.row.data.session,user,f.pc.id,"pc_death",payload);
    db.updateCharacterData(f.pc.id,data=>{
      data.death_state={request:input.request,status:result};
      if(result==="recovered"){data.resources.hp.current=0;data.resources.stress.current=0;}
      if(move==="avoid_death"){data.resources.hope_max=deathOutcome.hope_max;data.resources.hope=Math.min(data.resources.hope,data.resources.hope_max);}
    });
    if(["dead","journey_ended"].includes(result))db.setCharacterStatus(f.pc.id,"dead",f.row.data.session);
    const after=snapshot(db.getCharacter(f.pc.id)),material={version:1,request:input.request,request_digest:f.row.data.digest,
      character:f.pc.id,owner:user,principal:f.principal.revision,move,choice:choice.event_key,roll,payload,result,scar,before,after,
      mutation:mutation(db,guild,f,before,after,`${input.request}:outcome`)};
    const outcome=saveOutcome(db,guild,f,material,status);
    db.saveCityRecord(guild,{...f.row,key:f.row.record_key,status:status==="resolved"?"resolved":status,data:{...f.row.data}});
    if(status==="resolved")settle(db,guild,f);return outcome;
  });
}
/** Native outcome ancestry only: never reapply a choice or authorize new PC actions. */
export function validatePcDeathOutcome(db,guild,key){
  const row=db.getCityRecord(guild,"pc_death_outcome",key),{digest,...data}=row?.data||{},f=data.request&&requestProof(db,guild,data.owner,data.request);
  if(!f||hash(data)!==digest||data.version!==1||key!==`${data.request}:outcome`||row.visibility!=="character"||row.subject_key!==f.pc.id
    ||data.character!==f.pc.id||data.principal!==f.row.data.principal||data.request_digest!==f.row.data.digest||row.source_event!==data.choice)
    fail("Exact private native death outcome required.");
  const choice=db.getWorldEvent(guild,data.choice),m=db.getMutation(guild,data.mutation);
  if(choice?.status!=="active"||choice.kind!=="pc_death_owner_choice"||choice.source_id!==`player:${data.owner}`||choice.visibility!=="character"
    ||choice.subject_key!==data.character||choice.scene!==f.row.data.scene||choice.session_id!==f.row.data.session
    ||choice.details.request!==data.request||choice.details.move!==data.move||choice.details.revision!==data.request_digest
    ||choice.details.principal!==data.principal||!db.ownerAuthoredSource(guild,choice.event_key,data.owner)
    ||m?.source_layer!=="pc_death"||m.entity_key!==data.character||hash(JSON.parse(m.before_json))!==hash(data.before)||hash(JSON.parse(m.after_json))!==hash(data.after))
    fail("Native owner death choice and transactional mutation proof required.");
  if(data.roll){const roll=db.getSavedRoll(guild,data.roll);
    if(roll?.roll_type!=="pc_death"||roll.character_id!==data.character||roll.discord_user_id!==data.owner||roll.session_id!==f.row.data.session
      ||hash(roll.payload)!==hash(data.payload))fail("Actual saved native death dice required.");}
  else if(data.move!=="blaze_of_glory"||data.result!=="blaze_pending")fail("Native death dice cannot be omitted.");
  finalHp({data:data.before.data});
  if(hash(data.before.data.resources)!==hash(f.cause.data.after)||!["active","reserve","guest"].includes(data.before.status))fail("Native final-HP before-state required.");
  const expected=structuredClone(data.before),r=data.payload;
  let result,scar=false;
  if(data.move==="risk_it_all"){
    if(![r?.hope,r?.fear].every(v=>Number.isSafeInteger(v)&&v>=1&&v<=12)||r.modifier!==0||r.experience!==0
      ||r.advantage!==0||r.disadvantage!==0||r.adv_net!==0||r.total!==r.hope+r.fear||r.adv_dice?.length||r.helper_dice?.length
      ||r.duality!==(r.hope===r.fear?"Critical":r.hope>r.fear?"Hope":"Fear"))fail("Unmodified native death dice arithmetic required.");
    result=riskItAllOutcome(r.duality);
    if(result==="recovered"){expected.data.resources.hp.current=0;expected.data.resources.stress.current=0;}
  }else if(data.move==="avoid_death"){
    if(!Number.isSafeInteger(r?.hope)||r.hope<1||r.hope>12)fail("Native death Hope die required.");
    const outcome=avoidDeathOutcome(expected.data,r.hope,expected.data.level);
    scar=outcome.scar;result=outcome.result;expected.data.resources.hope_max=outcome.hope_max;
    expected.data.resources.hope=Math.min(expected.data.resources.hope,outcome.hope_max);
  }else if(data.move==="blaze_of_glory")result="blaze_pending";
  else fail("Unknown native death move.");
  expected.data.death_state={request:data.request,status:result};
  if(["dead","journey_ended"].includes(result))expected.status="dead";
  if(data.result!==result||data.scar!==scar||hash(data.after)!==hash(expected)
    ||r&&(r.request!==data.request||r.move!==data.move||r.roll_type!=="pc_death"))fail("Native death consequence does not match actual saved dice.");
  if(data.allocation){const a=data.allocation,s=db.getWorldEvent(guild,a.source),am=db.getMutation(guild,a.mutation),after=structuredClone(data.after);
    if(data.result!=="allocate_recovery"||![a.hp,a.stress].every(v=>Number.isSafeInteger(v)&&v>=0)
      ||a.hp>after.data.resources.hp.current||a.stress>after.data.resources.stress.current
      ||a.hp+a.stress!==Math.min(r.hope,after.data.resources.hp.current+after.data.resources.stress.current))
      fail("Native recovery allocation arithmetic required.");
    after.data.resources.hp.current-=a.hp;after.data.resources.stress.current-=a.stress;after.data.death_state.status="recovered";
    if(hash(a.before)!==hash(data.after)||hash(a.after)!==hash(after)||s?.status!=="active"||s.kind!=="pc_death_recovery_allocation"
      ||s.source_id!==`player:${data.owner}`||s.visibility!=="character"||s.subject_key!==data.character
      ||s.details.author!==data.owner||s.details.request!==data.request||s.details.expected_revision!==a.revision
      ||s.details.hp!==a.hp||s.details.stress!==a.stress||s.details.principal!==data.principal
      ||!db.ownerAuthoredSource(guild,s.event_key,data.owner)||am?.source_layer!=="pc_death"||am.entity_key!==data.character
      ||hash(JSON.parse(am.before_json))!==hash(a.before)||hash(JSON.parse(am.after_json))!==hash(a.after))fail("Exact owner recovery allocation source and mutation required.");
  }
  if(data.blaze_final){
    const b=data.blaze_final,approved=blazeProof(db,guild,b.approval,{completed:true}),roll=db.getSavedRoll(guild,b.roll),m=db.getMutation(guild,b.mutation);
    if(data.move!=="blaze_of_glory"||approved.data.request!==data.request||roll?.payload.auto_critical?.approval!==b.approval
      ||m?.source_layer!=="pc_death"||m.entity_key!==data.character||hash(JSON.parse(m.before_json))!==hash(b.before)
      ||hash(JSON.parse(m.after_json))!==hash(b.after)||b.after.status!=="dead"||b.after.data.death_state?.status!=="dead")fail("Native approved final action/death mutation proof required.");
  }
  const lifecycle=data.result==="allocate_recovery"&&!data.allocation?"awaiting_allocation":data.result==="blaze_pending"&&!data.blaze_final?"awaiting_final_action":"resolved";
  if(row.status!==lifecycle||f.row.status!==lifecycle)fail("Native death lifecycle status requires actual allocation/final-action proof.");
  if(data.allocation){const {digest:unused,allocation,...original}=data;
    if(data.allocation.revision!==hash(original))fail("Native allocation must bind the exact previous death outcome revision.");}
  return row;
}
export function allocatePcDeathRecovery(db,guild,user,input,{interactionId}={}){
  closed(input,["request","expected_revision","hp","stress"]);if(!interactionId)fail("Authenticated owner allocation required.");
  return db.transaction(()=>{
    const f=requestProof(db,guild,user,input.request),row=validatePcDeathOutcome(db,guild,`${input.request}:outcome`),o=row.data;
    if(o.allocation){if(o.allocation.hp!==input.hp||o.allocation.stress!==input.stress||o.allocation.revision!==input.expected_revision)fail("Saved allocation replay differs.");return row;}
    if(row.status!=="awaiting_allocation"||o.result!=="allocate_recovery"||input.expected_revision!==o.digest
      ||![input.hp,input.stress].every(v=>Number.isSafeInteger(v)&&v>=0)||input.hp>o.after.data.resources.hp.current
      ||input.stress>o.after.data.resources.stress.current
      ||input.hp+input.stress!==Math.min(o.payload.hope,o.after.data.resources.hp.current+o.after.data.resources.stress.current))
      fail("Exact owner allocation of the native Hope die across marked HP/Stress required.");
    if(hash(snapshot(f.pc))!==hash(o.after))fail("Recovery allocation compare-and-set is stale; reviewed recovery required.");
    const source=indexWorldEvent(db,guild,{key:`${input.request}:allocation`,kind:"pc_death_recovery_allocation",title:"Owner allocates native death recovery",
      source_id:`player:${user}`,visibility:"character",subject_key:f.pc.id,session_id:f.row.data.session,scene:f.row.data.scene,
      details:{author:user,...input,principal:f.principal.revision,interaction:interactionId}},user);
    db.updateCharacterData(f.pc.id,data=>{data.resources.hp.current-=input.hp;data.resources.stress.current-=input.stress;data.death_state.status="recovered";});
    const after=snapshot(db.getCharacter(f.pc.id)),allocation={hp:input.hp,stress:input.stress,revision:input.expected_revision,source:source.event_key,
      before:o.after,after,mutation:mutation(db,guild,f,o.after,after,`${input.request}:allocation`)};
    const {digest,...material}=o,outcome=saveOutcome(db,guild,f,{...material,allocation},"resolved");settle(db,guild,f);return outcome;
  });
}

/** Human approves the exact independently owner-authored final action. This is no proxy authorship or effect grant. */
export function approveBlazeAction(db,guild,user,input,{gm=false,interactionId}={}){
  closed(input,["request","accepted_intent","ruling"]);if(!gm||!user||!interactionId)fail("Authenticated GM final-action review required.");
  return db.transaction(()=>{
    const raw=db.getCityRecord(guild,"pc_death_move_request",input.request),f=requestProof(db,guild,raw?.data.owner,input.request);
    const outcome=validatePcDeathOutcome(db,guild,`${input.request}:outcome`),{row:action}=consentAction(db,guild,input.accepted_intent),ruling=db.getRulesRuling(guild,input.ruling);
    if(outcome.status!=="awaiting_final_action"||outcome.data.move!=="blaze_of_glory"||action.data.actor!==f.pc.id||!ruling?.created_by
      ||hash(snapshot(f.pc))!==hash(outcome.data.after))fail("Current owner-authored Blaze final action and saved GM ruling required.");
    const key=`pc-blaze:${hash([guild,input.accepted_intent])}`,existing=db.getCityRecord(guild,"pc_blaze_action",key);
    if(existing){if(hash(existing.data.input)!==hash(input))fail("Frozen final action cannot change.");return blazeProof(db,guild,key);}
    if(db.listCityRecords(guild,{kind:"pc_blaze_action",includeGM:true,limit:500}).some(r=>r.data.request===input.request))fail("One final action only; no second approval.");
    const binding={version:1,input,request:input.request,action:action.record_key,character:f.pc.id,owner:f.pc.owner_user_id,principal:f.principal.revision,
      gm:user,ruling_hash:hash(ruling),scene:f.row.data.scene,session:f.row.data.session,before:hash(snapshot(f.pc)),source:action.source_event};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"pc_blaze_gm_approval",source_id:`gm:${user}`,title:"GM approves exact owner-authored final action",
      session_id:binding.session,scene:binding.scene,visibility:"gm",details:binding},user);
    return db.saveCityRecord(guild,{kind:"pc_blaze_action",key,status:"approved",visibility:"gm",subject_key:f.pc.id,source_event:source.event_key,data:binding});
  });
}
function blazeProof(db,guild,key,{completed=false}={}){
  const row=db.getCityRecord(guild,"pc_blaze_action",key),b=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),pc=b&&db.getCharacter(b.character);
  if(!b||b.version!==1||row.visibility!=="gm"||row.subject_key!==b.character||key!==`pc-blaze:${hash([guild,b.action])}`
    ||row.source_event!==`${key}:source`||source?.status!=="active"||source.kind!=="pc_blaze_gm_approval"||source.source_id!==`gm:${b.gm}`
    ||source.visibility!=="gm"||hash(source.details)!==hash(b)||!db.ownerAuthoredSource(guild,source.event_key,b.gm)
    ||hash(db.getRulesRuling(guild,b.input.ruling))!==b.ruling_hash||pc?.owner_user_id!==b.owner
    ||historicalOwnerPrincipal(db,guild,b.owner,b.character).revision!==b.principal)fail("Exact source-reviewed native Blaze final action required.");
  const action=db.getCityRecord(guild,"typed_intent",b.action),proof=historicalActionSource(db,guild,b.action,{resolved:action?.status==="resolved"});
  if(proof.row.source_event!==b.source||proof.row.data.actor!==b.character||proof.scene.key!==b.scene||proof.scene.session_id!==b.session)
    fail("Final action owner/source/scene changed.");
  const outcome=db.getCityRecord(guild,"pc_death_outcome",`${b.request}:outcome`);
  // Structural choice proof here avoids recursive outcome->final-action->outcome validation. Full caller validates outcome separately.
  const choice=outcome&&db.getWorldEvent(guild,outcome.data.choice);
  if(outcome?.data.move!=="blaze_of_glory"||outcome.data.character!==b.character||choice?.status!=="active"
    ||choice.kind!=="pc_death_owner_choice"||choice.details.move!=="blaze_of_glory"||choice.details.request!==b.request
    ||choice.details.author!==b.owner||!db.ownerAuthoredSource(guild,choice.event_key,b.owner))fail("Current native owner Blaze selection required.");
  if(!completed&&(row.status!=="approved"||outcome.status!=="awaiting_final_action"||hash(snapshot(pc))!==b.before))
    fail("Final action consumed or source/sheet changed; no second action.");
  return row;
}
export function blazeActionAuthorization(db,guild,character,action,{completed=false}={}){
  if(!action)return null;const key=`pc-blaze:${hash([guild,action])}`,raw=db.getCityRecord(guild,"pc_blaze_action",key);if(!raw)return null;
  const row=blazeProof(db,guild,key,{completed});if(row.data.character!==character)fail("Final action belongs to another owner.");return row;
}
export function blazeCriticalResult(db,guild,character,action){const row=blazeActionAuthorization(db,guild,character,action);
  if(!row)return null;
  validatePcDeathOutcome(db,guild,`${row.data.request}:outcome`);
  return {id:randomUUID(),duality:"Critical",total:null,auto_critical:{approval:row.record_key,rule:"srd_blaze_of_glory",source:row.source_event}};
}
export function validateBlazeSavedRoll(db,guild,rollId){
  const roll=db.getSavedRoll(guild,rollId),a=roll?.payload.auto_critical,approved=a&&blazeProof(db,guild,a.approval,{completed:true});
  if(!approved||!["blaze_final_action","damage_pvp_attack"].includes(roll.roll_type)||roll.character_id!==approved.data.character
    ||roll.discord_user_id!==approved.data.owner||roll.session_id!==approved.data.session||a.rule!=="srd_blaze_of_glory"
    ||a.source!==approved.source_event||roll.payload.duality!=="Critical"||roll.payload.total!==null
    ||roll.payload.hope!==undefined||roll.payload.fear!==undefined)fail("Exact native automatic Critical source/result required; no fabricated dice.");
  return approved;
}
export function completeBlazeAction(db,guild,character,action,{request,roll,effect=null}={}){
  const row=blazeActionAuthorization(db,guild,character,action,{completed:true});if(!row)return null;
  return db.transaction(()=>{
    const b=row.data,f=requestProof(db,guild,b.owner,b.request),outcome=validatePcDeathOutcome(db,guild,`${b.request}:outcome`);
    if(outcome.data.blaze_final)return outcome;
    const saved=db.getSavedRoll(guild,roll);validateBlazeSavedRoll(db,guild,roll);
    let valid=false;
    if(saved.roll_type==="blaze_final_action"){
      const native=db.getCityRecord(guild,"roll_request",request);
      valid=native?.status==="resolved"&&native.data.roll_id===roll&&native.data.input.accepted_intent===action
        &&native.data.result.duality==="Critical";
    }else{
      const native=db.getCityRecord(guild,"pvp_attack_request",request),staged=native&&db.getCityRecord(guild,"pvp_attack_intent",native.data.offer.input.attack);
      const applied=effect&&validatePvpDamageApplication(db,guild,effect);
      valid=native?.data.application===effect&&staged?.data.accepted_intent===action
        &&db.getCityRecord(guild,"pvp_attack_roll_receipt",native.data.roll)?.data.roll_id===roll
        &&applied?.data.authority&&["damage_applied","resolved"].includes(native.status);
    }
    if(row.status!=="approved"||outcome.status!=="awaiting_final_action"||saved.payload.auto_critical?.approval!==row.record_key||!valid)
      fail("Actual terminal approved native final action required before death; no narration or invented result.");
    const before=snapshot(f.pc);db.updateCharacterData(character,data=>{data.death_state.status="dead";});db.setCharacterStatus(character,"dead",b.session);
    const after=snapshot(db.getCharacter(character)),blaze_final={approval:row.record_key,request,roll,effect,before,after,
      mutation:mutation(db,guild,f,before,after,`${b.request}:blaze-final`)};
    const {digest,...material}=outcome.data,result=saveOutcome(db,guild,f,{...material,blaze_final},"resolved");
    db.saveCityRecord(guild,{...row,key:row.record_key,status:"consumed"});settle(db,guild,f);return result;
  });
}
/** Only a committed native ally HP clear wakes Avoid Death. No rest/GM prose or authored reaction is inferred. */
export function wakeAfterNativeAllyHealing(db,guild,effect){return db.transaction(()=>{
  const applied=validateAllyHealingApplication(db,guild,effect),pc=db.getCharacter(applied.subject_key),state=pc.data.death_state;
  const key=`${effect}:wake`,old=db.getCityRecord(guild,"pc_consciousness_receipt",key);
  if(old)return validatePcConsciousness(db,guild,key);
  if(state?.status!=="unconscious")return null;
  const outcome=validatePcDeathOutcome(db,guild,`${state.request}:outcome`);
  if(outcome.data.move!=="avoid_death"||outcome.data.result!=="unconscious"||outcome.status!=="resolved"
    ||applied.data.after!==pc.data.resources.hp.current||applied.data.after>=applied.data.before)fail("Actual ally HP recovery and native unconscious outcome required.");
  const before=snapshot(pc);db.updateCharacterData(pc.id,data=>{data.death_state.status="recovered";});
  const after=snapshot(db.getCharacter(pc.id)),request=db.getCityRecord(guild,"pc_death_move_request",state.request);
  const material={version:1,character:pc.id,owner:pc.owner_user_id,request:state.request,outcome:outcome.record_key,effect,
    before,after,mutation:mutation(db,guild,{pc,row:request},before,after,key)};
  return db.saveCityRecord(guild,{kind:"pc_consciousness_receipt",key,status:"resolved",source_event:applied.source_event,
    visibility:"character",subject_key:pc.id,data:{...material,digest:hash(material)}});
});}
export function validatePcConsciousness(db,guild,key){
  const row=db.getCityRecord(guild,"pc_consciousness_receipt",key),{digest,...v}=row?.data||{},effect=v.effect&&validateAllyHealingApplication(db,guild,v.effect),
    outcome=v.outcome&&validatePcDeathOutcome(db,guild,v.outcome),m=v.mutation&&db.getMutation(guild,v.mutation),expected=v.before&&structuredClone(v.before);
  if(expected)expected.data.death_state.status="recovered";
  if(!effect||!outcome||v.version!==1||hash(v)!==digest||key!==`${v.effect}:wake`||row.status!=="resolved"||row.visibility!=="character"
    ||row.subject_key!==v.character||effect.subject_key!==v.character||row.source_event!==effect.source_event
    ||outcome.data.character!==v.character||outcome.data.owner!==v.owner||outcome.data.request!==v.request
    ||outcome.data.move!=="avoid_death"||outcome.data.result!=="unconscious"||v.before.data.death_state?.status!=="unconscious"
    ||v.before.data.death_state.request!==v.request||v.before.data.resources.hp.current!==effect.data.after||hash(expected)!==hash(v.after)
    ||m?.source_layer!=="pc_death"||m.entity_key!==v.character||hash(JSON.parse(m.before_json))!==hash(v.before)
    ||hash(JSON.parse(m.after_json))!==hash(v.after))fail("Exact native consciousness source and mutation required.");
  return row;
}
