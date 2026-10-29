import {intentNpcPolicy} from './frameworks/intent/public.js';
const {actorSource,proposeGoalTransition,reviewGoalTransition,manageStrategy}=intentNpcPolicy;
import {intentWorldPrimitives,intentWorldActions} from './frameworks/intent/public.js';
const {requireCitySource,cityObject,cityInteger,cityAudit,indexWorldEvent}=intentWorldPrimitives;
const {inspectNpcAction,inspectInstitutionAction,submitInstitutionAction,executeInstitutionAction}=intentWorldActions;
/** Shared governed intent pipeline: bound authority, closed contracts, atomic receipts and native domain adapters. */
import { createHash } from "node:crypto";
import { validateIntent } from "./ai-intent-contracts.js";
import { recordScenePresence, scenePresence, sceneView } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { subscribeConsequence, reviewConsequence } from "./city-consequences.js";
import { manageGroup } from "./city-groups.js";
import { ContextPlanner } from "./context-planner.js";
import { proposeArcBeat } from "./personal-continuity.js";
import { manageLongProject, projectPhaseRevision, reconcileLongProject } from "./long-projects.js";
import { applicationPrincipal } from "./kernel/application-authority.js";
import {intentKnowledgeMaintenance} from './frameworks/intent/public.js';
function manageMemoryCluster(...args){return intentKnowledgeMaintenance.manageMemoryCluster(...args);}function memoryMaintenanceCandidate(...args){return intentKnowledgeMaintenance.memoryMaintenanceCandidate(...args);}
import { encounterProposalContext, proposeWorldEncounter } from "./encounter.js";
import { interpretDialogue } from "./dialogue-continuity.js";
import { manageEvidence } from "./evidence-custody.js";
import { inviteOrganization } from "./owned-community.js";
import { suggestSetupPayoff } from "./story-continuity.js";
function reconcileHistory(...args){return intentKnowledgeMaintenance.reconcileHistory(...args);}
import { prepareRollRequest } from "./roll-requests.js";
import { reviewRollDeclaration } from "./roll-declaration-review.js";
import { mundaneEntryImpact, resolveMundaneEntry } from "./scene-entry-native.js";
import {assertSemanticCandidateProof} from './semantic-candidate-source.js';
import {assertOrdinaryBinding} from './ordinary-effect-proof.js';
import { conversationPrincipal } from "./conversation-principal.js";
import {delegationCatalog} from './delegation-catalog.js';
import {activateDelegatedEncounter,inspectNativeEncounterActivation} from './native-encounter-activation.js';
import {intentWorldOperations} from './frameworks/intent/public.js';
function prepareNativeWorldOperation(...args){return intentWorldOperations.prepareNativeWorldOperation(...args);}function nativeWorldOperationAllows(...args){return intentWorldOperations.nativeWorldOperationAllows(...args);}function nativeWorldOperationOrigin(...args){return intentWorldOperations.nativeWorldOperationOrigin(...args);}function inspectNativeWorldOperationReceipt(...args){return intentWorldOperations.inspectNativeWorldOperationReceipt(...args);}function nativeWorldOperationCatalog(...args){return intentWorldOperations.nativeWorldOperationCatalog(...args);}function nativeWorldStrategyScope(...args){return intentWorldOperations.nativeWorldStrategyScope(...args);}function attemptCityInfluence(...args){return intentWorldOperations.attemptCityInfluence(...args);}
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const adapters=new Map();
export const FEATURE_FLAGS={institution:'institutions',roll:"roll_requests",setup:"narrative_setups",organization:"player_organizations",influence:"audience_influence",evidence:"evidence_custody",dialogue:"dialogue_history",encounter:"encounter_intelligence",goal:"emergent_goals",consequence:"consequences",scene:"scene_continuity",group:"emergent_groups",
  strategy:"strategies",arc:"personal_arcs",discovery:"discovery",project:"long_projects",mediation:"conflict_mediation",
  memory:"memory_consolidation",density:"activity_density"};
import {stateRevision} from './kernel/state-revision.js';
export {stateRevision} from './kernel/state-revision.js';
export function registerIntentAdapter(feature,adapter){adapters.set(feature,adapter);}
import {delegationPolicy} from './frameworks/intent/public.js';
export {delegationPolicy} from './frameworks/intent/public.js';

const policyFields=['mode','allow','private_allow','max_operations','max_cost','expires_minute'];
function validateDelegation(db,guild,input){
  cityObject(input);
  const catalog=delegationCatalog(),validList=(list,eligible)=>Array.isArray(list)&&new Set(list).size===list.length
    &&list.every(id=>typeof id==='string'&&eligible.includes(id));
  if(Object.keys(input).some(key=>!policyFields.includes(key)))throw new Error('Invalid delegation configuration.');
  if(!["manual","suggest_only","routine_delegated"].includes(input.mode)||!validList(input.allow,catalog.all))
    throw new Error("Explicit registered operation allowlist required; unknown or duplicate permissions are invalid.");
  cityInteger(input.max_operations,1,4);cityInteger(input.max_cost,0,20);
  if(input.private_allow!==undefined&&(!validList(input.private_allow,catalog.private_eligible)||input.private_allow.some(op=>!input.allow.includes(op))))
    throw new Error("Private world delegation must explicitly name audited native operations already allowed by the main policy.");
  if(input.expires_minute!==null) cityInteger(input.expires_minute,db.getSimulationClock(guild).minute+1,1000000000);
  if(input.mode==="routine_delegated"&&input.expires_minute===null) throw new Error("Delegation requires an explicit fictional-time expiry.");
}
function saveDelegation(db,guild,input,reviewer){
  validateDelegation(db,guild,input);
  const before=db.getCityRecord(guild,"ai_delegation","campaign"),revision=(before?.data.revision||0)+1;
  const source=indexWorldEvent(db,guild,{key:`ai-policy:${revision}`,title:"Explicit GM delegation configuration",source_id:reviewer},reviewer);
  const after=db.saveCityRecord(guild,{kind:"ai_delegation",key:"campaign",source_event:source.event_key,data:{...input,revision,configured_by:reviewer}});
  cityAudit(db,guild,"ai_delegation","campaign",before,after,reviewer);return after;
}
export function configureDelegation(db,guild,input,reviewer){
  if(!reviewer)throw new Error('Authenticated GM required.');
  return db.transaction(()=>saveDelegation(db,guild,input,reviewer));
}
export function delegationOperation(db,guild,input,reviewer){
  cityObject(input);if(!reviewer)throw new Error('Authenticated GM required.');
  if(!input.op)return configureDelegation(db,guild,input,reviewer);
  if(input.op==='status'){
    if(Object.keys(input).length!==1)throw new Error('Status takes no updates.');
    const policy=delegationPolicy(db,guild);return {policy,count:policy.allow.length,private_count:policy.private_allow?.length||0};
  }
  if(input.op==='catalog'){
    if(Object.keys(input).some(k=>!['op','page','filter'].includes(k)))throw new Error('Invalid catalog query.');
    const page=input.page??1;cityInteger(page,1,10000);
    if(input.filter!==undefined&&(typeof input.filter!=='string'||input.filter.length>160))throw new Error('Bounded catalog filter required.');
    const catalog=delegationCatalog(),all=catalog.all.filter(id=>id.includes(input.filter||''));
    return {...catalog,all:all.slice((page-1)*50,page*50),total:all.length,page,page_size:50,
      runtime_unavailable:all.filter(id=>!adapters.has(id.split('.')[0]))};
  }
  if(input.op!=='patch'||Object.keys(input).some(k=>!['op','expected_revision','allow_add','allow_remove','private_allow_add','private_allow_remove',
    'mode','max_operations','max_cost','expires_minute'].includes(k)))throw new Error('Invalid delegation patch.');
  cityInteger(input.expected_revision,0,1000000000);
  const catalog=delegationCatalog();
  for(const field of ['allow_add','allow_remove','private_allow_add','private_allow_remove']){
    const value=Object.hasOwn(input,field)?input[field]:[],eligible=field.startsWith('private_')?catalog.private_eligible:catalog.all;
    if(!Array.isArray(value)||new Set(value).size!==value.length||value.some(id=>!eligible.includes(id)))throw new Error('Invalid or duplicate patch permissions.');
    if(field.endsWith('_add')&&value.some(id=>(input[field.replace('_add','_remove')]||[]).includes(id)))throw new Error('Conflicting permission patch.');
  }
  return db.transaction(()=>{
    const before=delegationPolicy(db,guild);if(before.revision!==input.expected_revision)throw new Error('Stale delegation revision; refresh status.');
    const next=Object.fromEntries(policyFields.map(k=>[k,before[k]??(k==='private_allow'?[]:null)]));
    for(const field of ['allow','private_allow'])next[field]=[...new Set([...next[field],...(input[`${field}_add`]||[])])]
      .filter(id=>!(input[`${field}_remove`]||[]).includes(id)).sort();
    if((input.private_allow_add||[]).some(id=>!next.allow.includes(id)))throw new Error('Private additions require a permission in the effective main allowlist.');
    next.private_allow=next.private_allow.filter(id=>next.allow.includes(id));
    for(const field of ['mode','max_operations','max_cost','expires_minute'])if(Object.hasOwn(input,field))next[field]=input[field];
    validateDelegation(db,guild,next);
    const changed=Object.fromEntries(policyFields.filter(k=>JSON.stringify(k==='private_allow'?(before[k]||[]):before[k])!==JSON.stringify(next[k]))
      .map(k=>[k,{before:before[k],after:next[k]}]));
    if(!Object.keys(changed).length)return {policy:before,previous_revision:before.revision,changed:{},unchanged:true};
    const after=saveDelegation(db,guild,next,reviewer);
    return {policy:after.data,previous_revision:before.revision,changed,count:next.allow.length,private_count:next.private_allow.length};
  });
}
function preflight(db,guild,intent,context){
  if(!validateIntent(intent)) throw new Error("Invalid closed versioned intent contract.");
  assertOrdinaryBinding(db,guild,context.ordinaryEffect,intent,context.origin);
  const privateWorld=context.scope?.mode==="private"&&!['arc','project','discovery','dialogue','organization','setup','roll'].includes(intent.feature)
    &&!(intent.feature==="scene"&&intent.payload.op==="enter");
  if(privateWorld){
    conversationPrincipal(db,guild,context.scope.actorUserId,context.scope.actorCharacterId);
    if(!delegationPolicy(db,guild).private_allow?.includes(`${intent.feature}.${intent.payload.op}`))
      throw new Error("Private world operation needs explicit private_allow delegation.");
    if(intent.payload.actor_type==="character"||intent.payload.actor_type==="npc"&&activeCityProxy(db,guild,intent.payload.actor_key))
      throw new Error("Private world authority does not take over PCs or proxied NPCs.");
    if(intent.feature==="scene"&&!["gm","character","player"].includes(intent.payload.visibility))
      throw new Error("Private scene evidence cannot publish party presence.");
  }
  if(context.scope?.mode==="private"&&intent.feature==="setup"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private setup invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="organization"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private organization invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="dialogue"){
    const source=requireCitySource(db,guild,intent.payload.source_event);
    if(source.details.author!==context.scope.actorUserId||source.details.character_id!==context.scope.actorCharacterId)
      throw new Error("Private dialogue must belong to this authenticated character.");
  }
  if(db.getCityCalendar(guild).flags[FEATURE_FLAGS[intent.feature]]!==true
    &&!nativeWorldOperationAllows(db,guild,context.nativeWorldGrant,intent.feature,intent.payload.op,intent.payload))
    throw new Error("Feature is disabled or has no qualified native world-operation authority.");
  if(db.isDirectorPaused(guild)) throw new Error("Director is paused.");
  for(const key of new Set([intent.payload.source_event,...intent.source_prerequisites])) requireCitySource(db,guild,key);
  const adapter=adapters.get(intent.feature);if(!adapter) throw new Error("Domain adapter is not available yet.");
  const before=adapter.current(db,guild,intent);
  if(privateWorld&&before&&["public","party"].includes(before.visibility))throw new Error("Public target needs a separately reviewed projection; do not overwrite its private causal history.");
  if(stateRevision(before)!==intent.expected_revision) throw new Error("Stale target revision; propose again from current state.");
  const impact=adapter.impact(db,guild,intent,before,context);
  return {adapter,before,impact,privateWorld};
}
function applyNative(db,guild,intent,key,actor,context,adapter,privateWorld){
  if(!privateWorld)return adapter.apply(db,guild,intent,key,actor,context);
  // Causal annotations remain GM-private. Native world state may change, but this
  // turn is never relabelled party and public observations require separate review.
  const marker=db.privateCausalMarker(guild);
  const result=adapter.apply(db,guild,intent,key,actor,context);
  db.retainPrivateCausality(guild,marker);
  return result;
}
export function projectPrivateEffect(db,guild,input,reviewer){
  if(!reviewer||Object.keys(input).sort().join()!=="expected_revision,key,observation,op,projection_key"||input.op!=="project-effect"
    ||typeof input.observation!=="string"||!input.observation.trim()||input.observation.length>1500)throw new Error("Closed authenticated GM observation review required.");
  const receipt=db.getCityRecord(guild,"ai_intent",input.key);
  if(!receipt||receipt.status!=="accepted"||receipt.data.scope?.mode!=="private"||stateRevision(receipt)!==input.expected_revision)
    throw new Error("Current accepted private causal receipt required.");
  requireCitySource(db,guild,receipt.source_event);
  return db.transaction(()=>{
    const key=`projection:${input.projection_key}`,prior=db.getCityRecord(guild,"effect_projection",key);
    if(prior){if(prior.data.receipt!==input.key||prior.data.observation!==input.observation)throw new Error("Projection key already used.");return prior;}
    // The GM independently establishes what can be observed; private cause/details
    // are not copied to the public event or its public source graph.
    const event=indexWorldEvent(db,guild,{key,kind:"observation",title:"GM-reviewed observable world effect",source_id:reviewer,
      visibility:"party",truth_status:"observed",session_id:db.getActiveSession(guild)?.id,
      details:{observation:input.observation,reviewed_by:reviewer}},reviewer);
    const row=db.saveCityRecord(guild,{kind:"effect_projection",key,source_event:event.event_key,
      data:{receipt:input.key,observation:input.observation,reviewed_by:reviewer,authority:"Independent public observation; private cause retained separately"}});
    cityAudit(db,guild,"effect_projection",key,null,row,reviewer);return row;
  });
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
    data:{intent,reason,scope:context.scope||{mode:"party"},origin:context.origin||"",session_id:context.sessionId||null,
      ...(context.ordinaryEffect?{ordinary_effect:context.ordinaryEffect}:{}),...extra}});
  cityAudit(db,guild,"ai_intent",key,null,row,"ai_policy");return row;
}
export function dispatchAiIntents(db,guild,intents=[],context={}){
  if(!Array.isArray(intents)||intents.length>4) throw new Error("At most four AI intents per opportunity.");
  const budget=context.budget||{operations:0,cost:0};
  return intents.map(intent=>{
    const key=`intent:${hash([guild,context.sessionId||null,context.origin||"",intent]).slice(0,48)}`;
    const previous=db.getCityRecord(guild,"ai_intent",key);
    if(previous){
      if(hash(previous.data.scope||{mode:'party'})!==hash(context.scope||{mode:'party'})||hash(previous.data.intent)!==hash(intent))
        throw new Error('Saved delegated receipt scope or proposal changed; no replay authority.');
      if(context.scope?.mode==='private')conversationPrincipal(db,guild,context.scope.actorUserId,context.scope.actorCharacterId);
      if(previous.status==='accepted'){
        inspectNativeWorldOperationReceipt(db,guild,previous);
        for(const ref of new Set([intent.payload.source_event,...intent.source_prerequisites]))requireCitySource(db,guild,ref);
        adapters.get(intent.feature)?.replay?.(db,guild,intent,previous,context);
      }
      return previous; // Read-only receipt; never repeat a committed native operation.
    }
    try{return db.transaction(()=>{
      const nativeWorldGrant=validateIntent(intent)?prepareNativeWorldOperation(db,guild,intent,{...context,nativeEffectKey:key}):null,
        nativeContext={...context,nativeWorldGrant};
      const {adapter,before,impact,privateWorld}=preflight(db,guild,intent,nativeContext);
      let verdict=decision(db,guild,intent,impact,budget);
      if(context.deferred===true&&verdict.status==="accepted") verdict={status:"deferred",reason:"Fictional work slot exhausted; refresh or review later."};
      const result=verdict.status==="accepted"?applyNative(db,guild,intent,key,"ai_policy",nativeContext,adapter,privateWorld):null;
      if(verdict.status==="accepted"){budget.operations++;budget.cost+=impact.cost;}
      return saveReceipt(db,guild,key,intent,verdict.status,verdict.reason,context,{before,impact,result,policy_revision:delegationPolicy(db,guild).revision,
        ...(verdict.status==='accepted'&&nativeWorldGrant?{authority_origin:nativeWorldOperationOrigin(nativeWorldGrant)}:{})});
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
      if(response==='modify'&&(row.data.ordinary_effect||String(row.data.origin||'').startsWith('ordinary-effect:')))
        throw new Error('Bound ordinary follow-through needs a fresh proposal; no substituted native child.');
      if(response==="modify"&&!validateIntent(replacement_intent)) throw new Error("A complete closed replacement intent is required.");
      const after=db.saveCityRecord(guild,{...row,key,status:{reject:"rejected",defer:"deferred",modify:"pending"}[response],
        data:{...row.data,intent:response==="modify"?replacement_intent:row.data.intent,reviewed_by:reviewer,
          history:[...(row.data.history||[]).slice(-19),{decision:response,intent:row.data.intent,by:reviewer}]}});
      cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
    }
    const context={scope:row.data.scope,sessionId:row.data.session_id,origin:row.data.origin,ordinaryEffect:row.data.ordinary_effect},intent=row.data.intent;
    const {adapter,before,impact,privateWorld}=preflight(db,guild,intent,context);
    if(intent.policy_revision!==delegationPolicy(db,guild).revision) throw new Error("Policy changed; request a fresh proposal.");
    const result=response==="approve"?applyNative(db,guild,intent,key,reviewer,context,adapter,privateWorld):null;
    const after=db.saveCityRecord(guild,{...row,key,status:response==="approve"?"accepted":"rejected",
      data:{...row.data,before,impact,result,reviewed_by:reviewer}});
    cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
  });
}
export function intentContext(db,guild){
  const scene=db.getActiveSession(guild)&&db.getCityCalendar(guild).flags.scene_continuity===true?sceneView(db,guild,{gm:true}):null;
  const packet={policy:delegationPolicy(db,guild),flags:db.getCityCalendar(guild).flags,native_world_operations:nativeWorldOperationCatalog(db,guild),
    scene_entries:db.listCityRecords(guild,{kind:"scene_entry",includeGM:true,limit:30})
      .filter(row=>["pending","awaiting_adjudication"].includes(row.status)).slice(0,8).map(row=>({...row,expected_revision:stateRevision(row)})),
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
  replay:(db,guild,intent)=>{if(intent.payload.op==='activate')inspectNativeEncounterActivation(db,guild,`native-encounter-activation:${hash(intent.target_key)}`);},
  current:(db,guild,intent)=>db.getCityRecord(guild,"encounter_proposal",intent.target_key),
  impact:(db,guild,intent)=>({cost:0,review:false,reason:intent.payload.op==='activate'
    ?'Exact existing grounded encounter only; explicit encounter.activate operator delegation and all native roster/template/BP checks required.'
    :"GM-private proposal only; explicit native encounter review or separately delegated activation required."}),
  apply:(db,guild,intent,key,actor)=>intent.payload.op==='activate'
    ?activateDelegatedEncounter(db,guild,intent,{principal:applicationPrincipal(guild,'encounter.activate',actor)})
    :proposeWorldEncounter(db,guild,{...intent.payload,key:intent.target_key||key},actor)
});
registerIntentAdapter('institution',{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,'action',intent.target_key):null,
  impact:()=>({cost:1,review:false,reason:'Actual institutional procedure and capacity only; requests never grant PC custody, compliance, knowledge or a warrant outcome.'}),
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload;
    actorSource(db,guild,{actor_type:'institution',actor_key:p.institution,information_key:p.information_key,source_event:p.source_event});
    const {op,...action}=p,row=intent.target_key?db.getCityRecord(guild,'action',intent.target_key)
      :submitInstitutionAction(db,guild,{...action,key},principal);
    if(intent.target_key&&(!context.nativeWorldGrant||!row||!['pending','proposed'].includes(row.status)
      ||Object.entries(action).some(([field,value])=>field!=='information_key'&&hash(row.data[field]??'')!==hash(value))))
      throw new Error('Existing institutional request needs exact current native action terms.');
    return executeInstitutionAction(db,guild,row.record_key,{cycleKey:key,nativeAuthority:context.nativeWorldGrant,nativePayload:p});
  }
});
registerIntentAdapter("goal",{
  current:(db,guild,intent)=>intent.payload.actor_type==="npc"?db.getNpcGoal(guild,intent.payload.actor_key,intent.payload.goal_key)
    :db.listSimulationRecords(guild,{kind:"goal",entityKey:`${intent.payload.actor_type}:${intent.payload.actor_key}`,limit:1000})
      .find(row=>row.data.goal_key===intent.payload.goal_key)||null,
  impact:(db,guild,intent)=>({cost:0,review:["complete","abandon","supersede"].includes(intent.payload.op)
    ||intent.payload.acceptable_methods.some(method=>!["investigate","observe","research","prepare","protect"].includes(method)),
    reason:"Contested goal conclusions or non-routine methods require human review."}),
  apply:(db,guild,intent,key,principal,context)=>{
    const options={nativeAuthority:context?.nativeWorldGrant||null},row=proposeGoalTransition(db,guild,{...intent.payload,key},principal,options);
    return reviewGoalTransition(db,guild,{key:row.record_key,decision:"approve"},principal,options);
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
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload;
    if(p.op==="apply"){
      const before=db.getCityRecord(guild,"consequence",intent.target_key);
      if(before?.source_event!==p.source_event) throw new Error("Consequence source mismatch.");
      const result=reviewConsequence(db,guild,{key:intent.target_key,decision:"approve"},principal,
        {nativeAuthority:context?.nativeWorldGrant||null,nativePayload:p});
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
export function delegateWorldGoal(db,guild,payload,budget={operations:0,cost:0}){
  return dispatchAiIntents(db,guild,[{version:1,feature:'goal',target_key:'',expected_revision:'absent',
    policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:[],payload}],
    {origin:`native-motivation:${payload.goal_key}`,scope:{mode:'party'},budget})[0];
}
registerIntentAdapter("group",{
  current:(db,guild,intent)=>intent.target_key?db.getCityRecord(guild,"group_transition",intent.target_key):null,
  impact:(db,guild,intent,before,context)=>({cost:0,review:!nativeWorldOperationAllows(db,guild,context.nativeWorldGrant,'group',intent.payload.op,intent.payload)
    &&(before?.data.major===true||["split","merge","dissolve"].includes(intent.payload.operation)),
    reason:"Major group changes require human review and independent candidate responses."}),
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload,member=p.member;
    const options={nativeAuthority:context?.nativeWorldGrant||null,nativePayload:p};
    actorSource(db,guild,{actor_type:"npc",actor_key:member,information_key:p.information_key,source_event:p.source_event},{requireResources:false});
    if(p.op==="propose"){
      if(!p.members.includes(member)) throw new Error("Group proposer must be a candidate.");
      return manageGroup(db,guild,{...p,key},principal,options);
    }
    const before=db.getCityRecord(guild,"group_transition",intent.target_key);
    if(before?.source_event!==p.source_event) throw new Error("Response must concern this sourced proposal.");
    if(before.data.responses[member]) return before;
    const profile=db.getNpcProfile(guild,member);
    if(p.decision==="accept"&&["refuse","decline"].includes(profile.decision_profile.group_policy)) throw new Error("Established actor preferences require dissent.");
    if(!p.reason.trim()) throw new Error("Actor-relative response reason required.");
    const row=manageGroup(db,guild,{key:intent.target_key,op:"respond",member,decision:p.decision,reason:p.reason,information_key:p.information_key},principal,options);
    if(row.data.members.every(candidate=>row.data.responses[candidate])){
      const accepted=row.data.members.filter(candidate=>row.data.responses[candidate].decision==="accept").length;
      if(!row.data.major||context.nativeWorldGrant){
        const minimum=['form','split','merge'].includes(row.data.operation)?2:row.data.operation==='dissolve'?row.data.members.length:1;
        return manageGroup(db,guild,{key:row.record_key,op:accepted>=minimum?'approve':'reject'},principal,options);
      }
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
  apply:(db,guild,intent,key,principal,context)=>{
    const p=intent.payload,before=intent.target_key?db.getCityRecord(guild,"strategy",intent.target_key):null;
    if(before&&(p.actor_type!==before.data.actor_type||p.actor_key!==before.data.actor_key||p.goal_key!==before.data.goal_key)) throw new Error("Plan owner/objective cannot be substituted.");
    const options={nativeAuthority:context?.nativeWorldGrant||null,nativePayload:p},
      result=manageStrategy(db,guild,{...p,delegation_revision:intent.policy_revision,key:intent.target_key||key},principal,options);
    return ["propose","replan"].includes(p.op)?manageStrategy(db,guild,{key:result.record_key,op:"approve"},principal,options):result;
  }
});
export function delegateStrategy(db,guild,row,budget={operations:0,cost:0}){
  const p=row.data;
  const scope=p.native_world_origin?nativeWorldStrategyScope(db,guild,row):{mode:'party'};
  if(!scope)return {status:'held',reason:'native_strategy_scope_unavailable'};
  return dispatchAiIntents(db,guild,[{version:1,feature:"strategy",target_key:row.record_key,expected_revision:stateRevision(row),
    policy_revision:delegationPolicy(db,guild).revision,source_prerequisites:[],payload:{actor_type:p.actor_type,actor_key:p.actor_key,
      information_key:p.information_key,source_event:row.source_event,op:"run",goal_key:p.goal_key,cost_ceiling:p.cost_ceiling,
      deadline_minute:p.deadline_minute??1000000000,steps:p.steps.map(({key,requires,action})=>({key,requires,action})),
      alternatives:p.alternatives||[],assumptions:p.assumptions||[]}}],{origin:`strategy:${row.record_key}:${db.getSimulationClock(guild).tick}`,scope,budget})[0];
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
      if(row?.data.version===2){
        const verified=assertSemanticCandidateProof(db,guild,row.data.proof);
        if(row.data.statement!==verified.statement||row.data.type!=='desire'||row.source_event!==verified.source.event_key)
          throw new Error('Candidate terms differ from the immutable owner source.');
      }
      if(row?.subject_key!==p.character_id||(row.data.version!==2&&source.details.statement!==p.statement)||row.data.statement!==p.statement)
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

import {nativeStrategyDelegateSource} from './frameworks/intent/public.js';
const provideNativeStrategyDelegate=()=>delegateStrategy;
nativeStrategyDelegateSource.provideSource(provideNativeStrategyDelegate);
import {intentAiIntentDispatch} from './frameworks/intent/public.js';
// Provide this module's original AI intent dispatch to the fixed Intent slot; no other authority is granted.
intentAiIntentDispatch.bind({delegateConsequence,delegateWorldGoal,maintainMemory,continueLongProjects,dispatchAiIntents});
