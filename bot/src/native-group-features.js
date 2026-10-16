/** Source-pinned spotlight features with independent, owner-executed reaction children.
 * No model effects, PC dice, choice, or consent are executed during preparation. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {inspectNativeGmDecision,inspectCommittedGmDecision,nativeReactionTarget,commitGmActionCost} from './gm-action-capability.js';
import {featureCostPlan} from './native-feature-windows.js';
import {currentScene,scenePresence,sceneAccess,RANGE_BANDS} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {conversationPrincipal} from './conversation-principal.js';
import {personalCharacter} from './personal-continuity.js';
import {indexWorldEvent} from './city-calendar.js';
import {typedRollProof} from './typed-roll-proof.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {EncounterLibrary} from './encounter.js';
import {reserveGmArbitrationNotice} from './native-publications.js';

const LANES='adversary:traffic-saint:all-lanes-stop',FLASH='adversary:aster-vale-contractor:flashbang';
const REGENT='adversary:pale-regent:command-the-blood';
const policies=Object.freeze({[LANES]:Object.freeze({trait:'Instinct',difficulty:14,range:'Far',all:true,condition:'Movement limited',expiry:'next_spotlight'}),
  [FLASH]:Object.freeze({trait:'Instinct',difficulty:12,range:'Close',all:false,condition:'Vulnerable',expiry:'until_cleared'}),
  [REGENT]:Object.freeze({trait:'Presence',difficulty:20,range:'Melee',all:false,condition:null,expiry:null})});
const executionKey=key=>`group-feature:${hash(key)}`,effectKey=key=>`group-effect:${hash(key)}`;
export const isGroupFeature=key=>Object.hasOwn(policies,key);
export function groupReactionRules(key){
  const policy=policies[key];if(!policy)throw fail('group_feature_fixed_rules');
  return Object.freeze({trait:policy.trait,difficulty:policy.difficulty});
}
const needsChoice=(feature,success)=>feature===FLASH&&success||feature===REGENT&&!success;
export const groupReactionOptions=feature=>feature===REGENT?['hope','stress','command']:feature===FLASH?['vulnerable','stress']:[];
export function groupFeatureStakes(key){
  if(key===LANES)return 'On failure you cannot move beyond Very Close until after the Saint next takes the spotlight. On success no restriction applies. No roll or failed response is assumed.';
  if(key===FLASH)return 'On failure become Vulnerable and mark 1 Stress. On success YOU choose Vulnerable or 1 Stress. Silence/withdrawal is not a failed reaction.';
  if(key===REGENT)return 'On failure YOU choose lose 2 Hope, mark 2 Stress, or one immediate non-suicidal command. Command compliance needs an exact communicated command and supported owner declaration; it is never invented. Success applies no consequence. Silence/withdrawal is not failure.';
  throw fail('group_feature_stakes');
}
export function planGroupFeature(db,guild,o,entry,p,feature,{library,opportunity}={}){
  const policy=policies[feature?.feature_key];
  if(!policy||entry.actor.type!=='npc'||entry.operation!=='feature'||p.disposition!=='native_feature_resolution'||p.stakes_kind!=='native_feature'
    ||p.trait!==policy.trait||p.difficulty!==policy.difficulty||p.proposal_version===2||p.experience_ref||p.advantage||p.disadvantage
    ||!p.rule_basis_refs.includes('srd:reaction-rolls'))throw fail('group_feature_fixed_rules');
  const scene=currentScene(db,guild),encounter=db.getCurrentEncounter(scene.session_id),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    bound=binding?.data.combatants.find(b=>b.actor===entry.actor.key),c=bound&&db.listCombatants(encounter.id).find(c=>c.id===bound.id),
    template=c&&library.findAdversary(c.base_name),actor=scenePresence(db,guild,'npc',entry.actor.key);
  if(encounter?.status!=='active'||c?.status!=='active'||c.hp_current<=0||!template||hash(template)!==feature.template_hash
    ||activeCityProxy(db,guild,entry.actor.key)||actor?.data.state!=='actually_present'||actor.location_key!==o.binding.location
    ||db.getWorldEvent(guild,binding.source_event)?.status!=='active'||db.getWorldEvent(guild,actor.source_event)?.status!=='active')throw fail('group_feature_actor_source');
  const eligible=db.roster(scene.session_id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>db.getCharacter(r.character_id)).filter(pc=>{
    const target=scenePresence(db,guild,'character',pc.id),range=actor.data.zone===target?.data.zone?'Melee':target?.data.range;
    return target?.data.state==='actually_present'&&target.location_key===actor.location_key&&RANGE_BANDS.includes(range)
      &&narrativeSourceVisible(db,guild,target.source_event,o.scope)
      &&RANGE_BANDS.indexOf(range)<=RANGE_BANDS.indexOf(policy.range)
      &&sceneAccess(db,guild,{observer_type:'npc',observer_key:entry.actor.key,target_type:'character',target_key:pc.id,sense:'sight'});
  });
  if(!entry.target_refs.length||!policy.all&&entry.target_refs.length!==1||new Set(entry.target_refs).size!==entry.target_refs.length
    ||entry.target_refs.some(id=>!eligible.some(pc=>pc.id===id))
    ||policy.all&&hash([...entry.target_refs].sort())!==hash(eligible.map(pc=>pc.id).sort()))throw fail('group_feature_exact_target_cohort');
  const targets=entry.target_refs.map(id=>{
    const pc=eligible.find(pc=>pc.id===id),snapshot=nativeReactionTarget(db,guild,o,pc,entry.actor.key,{maxRange:policy.range});
    return {character:id,owner:pc.owner_user_id,principal:snapshot.principal,target_snapshot:snapshot,resources_hash:hash(pc.data.resources)};
  });
  const cost=featureCostPlan(feature,{timing:'spotlight_action',fear:db.getCampaign(guild).fear,stress:c.stress_current,stressMax:c.stress_max});
  return {operation:'commit_group_feature',feature:feature.feature_key,feature_hash:hash(feature),feature_definition:feature,template_hash:feature.template_hash,
    actor:entry.actor.key,combatant:c.id,actor_source:actor.source_event,combatant_hash:hash(c),targets,opportunity,cost};
}
export function prepareGroupFeature(db,guild,key,{library=new EncounterLibrary('../content')}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,'gm_group_feature_execution',executionKey(key));if(prior)return inspectGroupFeature(db,guild,prior.record_key).execution;
    const {row,entry}=inspectNativeGmDecision(db,guild,key),n=row.data.native,feature=compileNativeFeatures().find(f=>f.feature_key===n?.feature);
    if(n?.operation!=='commit_group_feature'||hash(planGroupFeature(db,guild,{binding:row.data.origin,scope:row.data.scope},entry,row.data.proposal,feature,{library,opportunity:n.opportunity}))!==hash(n))
      throw fail('group_feature_state_changed');
    const cost=commitGmActionCost(db,guild,key),children=n.targets.map(target=>{
      const childKey=`group-reaction:${hash([key,target.character])}`,proposal={...row.data.proposal,intent_ref:entry.intent_ref},
        data={...row.data,proposal,proposal_hash:hash(proposal),native:{operation:'request_group_feature_reaction',parent:key,execution:executionKey(key),
          feature:n.feature,feature_hash:n.feature_hash,...target},authority:'Exact native feature child. Only this owner may submit dice or choose a response.'};
      const source=indexWorldEvent(db,guild,{key:`${childKey}:source`,kind:'native_gm_arbitration',source_id:'native:unified-gm',title:'Owner-private feature reaction invitation',
        session_id:row.data.origin.session,scene:row.data.origin.scene,location_key:row.data.origin.location,visibility:'gm',details:{board:row.data.board,payload_hash:hash(data)}},'native:unified-gm');
      const child=db.saveCityRecord(guild,{kind:'gm_arbitration_decision',key:childKey,status:'pending_pc_reaction',source_event:source.event_key,visibility:'gm',data});
      return {decision:child.record_key,character:target.character,hash:hash(data)};
    });
    const data={version:1,decision:key,feature:n.feature,feature_hash:n.feature_hash,cost:cost.record_key,cost_hash:hash(cost),children};
    const source=indexWorldEvent(db,guild,{key:`${executionKey(key)}:source`,kind:'native_group_feature',source_id:'native:unified-gm',title:'Committed native multi-owner feature',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'gm',details:{payload_hash:hash(data),input_source:row.source_event}},'native:unified-gm');
    return db.saveCityRecord(guild,{kind:'gm_group_feature_execution',key:executionKey(key),status:'awaiting_owners',source_event:source.event_key,visibility:'gm',data});
  });
}
export function inspectGroupFeature(db,guild,key){
  const execution=db.getCityRecord(guild,'gm_group_feature_execution',key),v=execution?.data,event=execution&&db.getWorldEvent(guild,execution.source_event),
    parent=v&&inspectCommittedGmDecision(db,guild,v.decision),n=parent?.row.data.native,cost=v&&db.getCityRecord(guild,'gm_action_cost_receipt',v.cost);
  if(v?.version!==1||execution.visibility!=='gm'||!parent||key!==executionKey(v.decision)||!isGroupFeature(v.feature)
    ||event?.status!=='active'||event.kind!=='native_group_feature'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||event.details.input_source!==parent.row.source_event||n?.operation!=='commit_group_feature'||n.feature!==v.feature||n.feature_hash!==v.feature_hash
    ||hash(n.feature_definition)!==v.feature_hash||cost?.status!=='committed'||cost.source_event!==parent.row.source_event||hash(cost)!==v.cost_hash
    ||cost.data.decision!==v.decision||db.getWorldEvent(guild,n.actor_source)?.status!=='active'||v.children.length!==n.targets.length)throw fail('group_feature_execution_ancestry');
  for(const [i,c] of v.children.entries()){
    const row=db.getCityRecord(guild,'gm_arbitration_decision',c.decision),source=row&&db.getWorldEvent(guild,row.source_event),target=n.targets[i];
    if(row?.status!=='pending_pc_reaction'||row.visibility!=='gm'||c.character!==target.character||hash(row.data)!==c.hash
      ||row.data.native.parent!==v.decision||row.data.native.execution!==key||row.data.native.character!==target.character
      ||!source||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(row.data))throw fail('group_feature_child_ancestry');
  }
  if(execution.status==='resolved'){
    const progress=db.getCityRecord(guild,'gm_group_feature_progress',key),source=progress&&db.getWorldEvent(guild,progress.source_event);
    if(progress?.status!=='resolved'||progress.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_group_progress'
      ||source.source_id!=='native:unified-gm'||source.details.payload_hash!==hash(progress.data)||progress.data.execution!==key
      ||progress.data.execution_hash!==hash(v)||progress.data.children.length!==v.children.length)throw fail('group_terminal_native_progress');
    for(const [i,p] of progress.data.children.entries()){
      const child=db.getCityRecord(guild,'gm_arbitration_decision',v.children[i].decision),n=child.data.native;
      if(p.decision!==child.record_key||p.character!==n.character||!['resolved','withdrawn'].includes(p.status))throw fail('group_terminal_child_disposition');
      if(p.status==='resolved'){
        const effect=db.getCityRecord(guild,'gm_group_feature_effect',p.proof),e=effect&&db.getWorldEvent(guild,effect.source_event),request=effect&&db.getCityRecord(guild,'roll_request',effect.data.request),
          roll=request&&db.getSavedRoll(guild,request.data.roll_id);
        if(p.proof!==effectKey(child.record_key)||effect?.status!=='resolved'||effect.subject_key!==n.character||effect.data.owner!==n.owner
          ||effect.data.decision!==child.record_key||e?.status!=='active'||e.kind!=='native_group_feature_effect'||e.source_id!=='native:unified-gm'
          ||e.details.payload_hash!==hash(effect.data)||hash(request)!==effect.data.request_hash||hash(roll)!==effect.data.roll_hash)
          throw fail('group_terminal_actual_effect');
      }else{
        const terminal=db.getCityRecord(guild,'gm_reaction_submission',p.proof),e=terminal&&db.getWorldEvent(guild,terminal.source_event);
        if(p.proof!==`gm-reaction-submit:${hash([child.record_key,n.owner])}`||terminal?.status!=='withdrawn'||terminal.subject_key!==n.character
          ||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(child.data)||e?.status!=='active'||e.kind!=='native_gm_reaction_withdrawal'
          ||e.subject_key!==n.character||e.source_id!==`player:${n.owner}`||e.details.invitation!==child.record_key||e.details.revision!==hash(child.data)
          ||!db.ownerAuthoredSource(guild,e.event_key,n.owner))throw fail('group_terminal_actual_withdrawal');
      }
    }
  }
  return {execution,parent:parent.row,entry:parent.entry,cost};
}
/** Current child recipient proof, independent of the triggering player's later resources/ownership. */
export function inspectGroupFeatureChild(db,guild,row){
  const n=row.data.native,{execution,parent}=inspectGroupFeature(db,guild,n.execution),scene=currentScene(db,guild),pc=db.getCharacter(n.character);
  if(pc?.owner_user_id!==n.owner)throw fail('group_feature_current_recipient_source');
  let principal;
  try{principal=conversationPrincipal(db,guild,n.owner,pc.id);}
  catch(error){if(!['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))throw error;
    throw fail('group_feature_owner_control_unavailable');}
  const presence=scenePresence(db,guild,'character',pc.id);
  if(!execution.data.children.some(c=>c.decision===row.record_key&&c.hash===hash(row.data))||n.parent!==parent.record_key
    ||pc?.owner_user_id!==n.owner||principal?.kind!=='owner'||principal.revision!==n.principal||scene.key!==row.data.origin.scene||scene.session_id!==row.data.origin.session
    ||hash(presence)!==n.target_snapshot.target||db.getWorldEvent(guild,presence?.source_event)?.status!=='active'
    ||db.getWorldEvent(guild,row.source_event)?.status!=='active')throw fail('group_feature_current_recipient_source');
  return {execution,parent,pc};
}
export function groupReactionState(db,guild,row,terminal){
  const {pc}=inspectGroupFeatureChild(db,guild,row),effect=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));
  if(effect){validateGroupReactionEffect(db,guild,effect.record_key);return effect.status;}
  const review=db.getCityRecord(guild,'gm_group_feature_review',effectKey(row.record_key));
  if(review)return 'needs_rules_review';
  const choice=db.getCityRecord(guild,'gm_group_feature_choice',effectKey(row.record_key));
  if(choice){
    const request=terminal?.status==='resolved'&&db.getCityRecord(guild,'roll_request',terminal.data.request);
    if(!request||!needsChoice(row.data.native.feature,typedRollProof(db,guild,request).outcome==='success')
      ||choice.status!=='awaiting_owner'||choice.visibility!=='character'||choice.subject_key!==pc.id
      ||choice.source_event!==row.source_event||choice.data.decision!==row.record_key||choice.data.request!==request?.record_key
      ||hash(choice.data.options)!==hash(groupReactionOptions(row.data.native.feature)))throw fail('group_choice_pending_proof');
    return 'awaiting_owner';
  }
  if(!terminal&&hash(pc.data.resources)!==row.data.native.resources_hash)throw fail('group_feature_pending_resources_changed');
  return terminal?.status||'pending';
}
export function applyGroupReactionOutcome(db,guild,row,request,choiceSource=null,choice=null){
  return db.transaction(()=>{
  const result=db.transaction(()=>{
    const n=row.data.native,{pc,cost}= {...inspectGroupFeatureChild(db,guild,row),...inspectGroupFeature(db,guild,n.execution)},key=effectKey(row.record_key),
      prior=db.getCityRecord(guild,'gm_group_feature_effect',key),proof=typedRollProof(db,guild,request),policy=policies[n.feature],success=proof.outcome==='success';
    if(prior)return validateGroupReactionEffect(db,guild,key);
    if(request.data.kind!=='reaction'||request.data.input.gm_invitation!==row.record_key||request.subject_key!==pc.id
      ||request.data.owner_user_id!==n.owner||proof.difficulty!==policy.difficulty||proof.outcome==='needs_review')throw fail('group_actual_owner_reaction');
    const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,n.owner])}`),
      submission=terminal&&db.getWorldEvent(guild,terminal.source_event);
    if(terminal?.status!=='resolved'||terminal.data.request!==request.record_key||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(row.data)
      ||submission?.status!=='active'||!db.ownerAuthoredSource(guild,submission.event_key,n.owner))throw fail('group_actual_owner_submission');
    if(choice||choiceSource){
      const source=db.getWorldEvent(guild,choiceSource);
      if(!needsChoice(n.feature,success)||!groupReactionOptions(n.feature).includes(choice)||source?.status!=='active'||source.kind!=='native_group_feature_choice'
        ||source.source_id!==`player:${n.owner}`||source.visibility!=='character'||source.subject_key!==pc.id||source.session_id!==row.data.origin.session
        ||source.scene!==row.data.origin.scene||source.details.author!==n.owner||source.details.decision!==row.record_key||source.details.revision!==hash(row.data)
        ||source.details.choice!==choice||!db.ownerAuthoredSource(guild,source.event_key,n.owner)
        ||hash(JSON.parse(source.details.authored_text))!==hash({op:'gm-reaction-choice',request:row.record_key,revision:hash(row.data),choice}))throw fail('group_choice_native_owner_source');
    }
    if(needsChoice(n.feature,success)&&!choice)return db.saveCityRecord(guild,{kind:'gm_group_feature_choice',key,status:'awaiting_owner',source_event:row.source_event,
      visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,options:groupReactionOptions(n.feature)}});
    if(n.feature===REGENT&&choice==='command')return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',
      source_event:row.source_event,visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,choice_source:choiceSource,
        reason:'A communicated bounded non-suicidal command and exact supported owner declaration/effect are required. No compliance, surrender, speech or resource change was inferred.'}});
    const stress=n.feature===REGENT?(choice==='stress'?2:0):n.feature===FLASH&&(!success||choice==='stress')?1:0,
      hope=n.feature===REGENT&&choice==='hope'?2:0,condition=n.feature!==REGENT&&(!success||n.feature===FLASH&&choice==='vulnerable'),
      before=structuredClone(pc.data),after=structuredClone(before);
    if(hash(before.resources)!==n.resources_hash||stress&&before.resources.stress.current+stress>before.resources.stress.max
      ||hope&&(!Number.isSafeInteger(before.resources.hope)||before.resources.hope<hope))
      return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',source_event:row.source_event,visibility:'character',subject_key:pc.id,
        data:{decision:row.record_key,request:request.record_key,reason:'Current resources, insufficient Hope or native Stress-overflow adapter need review; committed owner dice are preserved.'}});
    if(stress)after.resources.stress.current+=stress;
    if(hope)after.resources.hope-=hope;
    const existing=condition&&(before.conditions||[]).find(c=>(typeof c==='string'?c:c.name)===policy.condition&&c.active!==false);
    if(existing&&!existing.native_ref)return db.saveCityRecord(guild,{kind:'gm_group_feature_review',key,status:'needs_rules_review',source_event:row.source_event,
      visibility:'character',subject_key:pc.id,data:{decision:row.record_key,request:request.record_key,reason:'Existing condition has no verified native duration/source; no stacking or replacement.'}});
    if(existing)validateNativeCondition(db,guild,existing.native_ref);
    const conditionKey=condition?(existing?.native_ref||`${key}:condition`):null,condition_reused=!!existing;
    if(condition&&!existing){after.conditions=[...(after.conditions||[]),{name:policy.condition,native_ref:conditionKey,active:true}];}
    db.updateCharacterData(pc.id,data=>Object.assign(data,after));
    const mutation=db.recordMutation(guild,{sessionId:row.data.origin.session,actorType:'ai_gm',actorId:'native:unified-gm',sourceLayer:'native_feature',mutationType:'verified_group_feature',
      entityKey:pc.id,visibility:'character',before,after,rationale:'Verified owner reaction and optional exact owner choice.',payload:{decision:row.record_key,request:request.record_key}});
    const data={version:n.feature===REGENT?2:1,...(n.feature===REGENT?{hope}:{}),decision:row.record_key,parent:n.parent,feature:n.feature,feature_hash:n.feature_hash,character:pc.id,owner:n.owner,request:request.record_key,
      roll:request.data.roll_id,request_hash:hash(request),roll_hash:hash(db.getSavedRoll(guild,request.data.roll_id)),request_source_hash:hash(submission),
      success,choice,choice_source:choiceSource,before,after,stress,condition:conditionKey,condition_reused,mutation:mutation.id,cost:cost.record_key};
    const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_group_feature_effect',source_id:'native:unified-gm',title:'Native owner-specific feature consequence',
      session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:pc.id,details:{payload_hash:hash(data),owner_source:request.source_event}},'native:unified-gm');
    const effect=db.saveCityRecord(guild,{kind:'gm_group_feature_effect',key,status:'resolved',source_event:event.event_key,visibility:'character',subject_key:pc.id,data});
    if(condition&&!existing){const v={version:1,effect:key,character:pc.id,owner:n.owner,actor:inspectGroupFeature(db,guild,n.execution).entry.actor.key,
      feature:n.feature,condition:policy.condition,expiry:policy.expiry,scene:row.data.origin.scene,cast_spotlight:cost.data.spotlight?.index??null};
      const source=indexWorldEvent(db,guild,{key:`${conditionKey}:source`,kind:'native_pc_condition',source_id:'native:unified-gm',title:'Native sourced temporary condition',
        session_id:row.data.origin.session,scene:v.scene,visibility:'character',subject_key:pc.id,details:{payload_hash:hash(v)}},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'pc_native_condition',key:conditionKey,actor_key:pc.id,status:'active',source_event:source.event_key,visibility:'character',subject_key:pc.id,data:v});}
    return effect;
  });
  settleGroupFeature(db,guild,row.data.native.execution);
  reserveGmArbitrationNotice(db,guild,row.record_key);
  return result;
  });
}
/** Per-target progress only; no inferred failure, consent, public disclosure or mechanical execution. */
export function settleGroupFeature(db,guild,key){
  const {execution,parent}=inspectGroupFeature(db,guild,key),children=execution.data.children.map(c=>{
    const row=db.getCityRecord(guild,'gm_arbitration_decision',c.decision),n=row.data.native,
      terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,n.owner])}`);
    let status='pending',proof=null;
    try{
      if(terminal){const source=db.getWorldEvent(guild,terminal.source_event);
        if(terminal.subject_key!==n.character||terminal.visibility!=='character'||terminal.data.owner!==n.owner||terminal.data.invitation_hash!==hash(row.data)
          ||source?.status!=='active'||!db.ownerAuthoredSource(guild,source.event_key,n.owner))throw fail('group_progress_owner_source');
        if(terminal.status==='withdrawn'&&(source.kind!=='native_gm_reaction_withdrawal'||source.details.invitation!==row.record_key
          ||source.details.revision!==hash(row.data)))throw fail('group_progress_exact_withdrawal');
        if(!['resolved','withdrawn'].includes(terminal.status))throw fail('group_progress_native_terminal');
        proof=terminal.record_key;
      }
      status=groupReactionState(db,guild,row,terminal);
      if(status==='resolved'){const effect=validateGroupReactionEffect(db,guild,effectKey(row.record_key));proof=effect.record_key;}
    }catch(error){if(!['GM_ARBITRATION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;status='needs_review';}
    return {decision:c.decision,character:c.character,status,proof};
  });
  const status=children.every(c=>['resolved','withdrawn'].includes(c.status))?'resolved':'awaiting_owners',
    data={version:1,execution:key,execution_hash:hash(execution.data),children},
    source=indexWorldEvent(db,guild,{key:`group-progress:${hash(data)}`,kind:'native_group_progress',source_id:'native:unified-gm',
      title:'Verified per-owner group disposition',session_id:parent.data.origin.session,scene:parent.data.origin.scene,
      visibility:'gm',details:{payload_hash:hash(data)}},'native:unified-gm');
  db.saveCityRecord(guild,{kind:'gm_group_feature_progress',key,status,source_event:source.event_key,visibility:'gm',data});
  return db.saveCityRecord(guild,{...execution,key,status});
}
export function groupReactionDetails(db,guild,row){
  const effect=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));if(!effect)return null;
  validateGroupReactionEffect(db,guild,effect.record_key);
  return {ref:effect.record_key,revision:hash(effect.data),success:effect.data.success,stress_marked:effect.data.stress,
    ...(effect.data.feature===REGENT?{hope_spent:effect.data.hope}:{}),
    condition:effect.data.condition?policies[effect.data.feature].condition:null,condition_reused:effect.data.condition_reused};
}
export function validateGroupReactionEffect(db,guild,key,{historical=false}={}){
  const row=db.getCityRecord(guild,'gm_group_feature_effect',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    decision=v&&db.getCityRecord(guild,'gm_arbitration_decision',v.decision),n=decision?.data.native,policy=n&&policies[n.feature];
  if(!v||row.status!=='resolved'||row.visibility!=='character'||row.subject_key!==v.character||!decision||!policy)throw fail('group_effect_identity');
  if(historical)inspectGroupFeature(db,guild,n.execution);else inspectGroupFeatureChild(db,guild,decision);
  const request=db.getCityRecord(guild,'roll_request',v.request),
    requestSource=request&&db.getWorldEvent(guild,request.source_event),roll=request&&db.getSavedRoll(guild,request.data.roll_id);
  // A sealed, already verified reaction is read-only history after duration expiry. It
  // never grants a new action/consent or lets an old recipient receive a new notice.
  if(hash(request)!==v.request_hash||hash(roll)!==v.roll_hash||requestSource?.status!=='active'||hash(requestSource)!==v.request_source_hash)
    throw fail('group_effect_immutable_reaction_snapshot');
  const proof=historical?{difficulty:request.data.breakdown.difficulty,outcome:request.data.result.duality==='Critical'||request.data.result.total>=request.data.breakdown.difficulty?'success':'failure'}:
    typedRollProof(db,guild,request),
    terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([decision.record_key,n.owner])}`),mutation=db.getMutation(guild,v.mutation),expected=structuredClone(v.before);
  if(v.stress)expected.resources.stress.current+=v.stress;
  if(v.hope)expected.resources.hope-=v.hope;
  if(v.condition&&!v.condition_reused)expected.conditions=[...(expected.conditions||[]),{name:policy.condition,native_ref:v.condition,active:true}];
  if(v.condition_reused){
    const existing=validateNativeCondition(db,guild,v.condition);
    if(existing.data.condition!==policy.condition||existing.subject_key!==v.character||!(v.before.conditions||[]).some(c=>c.native_ref===v.condition&&c.active))
      throw fail('group_condition_reuse_source');
  }
  const requiredChoice=needsChoice(n.feature,v.success),stress=n.feature===REGENT?(v.choice==='stress'?2:0):n.feature===FLASH&&(!v.success||v.choice==='stress')?1:0,
    hope=n.feature===REGENT&&v.choice==='hope'?2:0,condition=n.feature!==REGENT&&(!v.success||n.feature===FLASH&&v.choice==='vulnerable'),
    choice=v.choice_source&&db.getWorldEvent(guild,v.choice_source);
  if(event?.status!=='active'||event.kind!=='native_group_feature_effect'||event.source_id!=='native:unified-gm'||event.visibility!=='character'||event.subject_key!==v.character
    ||event.details.payload_hash!==hash(v)||event.details.owner_source!==request.source_event||key!==effectKey(v.decision)||v.character!==n.character||v.owner!==n.owner
    ||v.feature!==n.feature||v.feature_hash!==n.feature_hash||v.parent!==n.parent||v.roll!==request.data.roll_id||request.data.input.gm_invitation!==v.decision
    ||request.subject_key!==v.character||request.data.owner_user_id!==v.owner||request.data.kind!=='reaction'||proof.difficulty!==policy.difficulty||proof.outcome==='needs_review'
    ||v.success!==(proof.outcome==='success')||terminal?.status!=='resolved'||terminal.data.request!==v.request||terminal.data.invitation_hash!==hash(decision.data)
    ||hash(v.before.resources)!==n.resources_hash||v.stress!==stress||!!v.condition!==condition||typeof v.condition_reused!=='boolean'
    ||v.condition&&!v.condition_reused&&v.condition!==`${key}:condition`||v.condition_reused&&!v.condition
    ||hash(v.after)!==hash(expected)||stress&&v.before.resources.stress.current+stress>v.before.resources.stress.max
    ||(n.feature===REGENT?v.version!==2||v.hope!==hope:v.version!==1||v.hope!==undefined)
    ||hope&&(!Number.isSafeInteger(v.before.resources.hope)||v.before.resources.hope<hope)
    ||requiredChoice&&(!groupReactionOptions(n.feature).filter(c=>c!=='command').includes(v.choice)||choice?.status!=='active'||choice.kind!=='native_group_feature_choice'
      ||choice.source_id!==`player:${v.owner}`||choice.visibility!=='character'||choice.subject_key!==v.character||choice.details.choice!==v.choice||choice.details.decision!==v.decision
      ||choice.session_id!==decision.data.origin.session||choice.scene!==decision.data.origin.scene||choice.details.revision!==hash(decision.data)
      ||hash(JSON.parse(choice.details.authored_text))!==hash({op:'gm-reaction-choice',request:v.decision,revision:hash(decision.data),choice:v.choice})
      ||!db.ownerAuthoredSource(guild,choice.event_key,v.owner))||!requiredChoice&&(v.choice!==null||v.choice_source!==null)
    ||mutation?.source_layer!=='native_feature'||mutation.entity_key!==v.character||hash(JSON.parse(mutation.before_json))!==hash(v.before)
    ||hash(JSON.parse(mutation.after_json))!==hash(v.after))throw fail('group_effect_native_ancestry');
  return row;
}
export function chooseGroupReactionOutcome(db,guild,user,input,{interactionId,authoredText}={}){
  if(!interactionId||typeof authoredText!=='string'||Object.keys(input).sort().join()!=='choice,op,request,revision'||input.op!=='gm-reaction-choice'
      ||hash(JSON.parse(authoredText))!==hash(input)||!['stress','vulnerable','hope','command'].includes(input.choice))throw fail('exact_group_owner_choice');
  return db.transaction(()=>{
    const row=db.getCityRecord(guild,'gm_arbitration_decision',input.request),n=row?.data.native;
    if(!row||!groupReactionOptions(n?.feature).includes(input.choice)||n.operation!=='request_group_feature_reaction'
      ||n.owner!==user||input.revision!==hash(row.data))throw fail('group_choice_owner_revision');
    personalCharacter(db,guild,user,n.character);inspectGroupFeatureChild(db,guild,row);
    const terminal=db.getCityRecord(guild,'gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,user])}`),
      request=terminal?.status==='resolved'&&db.getCityRecord(guild,'roll_request',terminal.data.request),prior=db.getCityRecord(guild,'gm_group_feature_effect',effectKey(row.record_key));
    if(prior){const effect=validateGroupReactionEffect(db,guild,prior.record_key);if(effect.data.choice!==input.choice)throw fail('committed_group_choice_changed');return effect;}
    if(!request||!needsChoice(n.feature,typedRollProof(db,guild,request).outcome==='success'))throw fail('group_choice_actual_success');
    const source=indexWorldEvent(db,guild,{key:`${effectKey(row.record_key)}:choice${n.feature===REGENT?':'+hash([input.choice,interactionId]):''}`,kind:'native_group_feature_choice',source_id:`player:${user}`,
      title:'Affected owner selects exactly one native feature consequence',session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'character',subject_key:n.character,
      details:{author:user,decision:row.record_key,revision:input.revision,choice:input.choice,authored_text:authoredText,interaction:interactionId}},user);
    if(source.status!=='active')throw fail('group_choice_source_revoked');
    return applyGroupReactionOutcome(db,guild,row,request,source.event_key,input.choice);
  });
}
const cursorKey=(actor,scene)=>`gm-spotlight:${hash([actor,scene])}`;
function spotlightCursor(db,guild,actor,scene){
  const row=db.getCityRecord(guild,'native_gm_spotlight_cursor',cursorKey(actor,scene));
  if(!row)return null;
  const source=db.getWorldEvent(guild,row.source_event);
  if(source?.status!=='active'||source.kind!=='native_gm_spotlight'||source.source_id!=='native:unified-gm'
    ||source.details.payload_hash!==hash(row.data)||row.data.actor!==actor||row.data.scene!==scene||!Number.isSafeInteger(row.data.index)||row.data.index<1)
    throw fail('native_spotlight_cursor_ancestry');
  return row;
}
export function planNativeSpotlight(db,guild,actor,scene,cost){
  return {actor,scene,index:(spotlightCursor(db,guild,actor,scene)?.data.index||0)+1,cost};
}
/** Called by the existing native cost commit, not model JSON. Reaction features never enter this path. */
export function recordNativeSpotlight(db,guild,cost){
  const stored=db.getCityRecord(guild,'gm_action_cost_receipt',cost.record_key),{row,entry}=inspectCommittedGmDecision(db,guild,cost.data.decision),v=cost.data.spotlight,
    current=spotlightCursor(db,guild,entry.actor.key,row.data.origin.scene);
  if(current?.data.cost===cost.record_key)return current;
  if(!v||hash(stored)!==hash(cost)||cost.status!=='committed'||cost.source_event!==row.source_event||v.actor!==entry.actor.key||v.scene!==row.data.origin.scene
    ||v.cost!==cost.record_key||v.index!==(current?.data.index||0)+1)throw fail('native_spotlight_cost_source');
  const source=indexWorldEvent(db,guild,{key:`${cost.record_key}:spotlight`,kind:'native_gm_spotlight',source_id:'native:unified-gm',title:'Native GM actor spotlight',
    session_id:row.data.origin.session,scene:v.scene,visibility:'gm',details:{payload_hash:hash(v),cost_hash:hash(cost)}},'native:unified-gm');
  const pointer=db.saveCityRecord(guild,{kind:'native_gm_spotlight_cursor',key:cursorKey(v.actor,v.scene),status:'active',source_event:source.event_key,visibility:'gm',data:v});
  const conditions=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:'pc_native_condition',status:'active',includeGM:true,limit:100,offset});
    conditions.push(...page);if(page.length<100)break;}
  for(const condition of conditions.filter(c=>c.data.expiry==='next_spotlight'&&c.data.actor===v.actor&&c.data.scene===v.scene&&c.data.cast_spotlight<v.index)){
    try{
      validateNativeCondition(db,guild,condition.record_key);
      const pc=db.getCharacter(condition.subject_key),before=structuredClone(pc.data.conditions||[]),after=before.map(c=>c.native_ref===condition.record_key?{...c,active:false}:c);
      db.updateCharacterData(pc.id,data=>{data.conditions=after;});
      const data={condition:condition.record_key,condition_hash:hash(condition.data),spotlight:source.event_key,spotlight_hash:hash(v),character:pc.id,before,after,
        before_pc:hash(pc.data),after_pc:hash({...pc.data,conditions:after})};
      const expiry=indexWorldEvent(db,guild,{key:`${condition.record_key}:expiry`,kind:'native_condition_expiry',source_id:'native:unified-gm',title:'Feature-defined condition duration ends',
        session_id:row.data.origin.session,scene:v.scene,visibility:'character',subject_key:pc.id,details:data},'native:unified-gm');
      db.saveCityRecord(guild,{kind:'pc_native_condition_expiry',key:condition.record_key,actor_key:pc.id,status:'resolved',source_event:expiry.event_key,visibility:'character',subject_key:pc.id,data});
      db.saveCityRecord(guild,{...condition,key:condition.record_key,status:'expired'});
    }catch(error){if(!['GM_ARBITRATION','TYPED_ROLL_PROOF','SCENE_ACTION_WINDOW'].includes(error.code))throw error;
      db.saveCityRecord(guild,{kind:'native_condition_review',key:condition.record_key,status:'needs_review',source_event:condition.source_event,visibility:'gm',
        data:{condition:condition.record_key,reason:error.message,authority:'Hold this unverified condition only; independent native spotlight remains committed.'}});}
  }
  return pointer;
}
export function validateNativeCondition(db,guild,key){
  const row=db.getCityRecord(guild,'pc_native_condition',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event),
    effect=v&&validateGroupReactionEffect(db,guild,v.effect,{historical:row.status==='expired'}),child=effect&&db.getCityRecord(guild,'gm_arbitration_decision',effect.data.decision),
    parent=child&&inspectGroupFeature(db,guild,child.data.native.execution),policy=v&&policies[v.feature];
  if(v?.version!==1||!policy||!['active','expired'].includes(row.status)||row.visibility!=='character'||row.subject_key!==v.character
    ||event?.status!=='active'||event.kind!=='native_pc_condition'||event.source_id!=='native:unified-gm'||event.details.payload_hash!==hash(v)
    ||effect.data.condition!==key||v.character!==effect.data.character||v.owner!==effect.data.owner||v.feature!==effect.data.feature
    ||v.condition!==policy.condition||v.expiry!==policy.expiry||v.actor!==parent.entry.actor.key||v.scene!==parent.parent.data.origin.scene
    ||v.cast_spotlight!==parent.cost.data.spotlight?.index)throw fail('native_condition_effect_source');
  if(row.status==='expired'){
    const r=db.getCityRecord(guild,'pc_native_condition_expiry',key),source=r&&db.getWorldEvent(guild,r.source_event),spotlight=r&&db.getWorldEvent(guild,r.data.spotlight);
    if(r?.status!=='resolved'||source?.status!=='active'||source.kind!=='native_condition_expiry'||source.source_id!=='native:unified-gm'||hash(source.details)!==hash(r.data)
      ||r.data.condition_hash!==hash(v)||spotlight?.status!=='active'||spotlight.kind!=='native_gm_spotlight'||spotlight.source_id!=='native:unified-gm'
      ||spotlight.details.payload_hash!==r.data.spotlight_hash||v.expiry!=='next_spotlight'||r.data.condition!==key||r.data.character!==v.character
      ||r.visibility!=='character'||r.subject_key!==v.character||source.visibility!=='character'||source.subject_key!==v.character
      ||hash(r.data.after)!==hash(r.data.before.map(c=>c.native_ref===key?{...c,active:false}:c)))throw fail('native_condition_expiry_source');
    const cost=db.getCityRecord(guild,'gm_action_cost_receipt',spotlight.event_key.slice(0,-10)),sv=cost?.data.spotlight;
    if(!cost||hash(sv)!==r.data.spotlight_hash||hash(cost)!==spotlight.details.cost_hash||sv.actor!==v.actor||sv.scene!==v.scene
      ||sv.index<=v.cast_spotlight||cost.status!=='committed')throw fail('native_condition_expiry_spotlight_cost');
  }
  return row;
}
export function activeNativeConditions(db,guild,character){
  const rows=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:'pc_native_condition',actor:character,includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)break;}
  return rows.map(r=>validateNativeCondition(db,guild,r.record_key)).filter(r=>r.status==='active');
}
/** Only sealed native conditions affect odds. A model/sheet string named Vulnerable grants nothing. */
export function nativeIncomingConditions(db,guild,character){
  return activeNativeConditions(db,guild,character).filter(r=>r.data.condition==='Vulnerable')
    .map(r=>({ref:r.record_key,fingerprint:hash(r.data),condition:'Vulnerable'}));
}
export function validateIncomingConditions(db,guild,character,proofs){
  if(!Array.isArray(proofs)||proofs.length>1)throw fail('native_condition_nonstacking');
  for(const proof of proofs){const row=validateNativeCondition(db,guild,proof.ref);
    if(row.subject_key!==character||row.data.condition!=='Vulnerable'||proof.condition!=='Vulnerable'||hash(row.data)!==proof.fingerprint)
      throw fail('incoming_condition_exact_source');}
}
/** Daggerheart cancels opposite sources before selecting high/low; same condition never stacks. */
export function incomingConditionOdds(offer,proposal={}){
  const adv=Number(proposal.advantage===true)+Number(!!offer.native_conditions?.length),dis=Number(proposal.disadvantage===true);
  return {advantage:adv>dis,disadvantage:dis>adv};
}
/** Restriction only; an unknown movement range never silently waives a sourced limit. */
export function nativeMovementConditionIssue(db,guild,character,{range=null}={}){
  for(const c of activeNativeConditions(db,guild,character)){
    if(c.data.feature===LANES&&(!RANGE_BANDS.includes(range)||RANGE_BANDS.indexOf(range)>RANGE_BANDS.indexOf('Very Close')))return 'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE';
  }
  return null;
}
/** Only the condition-only change made by THIS attack's native spotlight may advance its PC CAS.
 * No general stale-offer waiver, owner refresh, resource drift or odds-changing condition is admitted. */
export function nativeAttackExpiryRevision(db,guild,character,before,after,costRef){
  if(before===after)return true;
  const rows=[];for(let offset=0;;offset+=100){const page=db.listCityRecords(guild,{kind:'pc_native_condition_expiry',actor:character,includeGM:true,limit:100,offset});
    rows.push(...page);if(page.length<100)break;}
  let cursor=before;
  for(let i=0;i<16&&cursor!==after;i++){
    const row=rows.find(r=>r.data.before_pc===cursor&&r.data.spotlight===`${costRef}:spotlight`);
    if(!row)return false;
    const condition=validateNativeCondition(db,guild,row.record_key);
    if(condition.status!=='expired'||condition.data.feature!==LANES||row.data.after_pc===cursor)return false;
    cursor=row.data.after_pc;
  }
  return cursor===after;
}
