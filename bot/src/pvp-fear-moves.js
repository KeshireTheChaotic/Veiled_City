/** Authenticated immediate GM consequence decisions. Native targets/CAS/effect receipts, never banked Fear or PC reactions. */
import { createHash } from "node:crypto";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene, scenePresence } from "./scene-continuity.js";
import { pvpOwnerContext } from "./narrative-pvp.js";
import { validatePvpRoundReceipt } from "./pvp-rounds.js";
import { fearGateKey, pendingPvpFear } from "./pvp-fear-gate.js";
import { settlePvpWindow } from "./pvp-terminal.js";
import { configureSimulationEntity, submitNpcAction } from "./simulation.js";
import { assertNpcAvailability } from "./city-constraints.js";
import { validateWorldEncounterActivation } from "./encounter.js";
import { validatePvpAttackRoll } from "./pvp-attacks.js";
import {settlePvpDamageAction} from "./pvp-damage.js";
import {assertBrawlFearOrder} from "./pvp-brawl.js";

export const fearRevision=v=>createHash("sha256").update(JSON.stringify(v)??"undefined").digest("hex");
const hash=fearRevision;
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,fields){
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!fields.includes(k))||fields.some(k=>!(k in input)))
    fail("Closed native Fear move fields required.");
}
function gmOnly(gm,user){if(!gm||!user)fail("Authenticated GM authority required for immediate Fear moves.");}
function all(db,guild,kind){
  const out=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);if(page.length<100)return out;
  }
  fail("Native Fear history exceeds safe coverage; reviewed recovery required.");
}
function target(db,guild,context){
  const d=context.data;
  if(d.move_kind==="clock_advance")return db.getClock(guild,d.target_key);
  if(d.move_kind==="access_obstacle")return db.getSimulationEntity(guild,"location",d.target_key);
  if(d.move_kind==="npc_prepare")return db.getSimulationEntity(guild,"npc",d.target_key);
  fail("Unsupported native Fear route remains pending review.");
}
function contextProof(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_fear_context",key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  if(!row||row.status!=="active"||d.version!==1||row.record_key!==`pvp-fear-context:${hash(d)}`
    ||s?.status!=="active"||s.kind!=="pvp_fear_context_established"||hash(s.details)!==d.source_hash
    ||s.source_id!==`gm:${d.gm}`||s.visibility!==d.visibility||s.subject_key!==(d.subject_key||null)
    ||currentScene(db,guild).key!==d.scene||!target(db,guild,row))fail("Current grounded GM context/source required.");
  return row;
}
/** Explicit GM establishes a bounded connection to an existing scene obstacle/countdown, not a model recommendation. */
export function establishFearContext(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["move_kind","target_key","location_key","visibility","subject_key"]);
  if(!["clock_advance","access_obstacle","npc_prepare"].includes(input.move_kind)||!["party","character","gm"].includes(input.visibility)
    ||!interactionId||typeof input.target_key!=="string"||input.target_key.length>160)fail("Supported bounded native Fear context required.");
  const scene=currentScene(db,guild),location=db.getSimulationEntity(guild,"location",input.location_key);
  if(!location||input.visibility==="character"&&db.getCharacter(input.subject_key)?.guild_id!==guild
    ||input.visibility!=="character"&&input.subject_key!==null)fail("Existing location and exact audience required.");
  const original=target(db,guild,{data:input});if(!original)fail("Existing native effect target required; prose cannot create one.");
  if(input.move_kind==="clock_advance"){
    if(input.visibility!==original.visibility||input.subject_key!==(original.subject_character_id||null)
      ||original.subject_user_id)fail("Fear context cannot promote private countdown state.");
  }else if(input.move_kind==="npc_prepare")npcPreparation(db,guild,input.target_key,input.location_key,input.visibility);
  else if(input.target_key!==input.location_key||!["party","public"].includes(original.state.visibility||"party")
    &&input.visibility==="party")fail("Native access obstacle must be local and audience-safe.");
  return db.transaction(()=>{
    const details={version:1,...input,gm:user,scene:scene.key,session:scene.session_id,severity:1,
      native_route:input.move_kind==="clock_advance"?"changeClock":input.move_kind==="npc_prepare"?"submitNpcAction":"configureSimulationEntity"};
    const s=indexWorldEvent(db,guild,{key:`pvp-fear-context-source:${hash([guild,user,interactionId])}`,
      kind:"pvp_fear_context_established",title:"GM-established immediate scene consequence context",source_id:`gm:${user}`,
      scene:scene.key,session_id:scene.session_id,location_key:input.location_key,visibility:input.visibility,
      subject_key:input.subject_key,details},user);
    if(s.status!=="active"||hash(s.details)!==hash(details))fail("Context replay changed its exact fields.");
    const data={...details,source_hash:hash(s.details)},key=`pvp-fear-context:${hash(data)}`;
    return db.getCityRecord(guild,"pvp_fear_context",key)||db.saveCityRecord(guild,{kind:"pvp_fear_context",key,status:"active",
      source_event:s.event_key,visibility:input.visibility,subject_key:input.subject_key,location_key:input.location_key,data});
  });
}
function triggerProof(db,guild,key,{allowResolved=false}={}){
  const t=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(t?.data.version===2)return attackTriggerProof(db,guild,t,{allowResolved});
  const p=t&&db.getCityRecord(guild,"pvp_proposal",t.data.proposal);
  if(!t||!p||t.data.terms_hash!==p.data.terms_hash||currentScene(db,guild).key!==t.data.scene
    ||t.data.session!==db.getActiveSession(guild)?.id)fail("Current scene/source-bound Fear trigger required.");
  for(const who of p.data.participants)pvpOwnerContext(db,guild,who.user,p.record_key);
  const round=db.getCityRecord(guild,"pvp_round_receipt",t.data.round_receipt);
  validatePvpRoundReceipt(db,guild,p,round);
  const d=t.data,expected=`pvp-fear:${hash([p.record_key,p.data.terms_hash,round.data.round,round.record_key]).slice(0,40)}`;
  if(expected!==key||round.data.roll_id!==d.roll_id||round.data.result.duality!=="Fear"||round.source_event!==t.source_event
    ||round.data.character!==d.roller_character||d.round!==round.data.round)fail("Fear obligation must cite exact native dice.");
  const gate=db.getCityRecord(guild,"pvp_exchange_gate",fearGateKey(p,d.round));
  if(!gate||!gate.data.expected_fear_trigger_ids.includes(key)||gate.data.pair_ref!==d.paired_comparison_ref)
    fail("Fear remains sealed awaiting pair; no move selection or opposing disclosure.");
  exchangeProof(db,guild,p,gate);
  if(!allowResolved&&t.status==="resolved")fail("Fear move already resolved; replay the effect receipt, never reexecute.");
  if(!allowResolved){
    const next=gate.data.expected_fear_trigger_ids.find(id=>db.getCityRecord(guild,"pvp_fear_trigger",id)?.status!=="resolved");
    if(next!==key)fail("Resolve immediate Fear obligations in locked participant order.");
  }
  return {t,p,gate,round};
}
function attackTriggerProof(db,guild,t,{allowResolved}){
  const {receipt:round,offer,contract:p}=validatePvpAttackRoll(db,guild,t.data.attack_receipt),d=t.data;
  const expected=`pvp-fear:${hash([p.record_key,p.data.terms_hash,round.data.attack,round.record_key]).slice(0,40)}`;
  const gate=db.getCityRecord(guild,"pvp_exchange_gate",fearGateKey(p,round.data.attack)),g=gate?.data;
  if(t.record_key!==expected||d.proposal!==p.record_key||d.terms_hash!==offer.terms_hash||d.session!==offer.session||d.scene!==offer.scene
    ||d.roll_id!==round.data.roll_id||d.roller_character!==offer.actor||d.roller_principal_revision!==offer.snapshot.actor_principal
    ||d.source_event!==round.source_event||t.source_event!==round.source_event||d.duality!=="Fear"||round.data.result.duality!=="Fear"
    ||d.round!==round.data.attack||d.paired_comparison_ref!==round.record_key||d.trigger_ordinal!==0
    ||t.visibility!=="gm"||g?.version!==2||g.proposal!==p.record_key||g.terms_hash!==offer.terms_hash
    ||g.round!==round.data.attack||g.pair_ref!==round.record_key||gate.source_event!==p.source_event||gate.visibility!=="gm"
    ||hash(g.expected_fear_trigger_ids)!==hash([expected])||hash(g.resolved_effect_ids)!==hash(t.status==="resolved"?[t.data.effect]:[])
    ||gate.status!==(t.status==="resolved"?"ready":"pending_fear"))fail("Exact immediate damage-action Fear roll/gate required.");
  if(!allowResolved&&t.status==="resolved")fail("Fear move already resolved; replay native effect only.");
  if(!allowResolved)assertBrawlFearOrder(db,guild,db.getCityRecord(guild,"pvp_attack_request",round.data.attack),t);
  return {t,p,gate,round};
}
/** Reconstruct obligation membership from saved dice, not mutable gate pointers or model labels. */
function exchangeProof(db,guild,p,gate){
  const g=gate.data,rows=p.data.participants.map(w=>all(db,guild,"pvp_round_receipt").find(r=>r.data.proposal===p.record_key
    &&r.data.terms_hash===p.data.terms_hash&&r.data.round===g.round&&r.data.character===w.character));
  for(const r of rows.filter(Boolean))validatePvpRoundReceipt(db,guild,p,r);
  if(g.version!==1||g.proposal!==p.record_key||g.terms_hash!==p.data.terms_hash
    ||gate.record_key!==fearGateKey(p,g.round)||gate.source_event!==p.source_event||gate.visibility!=="gm")
    fail("Exact native exchange gate required.");
  if(g.partial){
    const neutral=db.getCityRecord(guild,"pvp_resolution_receipt",g.pair_ref),s=neutral&&db.getWorldEvent(guild,neutral.source_event);
    if(rows.filter(Boolean).length!==1||p.data.resolution_receipt!==g.pair_ref||neutral?.status!=="resolved"
      ||neutral.data.proposal!==p.record_key||neutral.data.terms_hash!==p.data.terms_hash
      ||!["declined","withdrawn"].includes(neutral.data.outcome)||neutral.data.winner!==null||neutral.data.roll_refs.length
      ||s?.status!=="active"||s.kind!=="pvp_consent_reply"||s.details.decision!==neutral.data.outcome.replace("declined","decline").replace("withdrawn","withdraw")
      ||!p.data.participants.some(w=>w.user===s.details.author&&db.ownerAuthoredSource(guild,s.event_key,w.user)))
      fail("Exact native neutral partial-pair closure required.");
  }else{
    const pair=db.getCityRecord(guild,"pvp_strike_receipt",g.pair_ref),totals=rows.filter(Boolean).map(r=>r.data.result.total);
    const winner=totals[0]===totals[1]?null:p.data.participants[totals[0]>totals[1]?0:1]?.character;
    if(rows.some(r=>!r)||g.pair_ref!==`pvp-pair:${hash([p.record_key,p.data.terms_hash,g.round]).slice(0,40)}`
      ||pair?.status!=="resolved"||pair.source_event!==p.source_event||pair.visibility!=="gm"
      ||pair.data.proposal!==p.record_key||pair.data.terms_hash!==p.data.terms_hash||pair.data.round!==g.round
      ||hash(pair.data.round_refs)!==hash(rows.map(r=>r.record_key))||hash(pair.data.roll_refs)!==hash(rows.map(r=>r.data.roll_id))
      ||hash(pair.data.totals)!==hash(totals)||pair.data.winner!==winner)
      fail("Exact saved native paired comparison required.");
  }
  const expected=rows.filter(r=>r?.data.result.duality==="Fear").map(r=>`pvp-fear:${hash([p.record_key,p.data.terms_hash,g.round,r.record_key]).slice(0,40)}`);
  const triggers=expected.map(key=>db.getCityRecord(guild,"pvp_fear_trigger",key));
  const effects=triggers.filter(t=>t?.status==="resolved").map(t=>t.data.effect);
  if(triggers.some((t,i)=>!t||t.data.trigger_ordinal!==p.data.participants.findIndex(w=>w.character===t.data.roller_character)
      ||t.data.paired_comparison_ref!==g.pair_ref||t.data.round_receipt!==rows.filter(r=>r?.data.result.duality==="Fear")[i].record_key)
    ||hash(g.expected_fear_trigger_ids)!==hash(expected)||hash(g.resolved_effect_ids)!==hash(effects)
    ||gate.status!==(effects.length===expected.length?"ready":"pending_fear"))
    fail("Exact native Fear obligation set/order/effects required.");
}
function applicable(db,guild,p,context,before){
  if(context.data.scene!==p.data.scene||context.location_key!==p.data.location_key)fail("Fear consequence must be contextual to this exchange.");
  if(context.data.move_kind==="clock_advance"){
    if(!Number.isSafeInteger(before.value)||before.value>=before.max_value)fail("Completed countdown cannot receive a cosmetic/no-op advance.");
  }else if(context.data.move_kind==="npc_prepare")npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility);
  else if(before.state.locked||before.state.sealed||before.state.removed||before.state.blocks_exit||before.state.locked_exit)
    fail("Access obstacle already applied or would trap characters; choose a new legal scene move.");
}
function npcPreparation(db,guild,key,location,visibility){
  assertNpcAvailability(db,guild,key,{type:"prepare",location_key:location});
  const session=db.getActiveSession(guild),encounter=session&&db.getCurrentEncounter(session.id);
  if(encounter?.status!=="active")fail("Current native encounter required for an immediate adversary action.");
  validateWorldEncounterActivation(db,guild,encounter);
  const binding=db.getCityRecord(guild,"encounter_binding",encounter.id),actor=binding?.data.combatants?.find(b=>b.actor===key);
  const actual=actor&&db.listCombatants(encounter.id).find(c=>c.id===actor.id&&c.status==="active");
  const npc=db.getSimulationEntity(guild,"npc",key),profile=db.getNpcProfile(guild,key);
  const presence=scenePresence(db,guild,"npc",key);
  if(visibility==="party"&&(npc?.state.hidden||!["party","public"].includes(npc?.state.visibility||"party")
    ||!presence||!["party","public"].includes(presence.visibility)||presence.data.hidden))
    fail("Hidden/private NPC action cannot be promoted to a party consequence.");
  const goals=db.listNpcGoals(guild,key,{status:"active",limit:50}).filter(g=>g.acceptable_methods.includes("prepare"));
  if(!profile||!actual||npc?.state.location_key!==location||npc.state.resources?.manpower<1||npc.state.preparation>=5
    ||goals.length!==1)fail("Current bound adversary, capacity and unique established preparation goal required.");
  return {encounter,binding,combatant:actual,goal:goals[0],presence};
}
function holdTargets(db,guild,p,actions){
  if(!Array.isArray(actions)||actions.length>8||new Set(actions).size!==actions.length)fail("Bounded independent pending action targets required.");
  return actions.map(key=>{
    const row=db.getCityRecord(guild,"compound_action",key),intent=row&&db.getCityRecord(guild,"typed_intent",row.data.action_id);
    const pc=row&&db.getCharacter(row.data.actor);
    if(!row||!["pending","suspended","ready"].includes(row.status)||row.data.scene!==p.data.scene||!intent
      ||intent.status!=="accepted_for_adjudication"||intent.data.type!=="search"||pc?.data.location!==p.data.location_key
      ||p.data.participants.some(w=>w.character===pc?.id))fail("Only unfinished, contextual third-party investigation may be interrupted.");
    return row;
  });
}
export function selectFearMove(db,guild,user,input,options={}){
  gmOnly(options.gm,user);
  try{return selectMove(db,guild,user,input,options);}catch(error){holdForReview(db,guild,user,input?.trigger,error);throw error;}
}
function selectMove(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision","context","expected_target_revision","affected_actions"]);
  return db.transaction(()=>{
    const {t,p,gate}=triggerProof(db,guild,input.trigger),context=contextProof(db,guild,input.context),before=target(db,guild,context);
    if(t.data.revision!==input.expected_revision||hash(before)!==input.expected_target_revision)fail("Fear trigger/target revision changed; refresh selection.");
    applicable(db,guild,p,context,before);const holds=holdTargets(db,guild,p,input.affected_actions);
    const details={version:1,trigger:t.record_key,context:context.record_key,context_hash:hash(context),
      native_context_hash:context.data.move_kind==="npc_prepare"
        ?hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility)):null,
      selector:user,revision:t.data.revision,gate_revision:gate.data.revision,expected_target_revision:hash(before),
      affected_actions:holds.map(row=>({key:row.record_key,revision:hash(row)})),visibility:context.visibility,
      subject_key:context.subject_key,scene:p.data.scene,terms_hash:p.data.terms_hash,severity:1};
    const source=indexWorldEvent(db,guild,{key:`pvp-fear-selection:${hash([guild,user,interactionId])}`,
      kind:"pvp_fear_selection",title:"Authenticated immediate GM move selection",source_id:`gm:${user}`,visibility:"gm",
      session_id:p.data.session_id,scene:p.data.scene,details},user);
    if(!interactionId||source.status!=="active"||hash(source.details)!==hash(details))fail("Exact native GM selection interaction required.");
    const data={...details,source_hash:hash(source.details)},key=`pvp-fear-decision:${hash(data)}`;
    const decision=db.saveCityRecord(guild,{kind:"pvp_fear_move_decision",key,status:"selected",visibility:"gm",source_event:source.event_key,data});
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"move_selected",data:{...t.data,decision:key,revision:t.data.revision+1}});
    return decision;
  });
}
function decisionProof(db,guild,t,key){
  const row=db.getCityRecord(guild,"pvp_fear_move_decision",key),d=row?.data,s=row&&db.getWorldEvent(guild,row.source_event);
  if(!row||row.status!=="selected"||row.record_key!==`pvp-fear-decision:${hash(d)}`||d.trigger!==t.record_key
    ||t.data.decision!==key||d.terms_hash!==t.data.terms_hash||s?.status!=="active"||s.kind!=="pvp_fear_selection"
    ||s.source_id!==`gm:${d.selector}`||hash(s.details)!==d.source_hash)fail("Exact authenticated GM move decision/source required.");
  return row;
}
export function applyFearMove(db,guild,user,input,options={}){
  gmOnly(options.gm,user);
  try{return applyMove(db,guild,user,input,options);}catch(error){holdForReview(db,guild,user,input?.trigger,error);throw error;}
}
function applyMove(db,guild,user,input,{gm=false,rng}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision","decision"]);
  return db.transaction(()=>{
    const existing=db.getCityRecord(guild,"pvp_fear_effect_receipt",`pvp-fear-effect:${input.trigger}`);
    if(existing){validateFearEffect(db,guild,existing.record_key);
      if(existing.data.decision!==input.decision)fail("Effect replay cannot substitute a new decision.");return existing;}
    const {t,p,gate}=triggerProof(db,guild,input.trigger),decision=decisionProof(db,guild,t,input.decision);
    const context=contextProof(db,guild,decision.data.context),before=target(db,guild,context);
    if(t.data.revision!==input.expected_revision||hash(context)!==decision.data.context_hash
      ||hash(before)!==decision.data.expected_target_revision||gate.data.revision!==decision.data.gate_revision)
      fail("Immediate Fear move preconditions changed; reselect against current native state.");
    applicable(db,guild,p,context,before);
    if(context.data.move_kind==="npc_prepare"&&hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility))!==decision.data.native_context_hash)
      fail("Native NPC encounter/goal/presence revision changed; refresh selection.");
    const holds=holdTargets(db,guild,p,decision.data.affected_actions.map(row=>row.key));
    if(holds.some((r,i)=>hash(r)!==decision.data.affected_actions[i].revision))fail("Interrupted action revision changed; do not overwrite progress.");
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"executing",data:{...t.data,revision:t.data.revision+1}});
    const d=context.data;
    let npcAction=null;
    if(d.move_kind==="clock_advance")db.changeClock(guild,d.target_key,1,{label:before.label,visibility:before.visibility,
      subjectUserId:before.subject_user_id,subjectCharacterId:before.subject_character_id,max:before.max_value});
    else if(d.move_kind==="npc_prepare"){
      const native=npcPreparation(db,guild,d.target_key,d.location_key,d.visibility);
      npcAction=submitNpcAction(db,guild,{actor_type:"npc",actor_key:d.target_key,goal_key:native.goal.goal_key,
        type:"prepare",location_key:d.location_key,significance:"routine",rationale:"Current encounter preparation, immediate GM move."},
      {approved:true,cycleKey:`pvp-fear:${t.record_key}`,roll:rng});
      if(npcAction.status!=="completed")fail("Immediate NPC action has no completed native consequence; retain Fear obligation.");
    }else configureSimulationEntity(db,guild,"location",d.target_key,{locked:true});
    const after=target(db,guild,context);
    if(hash(after)===hash(before))fail("Fear consequence did not apply a meaningful native effect.");
    const mutation=db.recordMutation(guild,{sessionId:p.data.session_id,actorType:"human_gm",actorId:user,sourceLayer:"pvp_fear",
      mutationType:d.move_kind,entityKey:d.target_key,visibility:d.visibility,before,after,
      rationale:"Immediate native scene consequence; no PC reaction, resources, movement or banked Fear.",payload:{trigger:t.record_key,decision:decision.record_key}});
    const effectKey=`pvp-fear-effect:${t.record_key}`,holdRefs=[];
    for(const node of holds){
      const key=`pvp-interrupt:${hash([effectKey,node.record_key])}`;holdRefs.push(key);
      db.saveCityRecord(guild,{kind:"action_interrupt_receipt",key,status:"pending",source_event:context.source_event,visibility:node.visibility,
        subject_key:node.subject_key,data:{version:1,action:node.record_key,effect:effectKey,before_revision:hash(node),
          before_status:node.data.status,scene:p.data.scene,authority:"Changed investigation conditions; no invented failure, progress loss, cost or PC response."}});
      db.saveCityRecord(guild,{...node,key:node.record_key,status:"pending",data:{...node.data,status:"pending",
        interrupt_refs:[...(node.data.interrupt_refs||[]),key]}});
    }
    const npcMutation=npcAction&&db.mutationsForEntity(guild,npcAction.id,20).find(m=>m.source_layer==="npc_director"&&m.mutation_type==="npc_action:prepare");
    if(npcAction&&(!npcMutation||hash(JSON.parse(npcMutation.after_json))!==hash(npcAction)))fail("Exact completed native NPC action mutation required.");
    const data={version:1,trigger:t.record_key,decision:decision.record_key,context:context.record_key,source_event:context.source_event,
      source_hash:context.data.source_hash,scene:p.data.scene,session:p.data.session_id,proposal:p.record_key,terms_hash:p.data.terms_hash,
      move_kind:d.move_kind,target:d.target_key,native_mutation_refs:[mutation.id],before,after,hold_refs:holdRefs,
      npc_action_ref:npcAction?.id||null,npc_action_hash:npcAction?hash(npcAction):null,npc_mutation_ref:npcMutation?.id||null,
      visibility:d.visibility,subject_key:d.subject_key,applied_by:user,idempotency_key:effectKey};
    const effect=db.saveCityRecord(guild,{kind:"pvp_fear_effect_receipt",key:effectKey,status:"resolved",source_event:context.source_event,
      visibility:d.visibility,subject_key:d.subject_key,data:{...data,effect_digest:hash(data)}});
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"resolved",data:{...t.data,effect:effectKey,revision:t.data.revision+2}});
    const refs=[...gate.data.resolved_effect_ids,effectKey],ready=refs.length===gate.data.expected_fear_trigger_ids.length;
    db.saveCityRecord(guild,{...gate,key:gate.record_key,status:ready?"ready":"pending_fear",
      data:{...gate.data,resolved_effect_ids:refs,revision:gate.data.revision+1}});
    if(ready&&!pendingPvpFear(db,guild,p).length&&p.data.resolution_receipt)
      settlePvpWindow(db,guild,p,db.getCityRecord(guild,"pvp_resolution_receipt",p.data.resolution_receipt));
    if(ready&&gate.data.version===2){
      settlePvpDamageAction(db,guild,gate.data.round);
      const opp=db.getCityRecord(guild,"pvp_spotlight_opportunity",`${gate.data.round}:opportunity`);
      if(opp&&!pendingPvpFear(db,guild,p).length){const w=db.getCityRecord(guild,"scene_action_window",opp.data.window);
        for(const key of w.data.pvp_brawl.requests)if(key!==gate.data.round)settlePvpDamageAction(db,guild,key);
      }
    }
    return effect;
  });
}
export function validateFearEffect(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_fear_effect_receipt",key),d=row?.data;
  if(!row||row.status!=="resolved"||!d)fail("Native resolved Fear effect receipt required.");
  const {effect_digest,...material}=d;
  if(hash(material)!==effect_digest||key!==`pvp-fear-effect:${d.trigger}`||row.visibility!==d.visibility
    ||row.subject_key!==d.subject_key||row.source_event!==d.source_event)fail("Fear effect receipt integrity/audience changed.");
  const {t}=triggerProof(db,guild,d.trigger,{allowResolved:true});
  if(t.status!=="resolved"||t.data.effect!==key||t.data.decision!==d.decision)fail("Fear trigger/effect ancestry changed.");
  decisionProof(db,guild,t,d.decision);contextProof(db,guild,d.context);
  const s=db.getWorldEvent(guild,d.source_event);
  if(s?.status!=="active"||hash(s.details)!==d.source_hash)fail("Fear scene source revoked.");
  for(const ref of d.native_mutation_refs){const m=db.getMutation(guild,ref);
    if(!m||m.source_layer!=="pvp_fear"||hash(JSON.parse(m.before_json))!==hash(d.before)||hash(JSON.parse(m.after_json))!==hash(d.after)
      ||JSON.parse(m.payload_json).trigger!==d.trigger||JSON.parse(m.payload_json).decision!==d.decision)
      fail("Exact native Fear mutation receipt required.");}
  if(d.move_kind==="npc_prepare"){
    const action=db.getSimulationRecord(guild,d.npc_action_ref),m=db.getMutation(guild,d.npc_mutation_ref);
    if(action?.kind!=="action"||action.status!=="completed"||hash(action)!==d.npc_action_hash
      ||action.data.actor_type!=="npc"||action.data.actor_key!==d.target||action.data.type!=="prepare"
      ||action.data.cycle_key!==`pvp-fear:${d.trigger}`||m?.source_layer!=="npc_director"||m.entity_key!==action.id
      ||m.mutation_type!=="npc_action:prepare"||hash(JSON.parse(m.after_json))!==hash(action))
      fail("Exact native NPC action/receipt ancestry required.");
  }
  return row;
}
export function renderFearEffect(db,guild,key,scope){
  const row=validateFearEffect(db,guild,key),d=row.data;
  if(row.visibility!=="party"&&!(row.visibility==="character"&&scope.mode==="private"&&row.subject_key===scope.actorCharacterId))
    fail("Fear consequence is not authorized for this output audience.");
  return d.move_kind==="clock_advance"?`An established scene countdown advanced by one step (${d.after.value}/${d.after.max_value}).`
    :d.move_kind==="npc_prepare"?"An established adversary has taken an immediate native preparation action. No PC response or damage is implied."
      :"An established local entrance is now locked. No character action or reaction is implied.";
}
export function fearInbox(db,guild,user,{gm=false}={}){
  gmOnly(gm,user);
  return {pending:all(db,guild,"pvp_fear_trigger").filter(t=>t.status!=="resolved"),
    contexts:all(db,guild,"pvp_fear_context").filter(c=>c.status==="active").map(c=>({...c,target_revision:hash(target(db,guild,c))}))};
}
/** This records a failed authority/precondition check; it NEVER forgives a genuine obligation or hides the error. */
function holdForReview(db,guild,user,key,error){
  if(error.code!=="NARRATIVE_PVP")return;
  const t=db.getCityRecord(guild,"pvp_fear_trigger",key);
  if(!t||["resolved","awaiting_pair"].includes(t.status))return;
  db.transaction(()=>{
    const data={trigger:key,revision:t.data.revision,reviewed_by:user,reason:error.message,canonical:false};
    db.audit(guild,t.data.session,"human_gm",user,"pvp_fear_needs_review",data);
    db.saveCityRecord(guild,{...t,key:t.record_key,status:"needs_review",data:{...t.data,revision:t.data.revision+1,
      review_reason:error.message}});
  });
}
/** Repair selection only after current dice/owner/source proof succeeds. No waiver, source restoration, or PC authorship. */
export function reconcileFearMove(db,guild,user,input,{gm=false,interactionId}={}){
  gmOnly(gm,user);closed(input,["trigger","expected_revision"]);
  if(!interactionId||typeof interactionId!=="string")fail("Native recovery interaction required.");
  return db.transaction(()=>{
    const {t,p}=triggerProof(db,guild,input.trigger);
    if(t.data.revision!==input.expected_revision||!["needs_review","move_selected","executing"].includes(t.status))
      fail("Current held Fear revision required; no automatic waiver or execution.");
    if(db.getCityRecord(guild,"pvp_fear_effect_receipt",`pvp-fear-effect:${t.record_key}`))
      fail("Saved effect requires publication-only recovery; never reselect or execute.");
    if(t.status==="executing"){
      const decision=decisionProof(db,guild,t,t.data.decision),context=contextProof(db,guild,decision.data.context);
      if(hash(target(db,guild,context))!==decision.data.expected_target_revision
        ||context.data.move_kind==="npc_prepare"&&hash(npcPreparation(db,guild,context.data.target_key,context.location_key,context.visibility))!==decision.data.native_context_hash)
        fail("Interrupted executing state changed; audited native-effect investigation required.");
    }
    const details={version:1,trigger:t.record_key,revision:t.data.revision,reviewer:user,previous_status:t.status,
      previous_decision:t.data.decision||null,disposition:"reselect_current_native_context_no_effect_waived"};
    const s=indexWorldEvent(db,guild,{key:`pvp-fear-recovery:${hash([guild,user,interactionId])}`,kind:"pvp_fear_recovery",
      source_id:`gm:${user}`,visibility:"gm",title:"Authenticated Fear selection recovery",scene:p.data.scene,session_id:p.data.session_id,details},user);
    if(s.status!=="active"||hash(s.details)!==hash(details))fail("Recovery interaction/revision changed.");
    const decision=t.data.decision&&db.getCityRecord(guild,"pvp_fear_move_decision",t.data.decision);
    if(decision)db.saveCityRecord(guild,{...decision,key:decision.record_key,status:"superseded"});
    db.saveCityRecord(guild,{kind:"pvp_fear_recovery",key:s.event_key,source_event:s.event_key,visibility:"gm",data:details});
    return db.saveCityRecord(guild,{...t,key:t.record_key,status:"awaiting_move",data:{...t.data,
      decision:null,review_reason:null,revision:t.data.revision+1}});
  });
}
