/** Original native NPC/faction outcome executor; costs, dice and immutable receipts remain native and transactional. */
import {randomInt} from 'node:crypto';
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
import {saveRecord} from './simulation-record.js';
import {actorState} from './actor-state.js';
import {ACTION_COSTS as COSTS} from './action-costs.js';
import {knownInformation,validateAction} from './action-eligibility.js';
import {assertQueuedCompatibility} from './execution-source.js';
import {commitWorldInformationTransfer} from './information-transfer.js';
import {applyNpcServiceOutcome} from './infrastructure.js';
import {indexWorldEvent} from './city-calendar.js';
import {worldSessionScene} from './contracts/session-scene.js';
const currentScene=(...args)=>worldSessionScene.currentScene(...args);
const reconcileSceneArrival=(...args)=>worldSessionScene.reconcileSceneArrival(...args);
const keyOf=(type,key)=>`${type}:${key}`;
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const text=(value)=>String(value||"").trim();
function remember(db,guildId,type,key,content,{source="witnessed",confidence=90,importance=60,subjectType="entity",subjectKey="",sourceRef=""}={}){
  if(type==="npc"){
    const row=db.addNpcMemory(guildId,{npcKey:key,content,sourceType:source,confidence,importance,subjectType,subjectKey,sourceRef});
    db.annotateNpcMemory(guildId,row.id,{sessionId:db.getActiveSession(guildId)?.id||null,
      scene:db.getActiveSession(guildId)?.id?db.getDirectorState(db.getActiveSession(guildId).id).scene_label||"":"",
      tick:db.getSimulationClock(guildId).tick});
    return row;
  }
  return db.putSimulationRecord(guildId,{kind:"memory",entityKey:keyOf(type,key),
    data:{content,source_type:source,confidence,importance,subject_type:subjectType,subject_key:subjectKey,source_ref:sourceRef,
      created_tick:db.getSimulationClock(guildId).tick}});
}

function persistNativeInformationTransfer(db,guild,proof,action){
  if(proof.status!=='verified_native_transfer')return;
  const report=proof.report,type=action.target_type,key=action.target_key;
  const previous=knownInformation(db,guild,type,key,report.information_key);
  if(previous&&(['known','confirmed'].includes(previous.belief_state)||Number(previous.confidence||0)>=report.confidence))return;
  db.putSimulationRecord(guild,{kind:'awareness',entityKey:keyOf(type,key),data:report});
  if(type==='npc')db.upsertNpcKnowledge(guild,{npcKey:key,knowledgeKey:report.information_key,content:report.content,
    beliefState:report.belief_state,confidence:report.confidence,sourceType:report.source_type,sourceRef:proof.source_ref,isSecret:true});
}

/** Application-generated opposed results, including resource, position, and preparation constraints. */
export function executeNpcAction(db,guildId,record,{approved=false,roll=()=>randomInt(1,21)}={}){
  return db.transaction(()=>{
    const current=db.getSimulationRecord(guildId,record.id);
    if(!current||current.kind!=="action") throw new Error("Action not found.");
    if(["completed","failed","rejected"].includes(current.status)) return current;
    if(current.status==="pending"&&!approved) return current;
    const action=current.data;
    assertQueuedCompatibility(db,guildId,current);
    const {key,state,goal}=validateAction(db,guildId,action);
    if(action.significance!=="routine"&&!approved) return saveRecord(db,guildId,current,{status:"pending"});
    const clock=db.getSimulationClock(guildId);
    if((current.due_tick!==null&&current.due_tick>clock.tick)||(current.due_minute!==null&&current.due_minute>clock.minute))
      return saveRecord(db,guildId,current,{status:"scheduled"});
    const resource=COSTS[action.type];
    if(state.resources[resource]<1) return saveRecord(db,guildId,current,{status:"failed",data:{...action,failure:"Insufficient resources"}});
    const target=["npc","faction"].includes(action.target_type)?actorState(db,guildId,action.target_type,action.target_key):null;
    const attackRoll=roll(),defenseRoll=target?roll():10;
    if(![attackRoll,defenseRoll].every(n=>Number.isInteger(n)&&n>=1&&n<=20)) throw new Error("Resolution dice must be from 1 to 20.");
    const conditionPenalty=actor=>Math.min(10,Math.floor((actor.resources.wounds+actor.resources.stress)/2));
    const attack=attackRoll+Math.min(5,state.resources[resource])+Number(state.preparation||0)+Number(state.position||0)+Number(state.traits||0)-conditionPenalty(state);
    const defense=defenseRoll+(target?Math.min(5,target.resources[resource])+Number(target.preparation||0)+Number(target.position||0)+Number(target.traits||0)-conditionPenalty(target):0);
    const success=attack>=defense;
    state.resources[resource]--;
    state.resources.stress=bounded(state.resources.stress+(success?0:1),0,100);
    if(action.type==="travel"&&success) state.location_key=action.location_key||action.target_key;
    if(action.type==="prepare"&&success) state.preparation=bounded(state.preparation+1,0,5);
    if(action.type==="acquire"&&success) state.resources.materials=bounded(state.resources.materials+1,0,100);
    if(action.type==="recruit"&&success) state.resources.manpower=bounded(state.resources.manpower+1,0,100);
    if(action.type==="hide"&&success) state.position=bounded(state.position+1,0,5);
    db.setSimulationEntity(guildId,action.actor_type,key,state);
    const result={success,attack_roll:attackRoll,defense_roll:defenseRoll,attack,defense,resource_cost:{[resource]:1}};
    if(action.information_key&&(db.getCityCalendar(guildId).flags.audience_influence===true
      ||['contact','negotiate','request_favor'].includes(action.type))){
      const known=knownInformation(db,guildId,action.actor_type,key,action.information_key);
      result.information_source=known?{source_ref:known.source_ref,content:known.content,belief_state:known.belief_state}:null;
    }
    const content=`${action.type} ${action.target_key||action.location_key||""}: ${success?"succeeded":"did not succeed"}. ${action.rationale||""}`;
    const civicTarget=["institution","community","audience"].includes(action.target_type);
    remember(db,guildId,action.actor_type,key,content,{sourceRef:current.id,subjectType:civicTarget?"entity":action.target_type||"entity",
      subjectKey:civicTarget?`${action.target_type}:${action.target_key}`:action.target_key||""});
    if(target&&["attack","protect","threaten","negotiate","contact"].includes(action.type))
      remember(db,guildId,action.target_type,action.target_key,content,{sourceRef:current.id,subjectType:action.actor_type,subjectKey:key});
    if(success){
      applyActionConsequences(db,guildId,action,{key,state,target,goal,content,actionId:current.id});
      if(approved&&action.significance!=="routine") applyConsequentialAction(db,guildId,action,current.id);
      if(action.actor_type==="npc") db.upsertNpcGoal(guildId,{npcKey:key,goalKey:goal.goal_key,title:goal.title,objective:goal.objective,
        horizon:goal.horizon,priority:goal.priority,progress:bounded(goal.progress+10,0,100),status:goal.progress>=90?"completed":"active",
        dependencies:goal.dependencies,acceptableMethods:goal.acceptable_methods,rationale:content,source:"npc_director"});
      else {
        const old=db.getSimulationRecord(guildId,goal.goal_key);
        saveRecord(db,guildId,old,{status:Number(goal.progress||0)>=90?"completed":"active",data:{...old.data,progress:bounded(Number(goal.progress||0)+10,0,100)}});
      }
      // A durable hook is delivered only through the normal publishing boundary.
      if(action.public_hook){
        const scene=db.getActiveSession(guildId)?currentScene(db,guildId):null;
        db.putSimulationRecord(guildId,{kind:"hook",entityKey:current.id,status:"ready",
          data:{content:action.public_hook,target_user_id:action.private_user_id||"",visibility:action.private_user_id?"player":"party",action_id:current.id,
            source_context:scene?{session:scene.session_id,scene:scene.key}:null}});
      }
    }
    const completed=saveRecord(db,guildId,current,{status:"completed",data:{...action,result}});
    const mutation=db.recordMutation(guildId,{actorType:"ai",actorId:key,sourceLayer:"npc_director",mutationType:`npc_action:${action.type}`,
      entityKey:current.id,visibility:"gm",before:current,after:completed,rationale:content,payload:result});
    if(success&&action.information_key&&['contact','negotiate','request_favor'].includes(action.type)
      &&['npc','faction'].includes(action.target_type)){
      const transfer=commitWorldInformationTransfer(db,guildId,current.id);
      persistNativeInformationTransfer(db,guildId,transfer,action);
    }
    if(success) applyNpcServiceOutcome(db,guildId,action,mutation);
    if(success&&action.type==="travel"&&action.actor_type==="npc"&&db.getCityCalendar(guildId).flags.scene_continuity===true
      &&db.getActiveSession(guildId)){
      const event=indexWorldEvent(db,guildId,{key:`travel:${current.id}`,kind:"travel",title:"Completed native NPC travel",
        source_kind:"mutation",source_id:mutation.id,location_key:state.location_key,
        details:{entity_type:"npc",entity_key:key}},"native_resolver");
      reconcileSceneArrival(db,guildId,{type:"npc",key,source_event:event.event_key});
    }
    return completed;
  });
}

function applyActionConsequences(db,guildId,action,{key,state,target,goal,content,actionId}){
  const actor=keyOf(action.actor_type,key);
  if(target&&["attack","protect","threaten","negotiate","betray","contact"].includes(action.type)){
    if(action.type==="attack") target.resources.wounds=bounded(target.resources.wounds+1,0,100);
    if(action.type==="protect") target.position=bounded(target.position+1,0,5);
    db.setSimulationEntity(guildId,action.target_type,action.target_key,target);
    const dimension={attack:"fear",threaten:"fear",betray:"suspicion",protect:"trust",negotiate:"trust",contact:"trust"}[action.type];
    const existing=db.findRelationship(guildId,{fromType:action.target_type,fromKey:action.target_key,toType:action.actor_type,toKey:key,relationshipType:dimension});
    db.upsertRelationship(guildId,{fromType:action.target_type,fromKey:action.target_key,toType:action.actor_type,toKey:key,
      relationshipType:dimension,score:bounded(Number(existing?.score||0)+1,-5,5),visibility:"gm",note:content,source:"npc_director"});
  }
  if(["investigate","observe"].includes(action.type)){
    const location=action.location_key||state.location_key;
    const residues=db.listSimulationRecords(guildId,{kind:"residue",entityKey:location,status:"active",limit:30});
    for(const residue of residues.slice(0,3)) for(const evidence of residue.data.evidence.slice(0,3)){
      if(typeof evidence!=="string") continue;
      const informationKey=`residue:${residue.id}:${normalizeNpcKey(evidence).slice(0,60)}`;
      db.putSimulationRecord(guildId,{kind:"awareness",entityKey:actor,
        data:{information_key:informationKey,content:evidence,confidence:85,source_type:"witnessed",source_ref:residue.id}});
      if(action.actor_type==="npc") db.upsertNpcKnowledge(guildId,{npcKey:key,knowledgeKey:informationKey,content:evidence,
        beliefState:"suspected",confidence:85,sourceType:"witnessed",sourceRef:residue.id,isSecret:true});
    }
    db.upsertThread(guildId,{id:`npc-investigation:${actor}:${goal.goal_key}`,label:goal.objective,status:"active",visibility:"gm",
      notes:`NPC investigation; player knowledge is separate. ${content}`});
  }
  if(action.hypothesis&&action.actor_type==="npc"&&["investigate","observe","research"].includes(action.type)){
    const supported=action.information_key||db.listSimulationRecords(guildId,{kind:"awareness",entityKey:actor,limit:100})
      .some(row=>row.data.source_type==="witnessed");
    if(supported) db.upsertNpcKnowledge(guildId,{npcKey:key,knowledgeKey:`hypothesis:${actionId}`,content:text(action.hypothesis).slice(0,1000),
      beliefState:"suspected",confidence:60,sourceType:"inferred",sourceRef:actionId,isSecret:true});
  }
  if(["repair","sabotage"].includes(action.type)&&action.location_key){
    const location=db.getSimulationEntity(guildId,"location",action.location_key)?.state||{};
    db.setSimulationEntity(guildId,"location",action.location_key,{...location,
      incidents:[...(location.incidents||[]).slice(-19),{action_id:actionId,type:action.type,content}],
      minor_damage:bounded(Number(location.minor_damage||0)+(action.type==="repair"?-1:1),0,5)});
  }
  if(action.obligation_id&&["fulfill_obligation","request_favor"].includes(action.type)){
    const obligation=db.getSimulationRecord(guildId,action.obligation_id);
    if(action.type==="fulfill_obligation"&&obligation.data.debtor!==actor) throw new Error("Only the debtor can fulfill this obligation.");
    if(action.type==="request_favor"&&obligation.data.creditor!==actor) throw new Error("Only the creditor can call in this obligation.");
    saveRecord(db,guildId,obligation,{status:action.type==="fulfill_obligation"?"fulfilled":"active",
      data:{...obligation.data,lifecycle:action.type==="fulfill_obligation"?"fulfilled":"called_in"}});
  }
  if(action.rumor_id){
    const rumor=db.getSimulationRecord(guildId,action.rumor_id);
    const data={...rumor.data,holders:[...rumor.data.holders]};
    if(action.type==="suppress_rumor") data.credibility=bounded(data.credibility-15,0,100);
    if(action.type==="verify_rumor"){
      const evidence=knownInformation(db,guildId,action.actor_type,key,action.information_key||data.subject);
      const corroborated=evidence?.belief_state==="known"&&text(evidence.content).toLowerCase()===text(data.content).toLowerCase();
      data.verification={status:corroborated?"subjectively_corroborated":"unresolved",source_key:action.information_key||data.subject,
        actor,action_id:actionId};
      if(corroborated) data.credibility=Math.min(95,Math.max(data.credibility,evidence.confidence));
    }
    if(["spread_rumor","weaponize_rumor"].includes(action.type)&&action.target_key){
      const holder=keyOf(action.target_type,action.target_key);
      if(!data.holders.includes(holder)) data.holders.push(holder);
      data.distortion=bounded(data.distortion+1,0,100);
      data.credibility=bounded(data.credibility-5,0,100);
      if(action.target_type==="npc") db.upsertNpcKnowledge(guildId,{npcKey:action.target_key,knowledgeKey:`rumor:${rumor.id}`,
        content:data.content,beliefState:"rumor",confidence:data.credibility,sourceType:"rumor",sourceRef:actor,isSecret:true});
      if(action.target_type==="npc") remember(db,guildId,"npc",action.target_key,`Heard a rumor: ${data.content}`,
        {source:"rumor",confidence:data.credibility,importance:40,sourceRef:actor});
      if(action.type==="weaponize_rumor") data.weaponizations=[...(data.weaponizations||[]),{actor,target:holder,action_id:actionId}];
    }
    saveRecord(db,guildId,rumor,{data});
  }
}

export function submitNpcAction(db,guildId,action,{cycleKey="manual",approved=false,roll}={}){
  return db.transaction(()=>{
    const normalized={...action,actor_key:normalizeNpcKey(action.actor_key),significance:action.significance||"routine"};
    validateAction(db,guildId,normalized);
    const clock=db.getSimulationClock(guildId);
    const delayed=Boolean(action.delay_ticks||action.delay_minutes);
    const row=db.putSimulationRecord(guildId,{kind:"action",entityKey:keyOf(normalized.actor_type,normalized.actor_key),
      status:normalized.significance!=="routine"&&!approved?"pending":delayed?"scheduled":"ready",
      dueTick:action.delay_ticks?clock.tick+action.delay_ticks:null,dueMinute:action.delay_minutes?clock.minute+action.delay_minutes:null,
      data:{...normalized,cycle_key:cycleKey}});
    return executeNpcAction(db,guildId,row,{approved,roll});
  });
}

export function resolveNpcAction(db,guildId,id,{decision,patch={},roll,actorId="gm"}={}){
  return db.transaction(()=>{
    const row=db.getSimulationRecord(guildId,id);
    if(!row||row.kind!=="action"||!["pending","deferred"].includes(row.status)) throw new Error("Pending consequential action not found.");
    db.recordMutation(guildId,{actorType:"human_gm",actorId,sourceLayer:"npc_director_review",
      mutationType:`npc_review:${decision}`,entityKey:id,before:row,payload:{decision,patch}});
    if(decision==="reject") return saveRecord(db,guildId,row,{status:"rejected"});
    if(decision==="defer") return saveRecord(db,guildId,row,{status:"deferred"});
    if(!["approve","modify"].includes(decision)) throw new Error("Choose approve, modify, defer, or reject.");
    const modified={...row.data,...patch,approved:true,reviewed_by:actorId};
    if(modified.actor_key!==row.data.actor_key||modified.actor_type!==row.data.actor_type) throw new Error("Review cannot substitute a different actor.");
    validateAction(db,guildId,modified);
    const clock=db.getSimulationClock(guildId);
    saveRecord(db,guildId,row,{data:modified,status:"ready",
      dueTick:Object.hasOwn(patch,"delay_ticks")?(patch.delay_ticks?clock.tick+patch.delay_ticks:null):row.due_tick,
      dueMinute:Object.hasOwn(patch,"delay_minutes")?(patch.delay_minutes?clock.minute+patch.delay_minutes:null):row.due_minute});
    return executeNpcAction(db,guildId,row,{approved:true,roll});
  });
}

export function processSimulationEvents(db,guildId,{roll,maxActions=4}={}){
  return db.listDueSimulationActions(guildId).slice(0,maxActions)
    .map(row=>{
      try{return executeNpcAction(db,guildId,row,{approved:row.data.approved===true,roll});}
      catch(error){return saveRecord(db,guildId,row,{status:"failed",data:{...row.data,failure:error.message}});}
    });
}

function applyConsequentialAction(db,guildId,action,actionId){
  if(action.significance==="major_npc_removal"){
    if(action.target_type!=="npc") throw new Error("Named NPC removal requires an NPC target.");
    const state=actorState(db,guildId,"npc",action.target_key);
    db.setSimulationEntity(guildId,"npc",action.target_key,{...state,removed:true,removal_reason:action.rationale,reviewed_action:actionId});
  }else if(action.significance==="major_location_destruction"||action.significance==="supernatural_disaster"){
    if(!action.location_key) throw new Error("Major location consequences require a location key.");
    const state=db.getSimulationEntity(guildId,"location",action.location_key)?.state||{};
    db.setSimulationEntity(guildId,"location",action.location_key,{...state,
      [action.significance==="major_location_destruction"?"destroyed":"supernatural_disaster"]:true,reviewed_action:actionId});
  }else if(action.significance==="faction_transformation"){
    if(action.target_type!=="faction") throw new Error("Faction transformation requires a faction target.");
    const state=actorState(db,guildId,"faction",action.target_key);
    db.setSimulationEntity(guildId,"faction",action.target_key,{...state,policy:action.rationale,reviewed_action:actionId});
  }else if(action.significance==="campaign_secret"){
    const known=knownInformation(db,guildId,action.actor_type,action.actor_key,action.information_key);
    if(!known) throw new Error("Actor cannot reveal a secret they do not know.");
    db.addFact(guildId,{key:action.information_key,category:known.belief_state==="rumor"?"rumor":"clue",content:known.content,
      visibility:"party",source:"gm_approved_npc_report",confidence:known.confidence,provenance:{reviewed_action:actionId,subjective:true}});
  }
}
export {remember as recordWorldActorMemory};
