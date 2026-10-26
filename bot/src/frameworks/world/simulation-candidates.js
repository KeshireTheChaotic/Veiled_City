/** Original actor-specific read-only candidate packets; no objective secret or new execution grant. */
import {actorState} from './actor-state.js';
import {worldActorControl,npcAvailability} from './execution-source.js';
import {activeCityProxy} from './active-proxy.js';
import {ACTION_COSTS as COSTS} from './action-costs.js';
import {keyOf,intersects} from './simulation-query-primitives.js';
import {worldNpcCognition} from './contracts/npc-cognition.js';
import {worldKnowledgeClusters} from './contracts/knowledge-clusters.js';
const retrieveNpcCognition=(...args)=>worldNpcCognition.retrieveNpcCognition(...args);
const clusterContext=(...args)=>worldKnowledgeClusters.clusterContext(...args);
function actorMemories(db,guildId,actor,query){
  if(actor.type==="npc") return retrieveNpcCognition(db,guildId,{query,npcKey:actor.key,maxNpcs:1,recordRecall:false})
    .find(packet=>packet.npc_key===actor.key)?.memories||[];
  const tick=db.getSimulationClock(guildId).tick;
  const rank=row=>{
    const importance=Number(row.data.importance||50);
    const recency=Math.max(0,20-Math.max(0,tick-Number(row.data.created_tick||0))*(importance>=80?0.05:0.5));
    return importance+recency+Math.min(10,Number(row.data.recall_count||0)*1.5)+(intersects(query,row.data.content)?50:0);
  };
  return db.listSimulationRecords(guildId,{kind:"memory",entityKey:keyOf(actor.type,actor.key),status:"active",limit:100})
    .sort((a,b)=>rank(b)-rank(a)).slice(0,10).map(row=>({...row.data,id:row.id}));
}

function goalsFor(db,guildId,type,key){
  if(type==="npc") return db.listNpcGoals(guildId,key,{status:"active",limit:30});
  return db.listSimulationRecords(guildId,{kind:"goal",entityKey:keyOf(type,key),status:"active",limit:30})
    .map(row=>({...row.data,goal_key:row.id})).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0));
}

/** Build bounded, actor-specific knowledge packets. Objective hidden facts are never injected here. */
export function simulationCandidates(db,guildId,{layer,query=""}={}){
  const density=db.getCityCalendar(guildId).flags.activity_density===true,selection=density?db.densityActorSelection(guildId,query):[];
  const npcs=(density?selection.filter(row=>row.type==="npc").map(row=>db.getNpcProfile(guildId,row.actor_key)):db.listNpcProfiles(guildId,{limit:500}))
    .map(profile=>({type:"npc",key:profile.npc_key,profile,wake:selection.some(row=>row.type==="npc"&&row.actor_key===profile.npc_key&&row.wake)}));
  const factions=(density?selection.filter(row=>row.type==="faction").map(row=>db.getSimulationEntity(guildId,"faction",row.actor_key))
    :db.listSimulationEntities(guildId,"faction")).map(row=>({type:"faction",key:row.entity_key,profile:row.state}));
  const packets=[...npcs,...factions].map(actor=>{
    const configured=db.getSimulationEntity(guildId,actor.type,actor.key)?.state;
    const state=actorState(db,guildId,actor.type,actor.key);
    state.activity_tier=configured?.activity_tier||actor.profile.activity_tier||state.activity_tier;
    state.personality={...actor.profile.decision_profile,...state.personality};
    const goals=goalsFor(db,guildId,actor.type,actor.key).filter(goal=>{
      const dependencies=goal.dependencies||[];
      return dependencies.every(dependency=>actor.type==="npc"
        ?db.listNpcGoals(guildId,actor.key,{limit:200}).some(g=>g.goal_key===dependency&&g.status==="completed")
        :db.getSimulationRecord(guildId,dependency)?.status==="completed");
    });
    const relevant=intersects(query,JSON.stringify([actor.key,goals,state.location_key]));
    const affordable=!density||goals.some(goal=>Object.entries(COSTS).some(([method,resource])=>state.resources[resource]>0
      &&(!(goal.acceptable_methods||[]).length||goal.acceptable_methods.includes(method))));
    const eligible=worldActorControl(db,guildId,actor.type,actor.key)==='ai_world'&&!(actor.type==="npc"&&activeCityProxy(db,guildId,actor.key))&&!state.removed&&(state.activity_tier!=="dormant"||actor.wake)&&goals.length&&affordable&&
      (actor.wake||state.activity_tier==="active"||(state.activity_tier==="supporting"&&relevant)||layer==="downtime");
    return {...actor,state,goals,eligible};
  }).filter(actor=>actor.eligible).sort((a,b)=>Number(b.goals[0]?.priority||0)-Number(a.goals[0]?.priority||0)).slice(0,8).map(actor=>{
    const {state,goals}=actor;
    const awareness=db.listSimulationRecords(guildId,{kind:"awareness",entityKey:keyOf(actor.type,actor.key),limit:50});
    const knowledge=actor.type==="npc"?db.listNpcKnowledge(guildId,actor.key,{limit:50}):awareness.map(row=>row.data);
    const obligations=db.listSimulationRecords(guildId,{kind:"obligation",status:"active",limit:100})
      .filter(row=>[row.data.debtor,row.data.creditor].includes(keyOf(actor.type,actor.key)));
    return {...actor,state,goals,knowledge,awareness,obligations,memories:actorMemories(db,guildId,actor,query),
      memory_clusters:clusterContext(db,guildId,actor.type,actor.key,query),
      availability:actor.type==="npc"?npcAvailability(db,guildId,actor.key):null,
      location:db.getSimulationEntity(guildId,"location",state.location_key)?.state||{},
      relationships:density?db.actorSimulationRelations(guildId,keyOf(actor.type,actor.key)):db.listSimulationEntities(guildId,"relationship").filter(row=>
        [row.state.from,row.state.to].includes(keyOf(actor.type,actor.key))).map(row=>row.state)};
  });
  if(!density) return packets;
  let size=2;
  return packets.filter(packet=>{const length=JSON.stringify(packet).length+1;if(length>12000||size+length>24000) return false;size+=length;return true;}).slice(0,4);
}
