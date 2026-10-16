/** Durable native AI-GM capability inspection. No model role, approval flag or simulation score grants execution. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {activeCityProxy} from './city-constraints.js';
import {consentAction,historicalActionSource} from './action-consent.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {scenePresence} from './scene-continuity.js';
import {actorReferenceVisible} from './npc-cognition-projection.js';

export function inspectNativeGmDecision(db,guild,key){
  const row=db.getCityRecord(guild,'gm_arbitration_decision',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),
    board=d&&db.getCityRecord(guild,'scene_intent_board',d.board),boardSource=board&&db.getWorldEvent(guild,board.source_event);
  if(!d||row.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'
    ||source.details.payload_hash!==hash(d)||boardSource?.status!=='active'||boardSource.kind!=='native_scene_intent_board'
    ||boardSource.source_id!=='native:unified-gm'||boardSource.details.payload_hash!==hash(board.data)
    ||d.proposal_hash!==hash(d.proposal)||db.getCityCalendar(guild).flags.gm_discretion!==true
    ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')throw fail('native_decision_provenance');
  const entry=board.data.entries.find(e=>e.intent_ref===d.entry);
  const current=buildNarrativeContext(db,guild,d.scope,d.origin.source);
  if(!entry||d.entry_hash!==hash(entry)||hash(current.binding)!==hash(d.origin))throw fail('decision_source_scene_or_owner');
  if(entry.actor.type==='npc'&&(activeCityProxy(db,guild,entry.actor.key)||db.getSimulationEntity(guild,'npc',entry.actor.key)?.state.location_key!==d.origin.location))throw fail('npc_control_or_locality');
  if(entry.actor.type==='npc'){
    const npc=current.packet.npcs.find(n=>n.key===entry.actor.key),snapshot=hash([db.getSimulationEntity(guild,'npc',entry.actor.key),db.getNpcProfile(guild,entry.actor.key),
      scenePresence(db,guild,'npc',entry.actor.key),db.listNpcProxies(d.origin.session)]);
    if(!npc||npc.human_controlled||snapshot!==entry.snapshot||entry.knowledge_refs.some(ref=>!actorReferenceVisible(db,guild,entry.actor.key,ref,d.scope))
      ||entry.objective_ref&&!db.listNpcGoals(guild,entry.actor.key,{status:'active',limit:100}).some(g=>g.goal_key===entry.objective_ref))throw fail('npc_snapshot_objective_or_knowledge');
  }
  if(entry.actor.type==='character'){
    const accepted=db.getCityRecord(guild,'typed_intent',entry.intent_ref);
    (accepted?.status==='resolved'?historicalActionSource:consentAction)(db,guild,entry.intent_ref,{resolved:true});
  }
  return {row,entry,board};
}
/** Exact authenticated looking-to-GM input is an opportunity, not an automatic attack or Fear spend. */
export function nativeGmOpportunity(db,guild,board){
  const input=board.data.entries.find(e=>e.actor.type==='character'&&['describe_scene','current_situation','continuation'].includes(e.operation));
  if(input){
    const row=db.getCityRecord(guild,'typed_intent',input.intent_ref);
    if(row?.data.type==='other'&&row.data.framing==='immediate'&&row.data.resolution==='conversational'){
      (row.status==='resolved'?historicalActionSource:consentAction)(db,guild,row.record_key,{resolved:true});return {source:row.source_event,intent:row.record_key,key:`gm-opportunity:${hash([board.data.origin.source,board.data.origin.scene])}`};
    }
  }
  throw fail('native_spotlight_opportunity_missing');
}
/** Called inside the attack's native transaction, after defense checks, before RNG. */
export function commitGmActionCost(db,guild,decisionKey){
  const {row,entry,board}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native,opportunity=nativeGmOpportunity(db,guild,board);
  if(!['commit_adversary_attack','commit_exceptional_adversary_action'].includes(n?.operation)||hash(n.opportunity)!==hash(opportunity))throw fail('exact_spotlight_opportunity');
  const selected=new Set(db.listCityRecords(guild,{kind:'gm_arbitration_decision',includeGM:true,limit:200})
    .filter(r=>r.status==='gm_action_ready'&&r.data.board===board.record_key).map(r=>r.data.entry));
  const order=board.data.entries.filter(e=>selected.has(e.intent_ref)&&['attack','exceptional_action'].includes(e.operation)&&e.actor.type==='npc'),ordinal=order.findIndex(e=>e.intent_ref===entry.intent_ref);
  if(ordinal<0)throw fail('attack_spotlight_slot');
  const spotlight=ordinal===0?0:1,experience=n.experience?1:0;
  const key=`gm-action-cost:${hash([decisionKey,opportunity.key])}`,prior=db.getCityRecord(guild,'gm_action_cost_receipt',key),amount=spotlight+experience;
  if(prior){if(prior.source_event!==row.source_event||prior.data.amount!==amount||prior.data.decision!==decisionKey)throw fail('cost_receipt_changed');return prior;}
  const before=db.getCampaign(guild).fear;
  if(!Number.isSafeInteger(before)||before<amount||before>12)throw fail('insufficient_gm_fear');
  const after=amount?db.changeFear(guild,-amount):before;
  return db.saveCityRecord(guild,{kind:'gm_action_cost_receipt',key,status:'committed',source_event:row.source_event,visibility:'gm',
    data:{decision:decisionKey,opportunity:opportunity.key,ordinal,amount,before,after,expenses:{additional_spotlight:spotlight,feature:0,experience}}});
}
