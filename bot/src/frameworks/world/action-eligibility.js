/** Original native World action preconditions; a valid projection is never an execution or player grant. */
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {ACTION_TYPES,MAJOR_IMPACTS} from './action-catalog.js';
import {actorState} from './actor-state.js';
import {assertNpcAvailability,assertWorldActorControl} from './execution-source.js';
import {assertServiceAccess} from './civic-service-source.js';
import {inspectWorldInformationTransfer} from './information-transfer.js';
const keyOf=(type,key)=>`${type}:${key}`;
export function knownInformation(db,guildId,type,key,informationKey){
  if(!informationKey) return null;
  let known;
  if(type==="npc"){
    const knowledge=db.getNpcKnowledge(guildId,key,informationKey);
    if(knowledge&&knowledge.belief_state!=="unknown")known=knowledge;
  }
  known??=db.listSimulationRecords(guildId,{kind:"awareness",entityKey:keyOf(type,key),limit:1000})
    .find(row=>row.data.information_key===informationKey)?.data||null;
  const source=known?.source_ref&&db.getWorldEvent(guildId,known.source_ref);
  if(source?.kind==='native_world_information_transfer'){
    const proof=inspectWorldInformationTransfer(db,guildId,source.details?.receipt_ref,
      {recipientType:type,recipientKey:key,informationKey});
    if(proof.status!=='verified_native_transfer'||proof.report.content!==known.content
      ||proof.report.belief_state!==known.belief_state||proof.report.confidence!==known.confidence)return null;
  }
  return known;
}

export function validateAction(db,guildId,action){
  if(!ACTION_TYPES.includes(action.type)||!["npc","faction"].includes(action.actor_type)) throw new Error("Unknown autonomous action/actor type.");
  const key=normalizeNpcKey(action.actor_key);
  assertWorldActorControl(db,guildId,action.actor_type,key);
  if(action.actor_type==="npc"&&!db.getNpcProfile(guildId,key)) throw new Error("Autonomous NPC profile is missing.");
  if(action.actor_type==="npc") assertNpcAvailability(db,guildId,key,action);
  if(action.actor_type==="faction"&&!db.getSimulationEntity(guildId,"faction",key)) throw new Error("Autonomous faction is missing.");
  if(!["routine",...MAJOR_IMPACTS].includes(action.significance||"routine")) throw new Error("Invalid action significance.");
  for(const field of ["delay_ticks","delay_minutes"]){
    if(!Number.isSafeInteger(action[field]??0)||(action[field]??0)<0||(action[field]??0)>525600) throw new Error("Invalid fictional delay.");
  }
  const factionGoal=action.actor_type==="faction"?db.getSimulationRecord(guildId,action.goal_key):null;
  const goal=action.actor_type==="npc"?db.getNpcGoal(guildId,key,action.goal_key):factionGoal?.kind==="goal"
    &&factionGoal.entity_key===keyOf("faction",key)?{...factionGoal.data,goal_key:factionGoal.id,status:factionGoal.status}:null;
  if(!goal||goal.status!=="active") throw new Error("Autonomous action requires an active goal.");
  const dependenciesComplete=(goal.dependencies||[]).every(dependency=>action.actor_type==="npc"
    ?db.getNpcGoal(guildId,key,dependency)?.status==="completed"
    :db.getSimulationRecord(guildId,dependency)?.status==="completed");
  if(!dependenciesComplete) throw new Error("Goal dependencies are not completed.");
  const methods=(goal.acceptable_methods||[]).filter(method=>ACTION_TYPES.includes(method));
  if(methods.length&&!methods.includes(action.type)) throw new Error("Action violates the goal's acceptable methods.");
  const state=actorState(db,guildId,action.actor_type,key);
  const profile=action.actor_type==="npc"?db.getNpcProfile(guildId,key):{};
  const personality={...profile.decision_profile,...state.personality};
  if(state.removed) throw new Error("Removed actors cannot take autonomous actions.");
  if(["attack","sabotage","betray"].includes(action.type)&&Number(personality.violence_threshold??50)<60)
    throw new Error("NPC decision profile does not permit this aggressive action.");
  if(action.type==="betray"&&Number(personality.loyalty??50)>=70) throw new Error("Action conflicts with established loyalty.");
  if(action.information_key&&!knownInformation(db,guildId,action.actor_type,key,action.information_key))
    throw new Error("NPC cannot act on information it has not learned.");
  if(["spread_rumor","suppress_rumor","verify_rumor","weaponize_rumor"].includes(action.type)){
    const rumor=db.getSimulationRecord(guildId,action.rumor_id);
    if(!rumor||rumor.kind!=="rumor"||!rumor.data.holders?.includes(keyOf(action.actor_type,key))) throw new Error("Actor has not heard that rumor.");
  }
  if(action.obligation_id){
    const obligation=db.getSimulationRecord(guildId,action.obligation_id);
    if(!obligation||obligation.kind!=="obligation"||obligation.status!=="active"||
      ![obligation.data.debtor,obligation.data.creditor].includes(keyOf(action.actor_type,key))) throw new Error("Actor is not party to an active obligation.");
  }
  if(action.type==="fulfill_obligation"&&!action.obligation_id) throw new Error("Fulfilling an obligation requires its ID.");
  if(action.target_type==="character") throw new Error("Autonomous actions cannot choose PC actions or resolve attacks against PCs.");
  if(["institution","community","audience"].includes(action.target_type)){
    if(db.getCityCalendar(guildId).flags.audience_influence!==true||action.actor_type!=="npc"||!["contact","negotiate"].includes(action.type)
      ||!db.cityEdges(guildId,"channel").some(edge=>edge.from_key===`npc:${key}`&&edge.to_key===`${action.target_type}:${action.target_key}`))
      throw new Error("Civic contact needs opt-in influence, a legitimate NPC and an established channel.");
    if(action.target_type!=="audience"&&db.getCityRecord(guildId,action.target_type,action.target_key)?.status!=="active")
      throw new Error("Active civic contact recipient required.");
  }
  if(action.target_type===action.actor_type&&action.target_key===key) throw new Error("An opposed action cannot target its own actor.");
  if(action.target_type==="npc"&&!db.getNpcProfile(guildId,action.target_key)) throw new Error("Target NPC is missing.");
  if(['npc','faction'].includes(action.target_type))assertWorldActorControl(db,guildId,action.target_type,action.target_key);
  if(action.target_type==="npc"&&actorState(db,guildId,"npc",action.target_key).removed) throw new Error("Target NPC has been removed from play.");
  if(action.target_type==="faction"&&!db.getSimulationEntity(guildId,"faction",action.target_key)) throw new Error("Target faction is missing.");
  if(action.private_user_id&&!db.getPlayer(guildId,action.private_user_id)) throw new Error("Private hook recipient is not a campaign player.");
  if(["investigate","observe","sabotage","repair"].includes(action.type)&&action.location_key!==state.location_key)
    throw new Error("Actor must reach the location before acting there.");
  if(["attack","sabotage"].includes(action.type)&&Number(personality.risk_tolerance??50)<30)
    throw new Error("Action violates the NPC's established risk tolerance.");
  if(["sabotage","betray"].includes(action.type)&&Number(personality.lawfulness??50)>=80)
    throw new Error("Action violates the NPC's established lawfulness.");
  const location=db.getSimulationEntity(guildId,"location",action.location_key||state.location_key)?.state||{};
  if(action.type==="attack"&&Number(personality.collateral_aversion??50)>=80&&(location.witnesses||[]).length)
    throw new Error("Action conflicts with the NPC's collateral-damage boundary in an occupied location.");
  assertServiceAccess(db,guildId,{...action,actor_key:key,location_key:action.location_key||state.location_key});
  return {key,state,goal,personality};
}

