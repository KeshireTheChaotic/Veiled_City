/** World execution source authority; opaque live grants and execution frames are local to one composed service. */
import {applicationPrincipal,principalAllows} from '../../kernel/application-authority.js';
import {jsonHash as hash} from '../../kernel/json-hash.js';
export function createWorldOperationAuthority({actorSource,conversationPrincipal,assertWorldActorControl}){
const grants=new WeakMap();
const supported=Object.freeze({goal:['propose','reprioritize','pause','resume'],consequence:['subscribe','unsubscribe','apply'],
  strategy:['propose','replan','run','pause','resume','abandon'],group:['propose','respond'],institution:['act']});
const executingStrategies=new WeakMap();
const same=(a,b)=>a===undefined||b===undefined?a===b:hash(a)===hash(b);
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const expectedOwnerErrors=new Set(['Active session required.','Select an authenticated current controlled role.',
  'Controller attendance required.','Active campaign character required.']);
function worldServiceEligible(db,guild,intent){
  const p=intent.payload;
  if(p.handler!=='service'||!Number.isInteger(p.delta)||Math.abs(p.delta)>10)return false;
  const service=db.getCityRecord(guild,'infrastructure',p.entity_key);
  if(service?.status!=='active'||!p.location_key||!service.data.locations?.includes(p.location_key))return false;
  if(p.op==='subscribe')return p.event_kinds.length>0&&p.event_kinds.every(k=>['infrastructure_damage','infrastructure_repair'].includes(k));
  const kind=p.op==='unsubscribe'?'consequence_subscription':'consequence',row=db.getCityRecord(guild,kind,intent.target_key);
  if(!row||row.source_event!==p.source_event||row.data.handler!=='service'||row.data.entity_key!==p.entity_key
    ||row.data.location_key!==p.location_key||hash(row)!==intent.expected_revision)return false;
  if(p.op==='unsubscribe')return row.status==='active';
  const event=db.getWorldEvent(guild,row.source_event),subscription=db.getCityRecord(guild,'consequence_subscription',row.data.subscription);
  return ['pending','blocked'].includes(row.status)&&subscription?.status==='active'
    &&subscription.data.handler==='service'&&subscription.data.entity_key===p.entity_key
    &&row.data.payload?.delta===p.delta&&event?.status==='active'&&event.location_key===p.location_key
    &&(['infrastructure_damage','infrastructure_repair'].includes(event.kind))
    &&(event.kind==='infrastructure_damage'?p.delta<=0:p.delta>=0);
}
function worldGroupEligible(db,guild,intent){
  const p=intent.payload;
  actorSource(db,guild,{actor_type:'npc',actor_key:p.member,information_key:p.information_key,source_event:p.source_event},{requireResources:false});
  if(!['form','join','leave','split','merge','dissolve'].includes(p.operation))return false;
  for(const group of [p.group_key,...p.from_groups].filter(key=>key&&db.getCityRecord(guild,'community',key)))
    assertWorldActorControl(db,guild,'community',group);
  if(p.op==='propose')return p.members.includes(p.member);
  const row=db.getCityRecord(guild,'group_transition',intent.target_key);
  return row?.status==='pending'&&row.source_event===p.source_event&&row.data.operation===p.operation
    &&row.data.group_key===p.group_key&&row.data.members.includes(p.member);
}
/** Coalesced coordinator eligibility only; every actual effect still needs its individual exact grant. */
function nativeWorldCoordinatorReady(db,guild,feature,operation=null){
  const flags=db.getCityCalendar(guild).flags,policy=db.getCityRecord(guild,'ai_delegation','campaign');
  return !!(supported[feature]&&flags.narrative_authority===true&&flags.playable_narration===true&&!db.isDirectorPaused(guild)
    &&(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')==='autonomous'
    &&policy?.data.mode==='routine_delegated'&&policy.data.expires_minute!==null
    &&db.getSimulationClock(guild).minute<policy.data.expires_minute
    &&policy.data.allow?.some(op=>operation?op===`${feature}.${operation}`:op.startsWith(`${feature}.`))
    &&db.getWorldEvent(guild,policy.source_event)?.status==='active');
}
function nativeWorldOperationCatalog(db,guild){
  const policy=db.getCityRecord(guild,'ai_delegation','campaign')?.data;
  return Object.entries(supported).flatMap(([feature,ops])=>ops
    .filter(op=>policy?.allow?.includes(`${feature}.${op}`)&&nativeWorldCoordinatorReady(db,guild,feature,op))
    .map(op=>({operation:`${feature}.${op}`,authority:'requires_exact_native_source_actor_scope_and_domain_validation'})));
}
/** Called by the native dispatcher, not from model fields. The same permission/cost/target decision still runs normally. */
function prepareNativeWorldOperation(db,guild,intent,context){
  if(typeof intent?.payload?.source_event!=='string'||!intent.payload.source_event)return null;
  const op=intent?.payload?.op,feature=intent?.feature,policy=db.getCityRecord(guild,'ai_delegation','campaign'),
    flags=db.getCityCalendar(guild).flags,source=db.getWorldEvent(guild,intent?.payload?.source_event);
  if(!supported[feature]?.includes(op)||flags.narrative_authority!==true||flags.playable_narration!==true
    ||db.isDirectorPaused(guild)||(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')!=='autonomous'
    ||!source||source.status!=='active'||policy?.data.mode!=='routine_delegated'||policy.data.revision!==intent.policy_revision
    ||!policy.data.allow?.includes(`${feature}.${op}`)||policy.data.expires_minute===null
    ||db.getSimulationClock(guild).minute>=policy.data.expires_minute
    ||db.getWorldEvent(guild,policy.source_event)?.status!=='active')return null;
  let owner=null;
  if(context.scope?.mode==='private'){
    if(!policy.data.private_allow?.includes(`${feature}.${op}`))return null;
    const p=conversationPrincipal(db,guild,context.scope.actorUserId,context.scope.actorCharacterId);
    if(p.kind!=='owner')return null;owner=p.revision;
  }
  // Subjective NPC/faction/institution evidence only. A player source or model label cannot supply actor knowledge.
  if(feature==='goal'||feature==='strategy')actorSource(db,guild,intent.payload,{requireResources:feature!=='strategy'});
  else if(feature==='institution')actorSource(db,guild,{actor_type:'institution',actor_key:intent.payload.institution,
    information_key:intent.payload.information_key,source_event:intent.payload.source_event});
  else if(feature==='consequence'&&!worldServiceEligible(db,guild,intent))return null;
  else if(feature==='group'&&!worldGroupEligible(db,guild,intent))return null;
  if(feature==='institution'&&intent.target_key){
    const row=db.getCityRecord(guild,'action',intent.target_key);
    if(!row||!['pending','proposed'].includes(row.status)||hash(row)!==intent.expected_revision
      ||Object.entries(intent.payload).some(([field,value])=>!['op','information_key'].includes(field)&&!same(row.data[field]??'',value)))return null;
    if(row.data.strategy_key){
      const plan=db.getCityRecord(guild,'strategy',row.data.strategy_key),scope=plan&&nativeWorldStrategyScope(db,guild,plan);
      if(plan?.data.native_world_origin&&(!scope||hash(scope)!==hash(context.scope||{mode:'party'})))return null;
    }
  }
  if(feature==='strategy'&&intent.target_key){
    const plan=db.getCityRecord(guild,'strategy',intent.target_key),origin=plan?.data.native_world_origin;
    if(origin){
      const root=db.getCityRecord(guild,'ai_intent',origin.receipt_ref);
      if(!root||!nativeWorldStrategyAllowed(db,guild,plan)||hash(root.data.scope)!==hash(context.scope||{mode:'party'}))return null;
    }
  }
  const binding={version:1,feature,operation:op,source:source.event_key,source_hash:hash(source),
    policy_ref:policy.record_key,policy_hash:hash(policy),policy_source:policy.source_event,expiry:policy.data.expires_minute,
    scope:structuredClone(context.scope||{mode:'party'}),owner,
    proposal_hash:hash(intent),payload:structuredClone(intent.payload),intent:structuredClone(intent),
    receipt_ref:context.nativeEffectKey||null,target_ref:intent.target_key||context.nativeEffectKey||null};
  const principal=applicationPrincipal(guild,'world.operation',`native-world-operation:${hash(binding)}`);
  grants.set(principal,{db,guild,binding});return principal;
}
/** Domain consumers recheck exact current source and operator policy. No serialized grant can pass. */
function nativeWorldOperationAllows(db,guild,principal,feature,operation,input){
  const stored=grants.get(principal),b=stored?.binding;
  if(!principalAllows(principal,guild,'world.operation')||stored.db!==db||stored.guild!==guild||b.feature!==feature
    ||b.operation!==operation||b.source!==input?.source_event||db.isDirectorPaused(guild)
    ||input.key!==undefined&&b.target_ref&&input.key!==b.target_ref
    ||Object.entries(b.payload).some(([key,value])=>!same(input[key],value))||db.getSimulationClock(guild).minute>=b.expiry
    ||(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode||'autonomous')!=='autonomous'
    ||hash(db.getWorldEvent(guild,b.source))!==b.source_hash
    ||hash(db.getCityRecord(guild,'ai_delegation',b.policy_ref))!==b.policy_hash)return false;
  if(b.scope.mode==='private'){
    const p=conversationPrincipal(db,guild,b.scope.actorUserId,b.scope.actorCharacterId);
    if(p.kind!=='owner'||p.revision!==b.owner)return false;
  }
  if(feature==='consequence'&&!worldServiceEligible(db,guild,b.intent))return false;
  if(feature==='institution'){
    try{actorSource(db,guild,{actor_type:'institution',actor_key:b.payload.institution,information_key:b.payload.information_key,source_event:b.source});}
    catch(error){if(error.expected===true)return false;throw error;}
  }
  return true;
}

function nativeWorldOperationOrigin(principal){
  const g=grants.get(principal);if(!g)return null;
  const b=g.binding;return {version:1,kind:'native_ai_gm',feature:b.feature,operation:b.operation,
    proposal_hash:b.proposal_hash,scope_hash:hash(b.scope),policy_source:b.policy_source,receipt_ref:b.receipt_ref,target_ref:b.target_ref,
    ...(b.owner?{owner_revision:b.owner}:{})};
}
/** Immutable receipt/audit reader only. Current admin expiry cannot erase a legitimately committed historical result. */
function inspectNativeWorldOperationReceipt(db,guild,row){
  const o=row?.data.authority_origin;if(!o)return row; // Original historical route retains original checks.
  const intent=row.data.intent,source=db.getWorldEvent(guild,o.policy_source);
  if(row.kind!=='ai_intent'||row.status!=='accepted'||o.version!==1||o.kind!=='native_ai_gm'
    ||!supported[o.feature]?.includes(o.operation)||o.feature!==intent?.feature||o.operation!==intent?.payload?.op
    ||o.receipt_ref&&o.receipt_ref!==row.record_key
    ||o.proposal_hash!==hash(intent)||o.scope_hash!==hash(row.data.scope)||source?.status!=='active'
    ||!source.event_key.startsWith('ai-policy:')
    ||db.mutationsForEntity(guild,row.record_key,20).filter(m=>m.actor_type==='system'&&m.actor_id==='ai_policy'
      &&m.source_layer==='city'&&m.visibility==='gm'&&m.mutation_type==='ai_intent'
      &&m.after_json&&hash(parse(m.after_json))===hash(row)).length!==1)
    throw Object.assign(new Error('Native world-operation receipt ancestry changed; reconcile without replay.'),{code:'NATIVE_WORLD_OPERATION',expected:true});
  return row;
}

/** Current execution eligibility for a saved native plan, not a waiver of step/source/goal/range/cost validators. */
function nativeWorldStrategyAllowed(db,guild,plan){
  const o=plan?.data.native_world_origin,policy=db.getCityRecord(guild,'ai_delegation','campaign');
  if(!o?.receipt_ref||plan.kind!=='strategy'||plan.data.reviewed_by!=='ai_policy'
    ||!nativeWorldCoordinatorReady(db,guild,'strategy','run')||plan.data.delegation_revision!==policy?.data.revision
    ||db.getWorldEvent(guild,plan.source_event)?.status!=='active')return false;
  const root=db.getCityRecord(guild,'ai_intent',o.receipt_ref);
  if(!root||root.status!=='accepted'||!root.data.authority_origin||root.data.intent?.feature!=='strategy'||root.data.result?.record_key!==plan.record_key
    ||hash(root.data.authority_origin)!==hash(o)||root.data.intent.payload.actor_type!==plan.data.actor_type
    ||root.data.intent.payload.actor_key!==plan.data.actor_key||root.data.intent.payload.goal_key!==plan.data.goal_key)return false;
  try{inspectNativeWorldOperationReceipt(db,guild,root);}catch(error){if(error.code==='NATIVE_WORLD_OPERATION')return false;throw error;}
  const original=root.data.result.data,blueprint=p=>p.steps.map(s=>({key:s.key,requires:s.requires,action:s.action}));
  if(!original||!Array.isArray(original.steps)||!Array.isArray(plan.data.steps)
    ||hash(blueprint(original))!==hash(blueprint(plan.data))||original.cost_ceiling!==plan.data.cost_ceiling
    ||original.deadline_minute!==plan.data.deadline_minute||original.source_event!==plan.data.source_event)return false;
  if(root.data.scope?.mode==='private'){
    if(!policy.data.private_allow?.includes('strategy.run'))return false;
    const s=root.data.scope;let p;
    try{p=conversationPrincipal(db,guild,s.actorUserId,s.actorCharacterId);}
    catch(error){if(expectedOwnerErrors.has(error.message))return false;throw error;}
    if(p.kind!=='owner'||!o.owner_revision||p.revision!==o.owner_revision)return false;
  }
  try{actorSource(db,guild,plan.data,{requireResources:false});}
  catch(error){if(error.expected===true||['Dead or removed NPCs are unavailable.','An active human NPC proxy retains voluntary control.',
    'NPC has an incompatible established commitment; cancel or delegate explicitly.'].includes(error.message))return false;throw error;}
  return true;
}
/** Preserve original private scope in queued producers; this is metadata, not an execution capability. */
function nativeWorldStrategyScope(db,guild,plan){
  if(!nativeWorldStrategyAllowed(db,guild,plan))return null;
  const root=db.getCityRecord(guild,'ai_intent',plan.data.native_world_origin.receipt_ref);
  return structuredClone(root.data.scope);
}
/** Synchronous execution frame; model JSON and persisted native-origin metadata cannot mint this live capability. */
function withNativeStrategyExecution(db,guild,principal,plan,fn){
  const grant=grants.get(principal),payload=grant?.binding.payload;
  const fresh=!!grant&&grant.binding.operation==='run'&&nativeWorldOperationAllows(db,guild,principal,'strategy','run',{...payload,key:plan.record_key});
  if(!fresh&&!nativeWorldStrategyAllowed(db,guild,plan))throw new Error('Native strategy execution needs current exact source/policy authority.');
  const before=executingStrategies.get(db),frame={guild,key:plan.record_key,revision:plan.data.revision,source:plan.source_event};
  executingStrategies.set(db,frame);
  try{const result=fn();if(result?.then)throw new Error('Native strategy execution must be synchronous.');return result;}
  finally{if(before)executingStrategies.set(db,before);else executingStrategies.delete(db);}
}
/** Used by queued native action consumers. Historical result readers do not execute this gate. */
function nativeWorldStrategyStepAllowed(db,guild,plan,action){
  if(!action||action.strategy_key!==plan.record_key||action.strategy_revision!==plan.data.revision)return false;
  const frame=executingStrategies.get(db);
  const live=frame?.guild===guild&&frame.key===plan.record_key&&frame.revision===plan.data.revision&&frame.source===plan.source_event;
  if(!live&&!nativeWorldStrategyAllowed(db,guild,plan))return false;
  const institution=plan.data.actor_type==='institution';
  if(institution? action.institution!==plan.data.actor_key||action.source_event!==plan.source_event
    :action.actor_type!==plan.data.actor_type||action.actor_key!==plan.data.actor_key
      ||action.information_key!==plan.data.information_key)return false;
  return plan.data.steps.some(step=>{
    if(!step.action||Object.entries(step.action).some(([field,value])=>!same(action[field],value)))return false;
    if(live&&step.status==='ready')return step.requires.every(ref=>plan.data.steps.some(s=>s.key===ref&&s.status==='completed'));
    if(step.status!=='submitted'||!step.action_id)return false;
    const saved=institution?db.getCityRecord(guild,'action',step.action_id):db.getSimulationRecord(guild,step.action_id);
    return !!saved&&hash(saved.data)===hash(action);
  });
}

return Object.freeze({nativeWorldCoordinatorReady,nativeWorldOperationCatalog,prepareNativeWorldOperation,nativeWorldOperationAllows,nativeWorldOperationOrigin,inspectNativeWorldOperationReceipt,nativeWorldStrategyAllowed,nativeWorldStrategyScope,withNativeStrategyExecution,nativeWorldStrategyStepAllowed});
}
