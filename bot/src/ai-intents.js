/** Shared governed intent pipeline: bound authority, closed contracts, atomic receipts and native domain adapters. */
import { createHash } from "node:crypto";
import { validateIntent, INTENT_PAYLOADS, intentOperations } from "./ai-intent-contracts.js";
import { requireCitySource } from "./city-core.js";
import { cityObject, cityInteger, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { proposeGoalTransition, reviewGoalTransition } from "./simulation-motivation.js";
import { recordScenePresence, scenePresence, sceneView } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { subscribeConsequence, reviewConsequence } from "./city-consequences.js";
import { actorSource } from "./simulation-motivation.js";
import { manageGroup } from "./city-groups.js";
import { manageStrategy } from "./simulation-strategy.js";
import { ContextPlanner } from "./context-planner.js";
import { proposeArcBeat } from "./personal-continuity.js";
import { manageLongProject, projectPhaseRevision, reconcileLongProject } from "./long-projects.js";
import { applicationPrincipal } from "./application-authority.js";
import { inspectNpcAction } from "./simulation.js";
import { inspectInstitutionAction } from "./city-core.js";
import { manageMemoryCluster, memoryMaintenanceCandidate } from "./memory-clusters.js";
import { encounterProposalContext, proposeWorldEncounter } from "./encounter.js";
import { interpretDialogue } from "./dialogue-continuity.js";
import { manageEvidence } from "./evidence-custody.js";
import { attemptCityInfluence } from "./city-civic.js";
import { inviteOrganization } from "./owned-community.js";
import { suggestSetupPayoff } from "./story-continuity.js";
import { reconcileHistory } from "./history-reconciliation.js";
import { prepareRollRequest } from "./roll-requests.js";
import { reviewRollDeclaration } from "./roll-language.js";
import { mundaneEntryImpact, resolveMundaneEntry } from "./scene-entry.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const adapters=new Map();
export const FEATURE_FLAGS={roll:"roll_requests",setup:"narrative_setups",organization:"player_organizations",influence:"audience_influence",evidence:"evidence_custody",dialogue:"dialogue_history",encounter:"encounter_intelligence",goal:"emergent_goals",consequence:"consequences",scene:"scene_continuity",group:"emergent_groups",
  strategy:"strategies",arc:"personal_arcs",discovery:"discovery",project:"long_projects",mediation:"conflict_mediation",
  memory:"memory_consolidation",density:"activity_density"};
export const stateRevision=row=>row?hash(row):"absent";
export function registerIntentAdapter(feature,adapter){adapters.set(feature,adapter);}
export function delegationPolicy(db,guild){
  return db.getCityRecord(guild,"ai_delegation","campaign")?.data||{mode:"manual",revision:0,allow:[],max_operations:1,max_cost:0,expires_minute:null};
}
export function configureDelegation(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).some(key=>!["mode","allow","max_operations","max_cost","expires_minute"].includes(key))) throw new Error("Invalid delegation configuration.");
  if(!["manual","suggest_only","routine_delegated"].includes(input.mode)||!Array.isArray(input.allow)||input.allow.length>40
    ||input.allow.some(op=>!Object.keys(INTENT_PAYLOADS).some(feature=>op.startsWith(`${feature}.`)
      &&intentOperations(feature).includes(op.slice(feature.length+1))))) throw new Error("Explicit typed operation allowlist required.");
  cityInteger(input.max_operations,1,4);cityInteger(input.max_cost,0,20);
  if(input.expires_minute!==null) cityInteger(input.expires_minute,db.getSimulationClock(guild).minute+1,1000000000);
  if(input.mode==="routine_delegated"&&input.expires_minute===null) throw new Error("Delegation requires an explicit fictional-time expiry.");
  return db.transaction(()=>{
    const before=db.getCityRecord(guild,"ai_delegation","campaign");
    const revision=(before?.data.revision||0)+1;
    const source=indexWorldEvent(db,guild,{key:`ai-policy:${revision}`,title:"Explicit GM delegation configuration",source_id:reviewer},reviewer);
    const after=db.saveCityRecord(guild,{kind:"ai_delegation",key:"campaign",source_event:source.event_key,data:{...input,revision,configured_by:reviewer}});
    cityAudit(db,guild,"ai_delegation","campaign",before,after,reviewer);return after;
  });
}
function preflight(db,guild,intent,context){
  if(!validateIntent(intent)) throw new Error("Invalid closed versioned intent contract.");
  if(context.scope?.mode==="private"&&!['arc','project','discovery','dialogue','organization','setup','roll'].includes(intent.feature)
    &&!(intent.feature==="scene"&&intent.payload.op==="enter")) throw new Error("Private scope cannot alter shared world state.");
  if(context.scope?.mode==="private"&&intent.feature==="setup"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private setup invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="organization"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private organization invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="dialogue"){
    const source=requireCitySource(db,guild,intent.payload.source_event);
    if(source.details.author!==context.scope.actorUserId||source.details.character_id!==context.scope.actorCharacterId)
      throw new Error("Private dialogue must belong to this authenticated character.");
  }
  if(db.getCityCalendar(guild).flags[FEATURE_FLAGS[intent.feature]]!==true) throw new Error("Feature is disabled.");
  if(db.isDirectorPaused(guild)) throw new Error("Director is paused.");
  for(const key of new Set([intent.payload.source_event,...intent.source_prerequisites])) requireCitySource(db,guild,key);
  const adapter=adapters.get(intent.feature);if(!adapter) throw new Error("Domain adapter is not available yet.");
  const before=adapter.current(db,guild,intent);
  if(stateRevision(before)!==intent.expected_revision) throw new Error("Stale target revision; propose again from current state.");
  const impact=adapter.impact(db,guild,intent,before,context);
  return {adapter,before,impact};
}
function decision(db,guild,intent,impact,budget){
  const policy=delegationPolicy(db,guild),minute=db.getSimulationClock(guild).minute;
  if(policy.revision!==intent.policy_revision) return {status:"blocked",reason:"Delegation policy changed."};
  if(policy.mode==="manual") return {status:"blocked",reason:"AI execution is not delegated."};
  if(policy.mode==="suggest_only"||impact.review||!policy.allow.includes(`${intent.feature}.${intent.payload.op}`))
    return {status:"pending",reason:impact.reason||"Human review or explicit delegation required."};
  if(policy.expires_minute===null||minute>=policy.expires_minute) return {status:"blocked",reason:"Delegation expired."};
  if(budget.operations>=policy.max_operations||budget.cost+impact.cost>policy.max_cost) return {status:"blocked",reason:"Delegated budget exhausted."};
  return {status:"accepted",reason:"Routine operation explicitly delegated."};
}
function saveReceipt(db,guild,key,intent,status,reason,context,extra={}){
  const source=validateIntent(intent)&&db.getWorldEvent(guild,intent.payload.source_event)?intent.payload.source_event
    :indexWorldEvent(db,guild,{key:`receipt:${hash(key).slice(0,32)}`,title:"Rejected AI proposal",source_id:context.origin||"ai_policy"},"ai_policy").event_key;
  const row=db.saveCityRecord(guild,{kind:"ai_intent",key,status,source_event:source,
    data:{intent,reason,scope:context.scope||{mode:"party"},origin:context.origin||"",session_id:context.sessionId||null,...extra}});
  cityAudit(db,guild,"ai_intent",key,null,row,"ai_policy");return row;
}
export function dispatchAiIntents(db,guild,intents=[],context={}){
  if(!Array.isArray(intents)||intents.length>4) throw new Error("At most four AI intents per opportunity.");
  const budget=context.budget||{operations:0,cost:0};
  return intents.map(intent=>{
    const key=`intent:${hash([guild,context.sessionId||null,context.origin||"",intent]).slice(0,48)}`;
    const previous=db.getCityRecord(guild,"ai_intent",key);if(previous) return previous;
    try{return db.transaction(()=>{
      const {adapter,before,impact}=preflight(db,guild,intent,context);
      let verdict=decision(db,guild,intent,impact,budget);
      if(context.deferred===true&&verdict.status==="accepted") verdict={status:"deferred",reason:"Fictional work slot exhausted; refresh or review later."};
      const result=verdict.status==="accepted"?adapter.apply(db,guild,intent,key,"ai_policy",context):null;
      if(verdict.status==="accepted"){budget.operations++;budget.cost+=impact.cost;}
      return saveReceipt(db,guild,key,intent,verdict.status,verdict.reason,context,{before,impact,result,policy_revision:delegationPolicy(db,guild).revision});
    });}catch(error){
      return saveReceipt(db,guild,key,validateIntent(intent)?intent:null,"blocked","Intent validation or domain prerequisites failed.",context,
        {diagnostic:String(error.message).slice(0,1000)});
    }
  });
}
export function reviewAiIntent(db,guild,{key,decision:response,expected_revision,replacement_intent=null},reviewer){
  if(!reviewer||!["approve","reject","defer","modify"].includes(response)) throw new Error("Authenticated GM review required.");
  const row=db.getCityRecord(guild,"ai_intent",key);
  if(!row||!["pending","blocked","deferred"].includes(row.status)||response==="approve"&&!row.data.intent) throw new Error("Reviewable intent required.");
  if(stateRevision(row)!==expected_revision) throw new Error("Inbox item changed; refresh before reviewing.");
  return db.transaction(()=>{
    if(response!=="approve"){
      if(response==="modify"&&!validateIntent(replacement_intent)) throw new Error("A complete closed replacement intent is required.");
      const after=db.saveCityRecord(guild,{...row,key,status:{reject:"rejected",defer:"deferred",modify:"pending"}[response],
        data:{...row.data,intent:response==="modify"?replacement_intent:row.data.intent,reviewed_by:reviewer,
          history:[...(row.data.history||[]).slice(-19),{decision:response,intent:row.data.intent,by:reviewer}]}});
      cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
    }
    const context={scope:row.data.scope,sessionId:row.data.session_id,origin:row.data.origin},intent=row.data.intent;
    const {adapter,before,impact}=preflight(db,guild,intent,context);
    if(intent.policy_revision!==delegationPolicy(db,guild).revision) throw new Error("Policy changed; request a fresh proposal.");
    const result=response==="approve"?adapter.apply(db,guild,intent,key,reviewer,context):null;
    const after=db.saveCityRecord(guild,{...row,key,status:response==="approve"?"accepted":"rejected",
      data:{...row.data,before,impact,result,reviewed_by:reviewer}});
    cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
  });
}
export function intentContext(db,guild){
  const scene=db.getActiveSession(guild)&&db.getCityCalendar(guild).flags.scene_continuity===true?sceneView(db,guild,{gm:true}):null;
  const packet={policy:delegationPolicy(db,guild),flags:db.getCityCalendar(guild).flags,
    scene_entries:db.listCityRecords(guild,{kind:"scene_entry",status:"pending",includeGM:true,limit:8}).map(row=>({...row,expected_revision:stateRevision(row)})),
    roll_declarations:db.getCityCalendar(guild).flags.roll_requests===true?db.listWorldEvents(guild,{includeGM:true,limit:100})
      .filter(row=>["player_declaration","roll_contribution"].includes(row.kind)&&row.status==="active"&&row.session_id===db.getActiveSession(guild)?.id)
      .slice(0,12).map(row=>({...row,expected_revision:stateRevision(row)})):[],
    roll_requests:db.getCityCalendar(guild).flags.roll_requests===true?db.listCityRecords(guild,{kind:"roll_request",includeGM:true,limit:12})
      .map(row=>({...row,expected_revision:stateRevision(row)})):[],
    scene:scene?{...scene,occupants:scene.occupants.slice(0,32),targets:scene.occupants.slice(0,32).map(row=>({
      entity_type:row.data.entity_type,entity_key:row.data.entity_key,expected_revision:stateRevision(row)}))}:null,
    goal_targets:db.listNpcProfiles(guild,{limit:32}).flatMap(npc=>db.listNpcGoals(guild,npc.npc_key,{limit:8})
      .map(row=>({actor_type:"npc",actor_key:npc.npc_key,goal_key:row.goal_key,expected_revision:stateRevision(row),state:row}))).slice(0,32),
    receipts:db.listCityRecords(guild,{kind:"ai_intent",includeGM:true,limit:12}).map(row=>({...row,expected_revision:stateRevision(row)})),
    causal_targets:["consequence","consequence_subscription"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    planning_targets:["group_transition","strategy"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    personal_targets:["arc","arc_candidate"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    organization_requests:db.listCityRecords(guild,{kind:"organization_request",includeGM:true,limit:8}).map(row=>({...row,expected_revision:stateRevision(row)})),
    owner_replies:db.getCityCalendar(guild).flags.natural_language===true?db.listCityRecords(guild,{kind:"consent_reply",includeGM:true,limit:8}):[],
    setup_targets:db.getCityCalendar(guild).flags.narrative_setups===true?db.listCityRecords(guild,{kind:"story_setup",status:"open",includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)})):[],
    reconciliation:reconcileHistory(db,guild),
    encounter_actors:encounterProposalContext(db,guild),
    influence_actions:db.getCityCalendar(guild).flags.audience_influence===true?db.listSimulationRecords(guild,{kind:"action",status:"completed",limit:12})
      .filter(row=>row.data.result?.information_source&&["contact","negotiate","spread_rumor","suppress_rumor"].includes(row.data.type)):[],
    evidence_targets:db.getCityCalendar(guild).flags.evidence_custody===true?db.listHandoutsFor(guild,"",{includeGM:true,limit:12})
      .filter(row=>row.metadata.evidence).map(row=>({handout_id:row.id,title:row.title,evidence:row.metadata.evidence,expected_revision:stateRevision(row.metadata.evidence)})):[],
    encounter_proposals:db.listCityRecords(guild,{kind:"encounter_proposal",status:"pending",includeGM:true,limit:8}),
    reviewed_templates:db.listCityRecords(guild,{kind:"seed_template",includeGM:true,limit:8}),
    project_targets:db.listCityRecords(guild,{kind:"long_project",includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row),phase_revision:projectPhaseRevision(row)})),
    group_actor_packets:db.listCityRecords(guild,{kind:"group_transition",status:"pending",includeGM:true,limit:4})
      .flatMap(row=>row.data.members.slice(0,4).map(member=>({proposal:row.record_key,member,
        packet:new ContextPlanner(db).plan(guild,{actorType:"npc",actorKey:member,query:row.source_event,maxTokens:400})}))),
    target_revision_rule:"Use the supplied state fingerprint; absent for a new target. Proposals are not effects."};
  const bounded={policy:packet.policy,flags:packet.flags,target_revision_rule:packet.target_revision_rule},omissions={};
  let chars=JSON.stringify(bounded).length;
  for(const [field,value] of Object.entries(packet)){
    if(field in bounded) continue;
    if(Array.isArray(value)){
      bounded[field]=[];
      for(const row of value){const size=JSON.stringify(row).length+1;if(chars+size>23500){omissions[field]=(omissions[field]||0)+1;continue;}
        bounded[field].push(row);chars+=size;}
    }else if(chars+JSON.stringify(value).length<23500){bounded[field]=value;chars+=JSON.stringify(value).length;}
    else omissions[field]=1;
  }
  bounded.context_metrics={max_chars:24000,estimated_chars:chars,omissions,authority:"Whole scoped records omitted; permission fields are never stripped."};
  return bounded;
}
registerIntentAdapter("roll",{
  current:(db,guild,intent)=>intent.payload.op==="adjudicate"?db.getWorldEvent(guild,intent.payload.source_event)
    :db.getCityRecord(guild,"roll_request",`roll:${intent.payload.source_event}`),
  impact:(db,guild,intent)=>({cost:0,review:intent.payload.op==="adjudicate",reason:intent.payload.op==="adjudicate"
    ?"Human feasibility/rules review of a captured exact owner preauthorization; no AI-supplied assent or auto spending."
    :"Private sheet-derived pending request only; never dice, PC spending or outcome."}),
  apply:(db,guild,intent,key,actor,context)=>intent.payload.op==="adjudicate"?reviewRollDeclaration(db,guild,intent.payload,actor,context)
    :prepareRollRequest(db,guild,intent.payload,actor,context)
});
registerIntentAdapter("setup",{
  current:(db,guild,intent)=>db.getCityRecord(guild,"story_setup",intent.payload.setup_key),
  impact:()=>({cost:0,review:false,reason:"GM-private optional sourced payoff proposal only; no automatic outcome, culprit or PC choice."}),
  apply:(db,guild,intent,key,actor)=>suggestSetupPayoff(db,guild,intent.payload,actor)
});
registerIntentAdapter("organization",{
  current:()=>null,
  impact:()=>({cost:0,review:false,reason:"Private nonbinding invitation only; actual owner confirmation and separate human native review required."}),
  apply:(db,guild,intent,key,actor)=>inviteOrganization(db,guild,{...intent.payload,key:intent.target_key||key},actor)
});
registerIntentAdapter("influence",{
  current:(db,guild,intent)=>db.getCityRecord(guild,"transmission",intent.target_key),
  impact:()=>({cost:0,review:true,reason:"Human-reviewed audience response to an already resolved native action; no inferred institutional assent."}),
  apply:(db,guild,intent,key,actor)=>attemptCityInfluence(db,guild,{...intent.payload,key:intent.target_key||key},actor)
});
registerIntentAdapter("evidence",{
  current:(db,guild,intent)=>{const row=db.getHandout(intent.payload.handout_id);return row?.guild_id===guild?row.metadata.evidence:null;},
  impact:()=>({cost:0,review:true,reason:"Human review of actual sourced evidence analysis; cannot transfer custody or establish guilt."}),
  apply:(db,guild,intent,key,actor)=>manageEvidence(db,guild,{op:"status",id:intent.payload.handout_id,key,source_event:intent.payload.source_event,
    expected_revision:intent.expected_revision,state:"analyzed",interpretation:intent.payload.interpretation},actor,{gm:true})
});
registerIntentAdapter("dialogue",{
  current:()=>null,
  impact:()=>({cost:0,review:false,reason:"Subjective listener memory only; never consent or canon."}),
  apply:(db,guild,intent)=>interpretDialogue(db,guild,intent.payload)
});
registerIntentAdapter("encounter",{
  current:(db,guild,intent)=>db.getCityRecord(guild,"encounter_proposal",intent.target_key),
  impact:()=>({cost:0,review:false,reason:"GM-private proposal only; explicit native encounter review required before planning or activation."}),
  apply:(db,guild,intent,key,actor)=>proposeWorldEncounter(db,guild,{...intent.payload,key:intent.target_key||key},actor)
});
registerIntentAdapter("goal",{
  current:(db,guild,intent)=>intent.payload.actor_type==="npc"?db.getNpcGoal(guild,intent.payload.actor_key,intent.payload.goal_key)
    :db.listSimulationRecords(guild,{kind:"goal",entityKey:`${intent.payload.actor_type}:${intent.payload.actor_key}`,limit:1000})
      .find(row=>row.data.goal_key===intent.payload.goal_key)||null,
  impact:(db,guild,intent)=>({cost:0,review:["complete","abandon","supersede"].includes(intent.payload.op)
    ||intent.payload.acceptable_methods.some(method=>!["investigate","observe","research","prepare","protect"].includes(method)),
    reason:"Contested goal conclusions or non-routine methods require human review."}),
  apply:(db,guild,intent,key,principal)=>{
    const row=proposeGoalTransition(db,guild,{...intent.payload,key},principal);
    return reviewGoalTransition(db,guild,{key:row.record_key,decision:"approve"},principal);
  }
});
registerIntentAdapter("scene",{
  current:(db,guild,intent)=>intent.payload.op==="enter"?db.getCityRecord(guild,"scene_entry",intent.payload.entry_key):scenePresence(db,guild,intent.payload.entity_type,intent.payload.entity_key),
  impact:(db,guild,intent,before)=>intent.payload.op==="enter"?mundaneEntryImpact(db,guild,before,intent.payload.location_key):({cost:0,review:!["npc","character"].includes(intent.payload.entity_type)
    &&requireCitySource(db,guild,intent.payload.source_event).details.entity_key!==intent.payload.entity_key,
    reason:"New scene evidence and barriers need a matching committed observation or human review."}),
  apply:(db,guild,intent,key,principal,context)=>{
    if(intent.payload.op==="enter")return resolveMundaneEntry(db,guild,intent,principal,context.scope);
    const {op,...input}=intent.payload,event=requireCitySource(db,guild,input.source_event);
    if(input.entity_type==="npc"&&activeCityProxy(db,guild,input.entity_key)) throw new Error("Proxy controls presence.");
    if(input.known_to.some(observer=>!event.details.observers?.includes(observer))) throw new Error("Observer knowledge is not established by the source.");
    const prior=scenePresence(db,guild,input.entity_type,input.entity_key);
    if(["npc","character"].includes(input.entity_type)&&event.details.entity_key!==input.entity_key)
      throw new Error("Actor-specific scene source required.");
    if(prior&&prior.data.hidden!==input.hidden&&event.details.hidden!==input.hidden)
      throw new Error("Concealment changes require committed source evidence.");
    if(input.state==="actually_present"&&prior&&["uncertain","believed_present","departed"].includes(prior.data.state)
      &&(!["arrival","travel"].includes(event.kind)||event.details.entity_key!==input.entity_key)) throw new Error("Actual arrival evidence required.");
    if(input.entity_type==="character"){
      const owner=db.getCharacter(input.entity_key)?.owner_user_id;
      if(event.details.entity_key!==input.entity_key||event.details.owner_user_id!==owner||event.source_id!==`player:${owner}`)
        throw new Error("Authenticated PC arrival source required.");
      input.accepted_by=owner;
    }
    return recordScenePresence(db,guild,input,principal);
  }
});
registerIntentAdapter("consequence",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,intent.payload.op==="apply"?"consequence":"consequence_subscription",intent.target_key):null,
  impact:(db,guild,intent,before)=>({cost:intent.payload.op==="apply"?Math.abs(before?.data.payload?.delta||0):0,
    review:intent.payload.handler!=="service"||intent.payload.op==="apply"&&before?.data.handler!=="service",reason:"Non-service consequences require human review."}),
  apply:(db,guild,intent,key,principal)=>{
    const p=intent.payload;
    if(p.op==="apply"){
      const before=db.getCityRecord(guild,"consequence",intent.target_key);
      if(before?.source_event!==p.source_event) throw new Error("Consequence source mismatch.");
      const result=reviewConsequence(db,guild,{key:intent.target_key,decision:"approve"},principal);
      if(result.status!=="completed") throw new Error("Consequence blocked by native resolver.");return result;
    }
    if(p.op==="subscribe"&&p.handler==="service"&&(!p.event_kinds.length||p.event_kinds.some(kind=>!["infrastructure_damage","infrastructure_repair"].includes(kind))))
      throw new Error("Routine subscriptions require known physical event classes.");
    if(p.op==="subscribe"&&p.handler==="service"){
      const service=db.getCityRecord(guild,"infrastructure",p.entity_key);
      if(service?.status!=="active"||!p.location_key||!service.data.locations.includes(p.location_key)) throw new Error("Established service causal location required.");
    }
    const payload=p.handler==="service"?{delta:p.delta}:p.handler==="goal"?p.goal:{...p.transmission,authorized:true};
    return subscribeConsequence(db,guild,{...p,key:p.op==="unsubscribe"?intent.target_key:key,payload},principal);
  }
});
export function delegateConsequence(db,guild,row,budget={operations:0,cost:0}){
  const p=row.data;
  if(p.handler!=="service") return null;
  return dispatchAiIntents(db,guild,[{version:1,feature:"consequence",target_key:row.record_key,expected_revision:stateRevision(row),
    policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:[],payload:{source_event:row.source_event,op:"apply",handler:"service",
      entity_key:p.entity_key,event_kinds:p.event_kinds,location_key:p.location_key||"",delta:p.payload.delta}}],
  {origin:`causal:${row.record_key}:${db.getSimulationClock(guild).tick}`,scope:{mode:"party"},budget})[0];
}
registerIntentAdapter("group",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,"group_transition",intent.target_key):null,
  impact:(db,guild,intent,before)=>({cost:0,review:before?.data.major===true||["split","merge","dissolve"].includes(intent.payload.operation),
    reason:"Major group changes require human review and independent candidate responses."}),
  apply:(db,guild,intent,key,principal)=>{
    const p=intent.payload,member=p.member;
    actorSource(db,guild,{actor_type:"npc",actor_key:member,information_key:p.information_key,source_event:p.source_event},{requireResources:false});
    if(p.op==="propose"){
      if(!p.members.includes(member)) throw new Error("Group proposer must be a candidate.");
      return manageGroup(db,guild,{...p,key},principal);
    }
    const before=db.getCityRecord(guild,"group_transition",intent.target_key);
    if(before?.source_event!==p.source_event) throw new Error("Response must concern this sourced proposal.");
    if(before.data.responses[member]) return before;
    const profile=db.getNpcProfile(guild,member);
    if(p.decision==="accept"&&["refuse","decline"].includes(profile.decision_profile.group_policy)) throw new Error("Established actor preferences require dissent.");
    if(!p.reason.trim()) throw new Error("Actor-relative response reason required.");
    const row=manageGroup(db,guild,{key:intent.target_key,op:"respond",member,decision:p.decision,reason:p.reason,information_key:p.information_key},principal);
    if(row.data.members.every(candidate=>row.data.responses[candidate])){
      const accepted=row.data.members.filter(candidate=>row.data.responses[candidate].decision==="accept").length;
      if(!row.data.major) return manageGroup(db,guild,{key:row.record_key,op:accepted>=(["form"].includes(row.data.operation)?2:1)?"approve":"reject"},principal);
    }
    return row;
  }
});
registerIntentAdapter("strategy",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,"strategy",intent.target_key):null,
  impact:(db,guild,intent,before)=>({cost:["propose","replan"].includes(intent.payload.op)?intent.payload.cost_ceiling
    :intent.payload.op==="run"&&!before?.data.steps.some(step=>step.status==="submitted")?1:0,
    review:(before?.data.steps||intent.payload.steps).some(step=>!["observe","research","investigate","prepare","travel","protect",
      "document_request","interview_request","inspect_request"].includes(step.action.type)),
    reason:"Aggressive, disclosure or negotiated plan steps require human review."}),
  apply:(db,guild,intent,key,principal)=>{
    const p=intent.payload,before=intent.target_key?db.getCityRecord(guild,"strategy",intent.target_key):null;
    if(before&&(p.actor_type!==before.data.actor_type||p.actor_key!==before.data.actor_key||p.goal_key!==before.data.goal_key)) throw new Error("Plan owner/objective cannot be substituted.");
    const result=manageStrategy(db,guild,{...p,delegation_revision:intent.policy_revision,key:intent.target_key||key},principal);
    return ["propose","replan"].includes(p.op)?manageStrategy(db,guild,{key:result.record_key,op:"approve"},principal):result;
  }
});
export function delegateStrategy(db,guild,row,budget={operations:0,cost:0}){
  const p=row.data;
  return dispatchAiIntents(db,guild,[{version:1,feature:"strategy",target_key:row.record_key,expected_revision:stateRevision(row),
    policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:[],payload:{actor_type:p.actor_type,actor_key:p.actor_key,
      information_key:p.information_key,source_event:row.source_event,op:"run",goal_key:p.goal_key,cost_ceiling:p.cost_ceiling,
      deadline_minute:p.deadline_minute??1000000000,steps:p.steps.map(({key,requires,action})=>({key,requires,action})),
      alternatives:p.alternatives||[],assumptions:p.assumptions||[]}}],{origin:`strategy:${row.record_key}:${db.getSimulationClock(guild).tick}`,scope:{mode:"party"},budget})[0];
}
registerIntentAdapter("arc",{
  current:(db,guild,intent)=>intent.payload.op==="invite"?db.getCityRecord(guild,"arc",`${intent.payload.character_id}:${intent.payload.arc_key}`)
    :db.getCityRecord(guild,"arc_candidate",intent.target_key),
  impact:()=>({cost:0,review:false}),
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload;
    if(context.scope?.mode==="private"&&context.scope.actorCharacterId!==p.character_id) throw new Error("Private continuity belongs to this character only.");
    if(p.op==="candidate"){
      const row=db.getCityRecord(guild,"arc_candidate",intent.target_key),source=requireCitySource(db,guild,p.source_event);
      if(row?.subject_key!==p.character_id||source.details.statement!==p.statement||row.data.statement!==p.statement)
        throw new Error("Only an exact authenticated owner quote can be offered for confirmation.");return row;
    }
    const arc=db.getCityRecord(guild,"arc",`${p.character_id}:${p.arc_key}`);
    if(!arc) throw new Error("Owner-confirmed arc required.");
    return proposeArcBeat(db,guild,{key,character_id:p.character_id,arc_key:p.arc_key,source_event:arc.source_event,
      invitation:`Would you like a nonbinding opportunity to revisit your statement: ${arc.data.statement.slice(0,800)}?`},principal);
  }
});
registerIntentAdapter("project",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,intent.payload.op==="propose"?"project_draft":"long_project",intent.target_key):null,
  impact:()=>({cost:0,review:false}),
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload;
    if(context.scope?.mode==="private"&&context.scope.actorCharacterId!==p.character_id) throw new Error("Private project belongs to this character only.");
    if(p.op==="propose"){
      const character=db.getCharacter(p.character_id),source=requireCitySource(db,guild,p.source_event);
      if(character?.guild_id!==guild||!character.owner_user_id||!p.participants.includes(p.character_id)) throw new Error("Established owner and collaborators required.");
      if(!["public","party"].includes(source.visibility)&&!(source.visibility==="character"&&source.subject_key===character.id&&p.participants.length===1))
        throw new Error("Project sources must be known to collaborators.");
      return db.saveCityRecord(guild,{kind:"project_draft",key,status:"pending",visibility:"character",subject_key:character.id,source_event:p.source_event,
        data:{...p,costs:[],authority:"nonbinding_proposal_existing_downtime_rules",commitments:"Each owner must submit and consent to each phase; no automatic spending or success."}});
    }
    const before=db.getCityRecord(guild,"long_project",intent.target_key);
    if(!before||before.source_event!==p.source_event) throw new Error("Existing project and original source required.");
    return manageLongProject(db,guild,principal,{...p,key:intent.target_key},
      {principal:applicationPrincipal(guild,`project.${p.op}`,principal)});
  }
});
export function continueLongProjects(db,guild,{limit=4,budget={operations:0,cost:0}}={}){
  if(db.getCityCalendar(guild).flags.long_projects!==true||db.isDirectorPaused(guild)) return [];
  return db.listCityRecords(guild,{kind:"long_project",status:"active",includeGM:true,limit:Math.max(1,Math.min(4,limit))}).map(row=>{
    const reconciled=reconcileLongProject(db,guild,row);if(reconciled.status!=="active") return reconciled;
    const p=row.data,phase=p.phases[p.index];
    return dispatchAiIntents(db,guild,[{version:1,feature:"project",target_key:row.record_key,expected_revision:stateRevision(row),
      policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:phase.prerequisites,payload:{source_event:row.source_event,op:"advance",
        character_id:p.participants[0],title:p.title,participants:p.participants,phases:p.phases.map(({key,title,duration_minutes,requires,prerequisites})=>
          ({key,title,duration_minutes,requires,prerequisites})),npc_collaborators:p.npc_collaborators||[],result_ids:p.participants.map(id=>phase.consents[id]?.project_id||"")}}],
    {origin:`project-continuation:${row.record_key}:${db.getSimulationClock(guild).tick}:${db.getSimulationClock(guild).minute}`,scope:{mode:"party"},budget})[0];
  });
}
registerIntentAdapter("mediation",{
  current:(db,guild,intent)=>intent.payload.actor_type==="npc"?db.getSimulationRecord(guild,intent.payload.action_key)
    :db.getCityRecord(guild,"action",intent.payload.action_key),
  impact:()=>({cost:0,review:false}),
  apply:(db,guild,intent)=>{
    const p=intent.payload,row=p.actor_type==="npc"?db.getSimulationRecord(guild,p.action_key):db.getCityRecord(guild,"action",p.action_key);
    if(!row||(p.actor_type==="npc"?row.entity_key!==`npc:${p.actor_key}`:row.actor_key!==p.actor_key)) throw new Error("Actor-owned action required.");
    try{return {status:"clear",result:p.actor_type==="npc"?inspectNpcAction(db,guild,p.action_key):inspectInstitutionAction(db,guild,p.action_key),
      alternatives:[],not_a_new_roll:true};}
    catch{return {status:"blocked",reason:"Native physical, source, resource, chronology or delegation prerequisites are unmet.",
      alternatives:["defer","replan_from_new_evidence","request_human_review"],not_a_new_roll:true,no_costs:true,claims_remain_contested:true};}
  }
});
registerIntentAdapter("memory",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,"memory_cluster",intent.target_key):null,
  impact:()=>({cost:0,review:false}),
  apply:(db,guild,intent,key,principal)=>manageMemoryCluster(db,guild,{...intent.payload,key:intent.target_key||key},principal)
});
export function maintainMemory(db,guild,budget={operations:0,cost:0}){
  if(delegationPolicy(db,guild).mode!=="routine_delegated") return [];
  const candidate=memoryMaintenanceCandidate(db,guild);if(!candidate) return [];
  const p=candidate.payload;
  return dispatchAiIntents(db,guild,[{version:1,feature:"memory",target_key:candidate.target_key,expected_revision:stateRevision(candidate.expected),
    policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:[],payload:{op:p.op,source_event:p.source_event,actor_type:p.actor_type,
      actor_key:p.actor_key,topic:p.topic,sources:p.sources}}],{origin:`memory-maintenance:${db.getSimulationClock(guild).tick}`,scope:{mode:"party"},budget});
}
registerIntentAdapter("density",{
  current:()=>null,impact:()=>({cost:0,review:false}),
  apply:(db,guild)=>({clock:db.getSimulationClock(guild),recent_cycles:db.listSimulationRecords(guild,{kind:"cycle",limit:4}),
    authority:"bounded_scheduler_diagnostics_not_actor_knowledge",npc_budgets:{round:1,scene:3,downtime:4},institution_budget:2})
});
