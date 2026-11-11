import {fixture,hash} from './group-feature-history-fixture.mjs';
import {FLASH,REGENT,FOAM,groupFeaturePolicies} from '../../../src/v2/rules/group-feature-rules.js';
import {createHistoricalConditionReader} from '../../../src/v2/rules/condition-history.js';
import {dualityRoll} from '../../../src/v2/rules/dice.js';
import {createHash} from 'node:crypto';

/** Fresh native source rows, never legacy runtime code or proof callbacks. */
export function conditionFixture(t,{area=false,feature=FLASH,success=false,critical=false,choice=null,stress=1,hope=null,conditionName='Vulnerable',expired=false,npcFailure=false,npcCleared=false,ordinary=false}={}){
  const f=fixture(t,{area,npcFailure,npcCleared,ordinary}),{db,repo,record,world,origin,executionKey,pcTarget}=f;
  if(area)feature=FOAM;
  const policy=groupFeaturePolicies[feature],before={resources:{stress:{current:0,max:6},hope:4},conditions:[]};
  const definition={feature_key:feature,source_hash:'source-owned-feature',template_hash:'caster-template',costs:[]};
  f.update('gm_arbitration_decision','parent',d=>{Object.assign(d.native,{feature,feature_definition:definition,feature_hash:hash(definition),template_hash:'caster-template'});});
  const parent=repo.getCityRecord('g','gm_arbitration_decision','parent');world(parent.source_event,'native_gm_arbitration',{payload_hash:hash(parent.data)});
  f.update('gm_action_cost_receipt','cost',d=>{d.spotlight={actor:'caster',scene:origin.scene,index:1,cost:'cost'};});
  const cost=repo.getCityRecord('g','gm_action_cost_receipt','cost');
  f.update('gm_arbitration_decision','child',d=>{d.origin=origin;Object.assign(d.native,{feature,feature_hash:hash(definition),resources_hash:hash(before.resources)});});
  const child=repo.getCityRecord('g','gm_arbitration_decision','child');world(child.source_event,'native_gm_arbitration',{payload_hash:hash(child.data)});
  f.update('gm_group_feature_execution',executionKey,d=>{Object.assign(d,{feature,feature_hash:hash(definition),cost_hash:hash(cost)});d.children[0].hash=hash(child.data);if(area)d.mixed.reactions[0].invitation_hash=hash(child.data);});
  const execution=repo.getCityRecord('g','gm_group_feature_execution',executionKey);world(execution.source_event,'native_group_feature',{payload_hash:hash(execution.data),input_source:parent.source_event});
  const faces=critical?[12,12]:success?[10,8]:[3,5];let faceIndex=0;
  const nativeRoll=dualityRoll({modifier:success&&!critical?7:0},()=>faces[faceIndex++]);
  const result={total:nativeRoll.total,duality:nativeRoll.duality};
  db.prepare('INSERT INTO rolls VALUES(?,?,?)').run('g',1,JSON.stringify(nativeRoll));
  const request=record('roll_request','request',{roll_id:1,kind:'reaction',owner_user_id:'historical-owner',input:{gm_invitation:'child'},breakdown:{trait:policy.trait,difficulty:policy.difficulty},result},{visibility:'character',subject:'pc'});
  world(request.source_event,'native_roll_request',{owner:'historical-owner'},{source:'player:historical-owner',visibility:'character',subject:'pc'});
  const requestSource=repo.getWorldEvent('g',request.source_event),roll=repo.getSavedRoll('g',1);
  const terminalKey=`gm-reaction-submit:${hash(['child','historical-owner'])}`;
  const terminal=record('gm_reaction_submission',terminalKey,{owner:'historical-owner',invitation:'child',invitation_hash:hash(child.data),request:'request'},{visibility:'character',subject:'pc'});
  world(terminal.source_event,'native_gm_reaction_submission',{owner:'historical-owner'},{source:'player:historical-owner',visibility:'character',subject:'pc'});
  const audit=(id,event)=>db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',id,'city','world_event_index','user','historical-owner',event,origin.session,'character','{}','{}');audit(11,terminal.source_event);
  const effectKey=`group-effect:${hash('child')}`,proofHash=hash({request:hash(request),roll:hash(roll),terminal:hash(terminal),source:hash(repo.getWorldEvent('g',terminal.source_event)),request_source:hash(requestSource)});
  const binding=area?{execution:executionKey,cohort_hash:execution.data.mixed.cohort_hash,target:'character:pc',proof:proofHash,outcome:critical||success?'success':'failure'}:null;
  const conditionRef=conditionName?(area?`mixed-condition:${hash(binding)}`:effectKey+':condition'):null;
  let choiceSource=null;
  if(choice!==null){choiceSource='owner-choice';world(choiceSource,'native_group_feature_choice',{choice,decision:'child',revision:hash(child.data),authored_text:JSON.stringify({op:'gm-reaction-choice',request:'child',revision:hash(child.data),choice})},{source:'player:historical-owner',visibility:'character',subject:'pc'});audit(12,choiceSource);}
  const after=structuredClone(before);after.resources.stress.current+=stress;if(hope!==null)after.resources.hope-=hope;if(conditionName)after.conditions.push({name:conditionName,native_ref:conditionRef,active:true});
  const effectData={version:area?4:feature===REGENT?2:critical?3:1,decision:'child',parent:'parent',character:'pc',owner:'historical-owner',feature,feature_hash:hash(definition),request:'request',request_hash:hash(request),request_source_hash:hash(requestSource),roll:1,roll_hash:hash(roll),success:critical||success,stress,condition:conditionRef,condition_reused:false,...(area?{proof_hash:proofHash}:{before,after,mutation:10,choice,choice_source:choiceSource}),...(hope!==null?{hope}:{})};
  const effect=record('gm_group_feature_effect',effectKey,effectData,{visibility:'character',subject:'pc'});world(effect.source_event,'native_group_feature_effect',{payload_hash:hash(effectData),owner_source:request.source_event},{visibility:'character',subject:'pc'});
  let conditionData;
  if(conditionRef){
    if(area){const cause={feature,source_hash:definition.source_hash,template_hash:'caster-template',scene:origin.scene,session:origin.session,condition:conditionName,expiry:policy.expiry,spellcast_disadvantage:policy.spellcast_disadvantage===true};conditionData={version:2,target:pcTarget,binding,cause,owner:pcTarget.owner,character:pcTarget.key,feature,condition:conditionName,expiry:policy.expiry,scene:origin.scene,mutation:10,before:[],after:after.conditions};}
    else conditionData={version:1,effect:effectKey,character:'pc',owner:'historical-owner',feature,condition:conditionName,expiry:policy.expiry,actor:'caster',scene:origin.scene,cast_spotlight:1};
    const condition=record('pc_native_condition',conditionRef,conditionData,{status:expired?'expired':'active',visibility:'character',subject:'pc',actor:'pc'});world(condition.source_event,'native_pc_condition',{payload_hash:hash(conditionData)},{visibility:'character',subject:'pc'});
  }
  db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',10,area?'native_condition':'native_feature',area?'mixed_reaction_condition':'owner_feature_effect','system','native:unified-gm','pc',origin.session,'character',JSON.stringify(area?[]:before),JSON.stringify(area?after.conditions:after));
  if(expired){const spotlight={actor:'caster',scene:origin.scene,index:2,cost:'expiry-cost'},expiryCost=record('gm_action_cost_receipt','expiry-cost',{spotlight},{status:'committed'});world('expiry-cost:spotlight','native_gm_spotlight',{payload_hash:hash(spotlight),cost_hash:hash(expiryCost)});const expiry={condition:conditionRef,condition_hash:hash(conditionData),spotlight:'expiry-cost:spotlight',spotlight_hash:hash(spotlight),character:'pc',before:after.conditions,after:after.conditions.map(c=>({...c,active:false}))};const receipt=record('pc_native_condition_expiry',conditionRef,expiry,{visibility:'character',subject:'pc',source:conditionRef+':expiry-source'});world(receipt.source_event,'native_condition_expiry',expiry,{visibility:'character',subject:'pc'});}
  let npcConditions=[];
  if(area&&npcFailure){
    const old=repo.getCityRecord('g','native_mixed_condition',f.conditionRef),cause={feature,source_hash:definition.source_hash,template_hash:'caster-template',scene:origin.scene,session:origin.session,condition:'Restrained',expiry:'until_freed',spellcast_disadvantage:true};
    const data={...old.data,cause,mutation:20,before:[],after:['Restrained']};record('native_mixed_condition',f.conditionRef,data,{status:old.status,actor:old.actor_key});world(old.source_event,'native_mixed_condition',{payload_hash:hash(data)});
    db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',20,'native_condition','mixed_reaction_condition','system','native:unified-gm',old.actor_key,origin.session,'gm','[]','["Restrained"]');
    npcConditions=[{ref:f.conditionRef,hash:hash(data)}];
    if(npcCleared){
      f.update('gm_arbitration_decision','clear-decision',d=>{d.native.condition.hash=hash(data);});const clearDecision=repo.getCityRecord('g','gm_arbitration_decision','clear-decision');world(clearDecision.source_event,'native_gm_arbitration',{payload_hash:hash(clearDecision.data)});
      f.update('native_mixed_condition_clear',f.clearRef,d=>{d.binding.condition_hash=hash(data);d.proof.decision_hash=hash(clearDecision);});const clear=repo.getCityRecord('g','native_mixed_condition_clear',f.clearRef);world(clear.source_event,'native_mixed_condition_clear',{payload_hash:hash(clear.data),input_source:clear.data.proof.source});
    }
  }
  db.prepare("UPDATE city_records SET status='resolved' WHERE kind='gm_group_feature_execution'").run();
  const progress=record('gm_group_feature_progress',executionKey,{execution:executionKey,execution_hash:hash(execution.data),children:[{decision:'child',character:'pc',status:'resolved',proof:effectKey}],...(area?{npc_conditions:npcConditions}:{})},{source:executionKey+':progress:source'});world(progress.source_event,'native_group_progress',{payload_hash:hash(progress.data)});
  const reader=createHistoricalConditionReader(repo);
  const resealEffect=()=>{const row=repo.getCityRecord('g','gm_group_feature_effect',effectKey);world(row.source_event,'native_group_feature_effect',{payload_hash:hash(row.data),owner_source:request.source_event},{visibility:'character',subject:'pc'});};
  return {...f,reader,conditionRef,npcConditionRef:f.conditionRef,effectKey,terminalKey,readCondition:()=>reader.inspectPcCondition('g',conditionRef),readEffect:()=>reader.inspectReactionEffect('g',effectKey),resealEffect};
}

export function attachOwnerClear(f){
  const {repo,db,record,world,origin,conditionRef}=f,raw='I free myself from the binding.';
  const sourceHash=createHash('sha256').update(raw).digest('hex');
  db.prepare("UPDATE city_records SET status='cleared' WHERE kind='pc_native_condition'").run();
  const condition=repo.getCityRecord('g','pc_native_condition',conditionRef);
  const actionData={type:'interact',actor:'pc',owner_user_id:'historical-owner',actor_principal_revision:3,scene:origin.scene,session_id:origin.session,source_hash:sourceHash,start:0,end:raw.length,source_span:raw,framing:'immediate',operation:'clear_condition',target_key:conditionRef,outcome_receipt:'free-result'};
  const action=record('typed_intent','free-action',actionData,{visibility:'character',subject:'pc',source:'free-input'});
  world('free-input','authored_turn',{author:'historical-owner',character_id:'pc',principal_revision:3,raw_text:raw,raw_hash:sourceHash},{source:'player:historical-owner',visibility:'character',subject:'pc'});
  const result=record('action_outcome_receipt','free-result',{action_id:'free-action',actor_ref:'pc',outcome:'resolved_no_roll'},{source:'free-input',visibility:'character',subject:'pc'});
  const effect=repo.getCityRecord('g','gm_group_feature_effect',f.effectKey).data;
  const before=condition.data.version===2?condition.data.after:effect.after.conditions,after=before.map(c=>c.native_ref===conditionRef?{...c,active:false}:c);
  db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',15,'native_condition','owner_action_condition_clear','system','native:unified-gm','pc',origin.session,'character',JSON.stringify(before),JSON.stringify(after));
  db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',16,'city','world_event_index','user','historical-owner','free-input',origin.session,'character','{}','{}');
  const d={version:1,condition:conditionRef,condition_hash:hash(condition.data),owner:'historical-owner',character:'pc',principal:3,scene:origin.scene,session:origin.session,action:'free-action',action_source:'free-input',action_hash:hash({key:action.record_key,source:action.source_event,type:actionData.type,actor:actionData.actor,owner:actionData.owner_user_id,principal:actionData.actor_principal_revision,scene:actionData.scene,session:actionData.session_id,source_hash:actionData.source_hash,start:actionData.start,end:actionData.end,framing:actionData.framing,operation:actionData.operation,target:actionData.target_key}),prerequisite:'free-result',prerequisite_hash:hash(result),scope:{mode:'private',actorUserId:'historical-owner',actorCharacterId:'pc'},mutation:15,before,after};
  const receipt=record('pc_native_condition_clear',`native-condition-clear:${hash(conditionRef)}`,d,{visibility:'character',subject:'pc'});
  world(receipt.source_event,'native_condition_clear',{payload_hash:hash(d),input_source:'free-input'},{visibility:'character',subject:'pc'});
}
