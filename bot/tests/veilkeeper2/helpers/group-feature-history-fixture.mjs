import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../../src/v2/legacy-readonly-repository.js';
import {inspectGroupFeature} from '../../../src/v2/rules/group-feature-history.js';
import {inspectMixedConditionClear} from '../../../src/v2/rules/npc-condition-clear-history.js';
import {rollNativeNpcReaction} from '../../../src/v2/rules/npc-reaction-proof.js';
import {FLASH,FOAM} from '../../../src/v2/rules/group-feature-rules.js';
export const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const fileHash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function fixture(t,{area=false,ordinary=false,resolved=false,withdrawn=false,npcFailure=false,npcCleared=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk2-group-history-')),file=join(dir,'source.sqlite'),db=new DatabaseSync(file);
  db.exec(`CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,character_json TEXT);CREATE TABLE campaigns(guild_id TEXT);
    CREATE TABLE city_records(guild_id TEXT,kind TEXT,record_key TEXT,actor_key TEXT,subject_key TEXT,status TEXT,visibility TEXT,source_event TEXT,data_json TEXT,PRIMARY KEY(guild_id,kind,record_key));
    CREATE TABLE world_events(guild_id TEXT,event_key TEXT,status TEXT,kind TEXT,source_id TEXT,visibility TEXT,subject_key TEXT,scene TEXT,session_id TEXT,details_json TEXT,PRIMARY KEY(guild_id,event_key));
    CREATE TABLE mutation_ledger(guild_id TEXT,id INTEGER,source_layer TEXT,mutation_type TEXT,actor_type TEXT,actor_id TEXT,entity_key TEXT,session_id TEXT,visibility TEXT,before_json TEXT,after_json TEXT);
    CREATE TABLE rolls(guild_id TEXT,id INTEGER,payload_json TEXT);`);
  const repo=openLegacyReadOnlyRepository(file),origin={source:'human-input',scene:'historical-scene',session:'historical-session',location:'historical-place'};
  const record=(kind,key,data,{status='resolved',visibility='gm',actor='caster',subject=null,source=key+':source'}={})=>{
    db.prepare('INSERT OR REPLACE INTO city_records VALUES(?,?,?,?,?,?,?,?,?)').run('g',kind,key,actor,subject,status,visibility,source,JSON.stringify(data));return repo.getCityRecord('g',kind,key);
  };
  const world=(key,kind,details,{source='native:unified-gm',visibility='gm',subject=null,status='active'}={})=>{
    db.prepare('INSERT OR REPLACE INTO world_events VALUES(?,?,?,?,?,?,?,?,?,?)').run('g',key,status,kind,source,visibility,subject,origin.scene,origin.session,JSON.stringify(details));
  };
  world('human-input','authored_turn',{author:'historical-owner'},{source:'player:historical-owner'});
  const decision=(key,actor,native)=>{
    const material={intent_ref:key+':intent',actor:{type:'npc',key:actor,owner_control_type:'ai_world'},operation:'feature',knowledge_refs:[]},proposalDetails={entry_hash:hash(material),input_source:origin.source};
    const entry={...material,source_ref:key+':npc-source',source_hash:hash(proposalDetails)},board={version:2,origin,entries:[entry]},proposal={reason:'native historical feature'};
    const data={board:key+':board',entry:material.intent_ref,entry_hash:hash(entry),origin,proposal,proposal_hash:hash(proposal),native};
    record('scene_intent_board',key+':board',board);world(key+':board:source','native_scene_intent_board',{payload_hash:hash(board)});
    const row=record('gm_arbitration_decision',key,data);world(row.source_event,'native_gm_arbitration',{payload_hash:hash(data)});world(key+':npc-source','native_npc_scene_intent',proposalDetails);return row;
  };
  const feature=area?FOAM:FLASH,definition={feature_key:feature,source_hash:'pinned-source',costs:[]},executionKey=`group-feature:${hash('parent')}`;
  const pcTarget={kind:'character',key:'pc',owner:'historical-owner',presence_hash:'pc-presence'};
  let npcTarget,receipt;
  if(area){
    const profile={guild_id:'g',npc_key:'target-npc'},template={key:'adversary-template'},combatant={id:'combatant',status:'active',hp_current:4};
    npcTarget={kind:'npc',key:'target-npc',presence_hash:'npc-presence',control_hash:'npc-control',template_hash:hash(ordinary?profile:template),...(ordinary?{profile_hash:hash(profile)}:{combatant_snapshot:combatant})};
    receipt=rollNativeNpcReaction({target:npcTarget,...(ordinary?{profile}:{combatant,template}),difficulty:14,rng:()=>npcFailure?3:17});
  }
  const native={operation:'commit_group_feature',feature,feature_hash:hash(definition),feature_definition:definition,actor_source:'caster-source',targets:[{character:'pc'}],...(area?{area:{targets:[pcTarget,{kind:'npc',key:npcTarget.key}]},npc_targets:[npcTarget]}:{})};
  const parent=decision('parent','caster',native);world('caster-source','native_actor',{native_actor:'caster'});
  const childData={native:{parent:'parent',execution:executionKey,character:'pc',owner:'historical-owner'}},child=record('gm_arbitration_decision','child',childData,{status:'pending_pc_reaction'});world(child.source_event,'native_gm_arbitration',{payload_hash:hash(childData)});
  const cost=record('gm_action_cost_receipt','cost',{decision:'parent',amount:0,before:3,after:3},{status:'committed',source:parent.source_event});
  const targets=area?[pcTarget,npcTarget]:null;
  const data={version:1,decision:'parent',feature,feature_hash:hash(definition),cost:'cost',cost_hash:hash(cost),children:[{decision:'child',character:'pc',hash:hash(childData)}],...(area?{mixed:{version:1,key:executionKey,cohort_hash:hash(targets),reactions:[{kind:'character',target:'character:pc',invitation:'child',invitation_hash:hash(childData)},{kind:'npc',target:'npc:target-npc',receipt}]}}:{})};
  const execution=record('gm_group_feature_execution',executionKey,data,{status:resolved?'resolved':'preparing_effects'});world(execution.source_event,'native_group_feature',{payload_hash:hash(data),input_source:parent.source_event});
  let conditionRef=null,clearRef=null,npcConditions=[];
  if(area){
    const npcRecord=record('native_npc_reaction',`group-npc-reaction:${hash(['parent',npcTarget.key])}`,receipt,{actor:npcTarget.key});world(npcRecord.source_event,'native_npc_reaction',{execution:executionKey,payload_hash:hash(receipt)});
    if(npcFailure){
      const binding={execution:executionKey,cohort_hash:hash(targets),target:'npc:target-npc',proof:receipt.receipt_hash,outcome:'failure'};conditionRef=`mixed-condition:${hash(binding)}`;
      const conditionData={version:1,target:npcTarget,binding,cause:{condition:'Restrained',scene:origin.scene,session:origin.session}};
      const condition=record('native_mixed_condition',conditionRef,conditionData,{status:npcCleared?'cleared':'active',actor:npcTarget.key});world(condition.source_event,'native_mixed_condition',{payload_hash:hash(conditionData)});npcConditions=[{ref:conditionRef,hash:hash(conditionData)}];
      if(npcCleared){
        const clearDecision=decision('clear-decision',npcTarget.key,{operation:'commit_npc_condition_clear',actor:npcTarget.key,condition:{ref:conditionRef,hash:hash(conditionData)},opportunity:{key:'native-opportunity'},method:'Cuts the binding with a knife.'});
        const spotlight={actor:npcTarget.key,scene:origin.scene,cost:'clear-cost',index:2};
        const clearCost=record('gm_action_cost_receipt','clear-cost',{decision:'clear-decision',opportunity:'native-opportunity',spotlight},{status:'committed',source:clearDecision.source_event});world('clear-cost:spotlight','native_gm_spotlight',{payload_hash:hash(spotlight),cost_hash:hash(clearCost)});
        const proof={actor:npcTarget.key,scene:origin.scene,session:origin.session,source:clearDecision.source_event,method:clearDecision.data.native.method,decision_hash:hash(clearDecision),cost_hash:hash(clearCost)};
        const before=['Restrained','Vulnerable'],after=['Vulnerable'];
        db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',1,'native_condition','npc_spotlight_condition_clear','system','native:unified-gm',npcTarget.key,origin.session,'gm',JSON.stringify(before),JSON.stringify(after));
        const clearData={version:1,binding:{condition:conditionRef,condition_hash:hash(conditionData),cost:'clear-cost',decision:'clear-decision'},proof,before,after,mutation:1};clearRef=`mixed-condition-clear:${hash(conditionRef)}`;
        const clear=record('native_mixed_condition_clear',clearRef,clearData,{actor:npcTarget.key});world(clear.source_event,'native_mixed_condition_clear',{payload_hash:hash(clearData),input_source:proof.source});
      }
    }
  }
  let terminalRef;
  if(resolved){
    if(withdrawn){
      terminalRef=`gm-reaction-submit:${hash(['child','historical-owner'])}`;
      const terminal=record('gm_reaction_submission',terminalRef,{owner:'historical-owner',invitation_hash:hash(childData)},{status:'withdrawn',visibility:'character',subject:'pc'});
      world(terminal.source_event,'native_gm_reaction_withdrawal',{invitation:'child',revision:hash(childData)},{source:'player:historical-owner',visibility:'character',subject:'pc'});
      db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',2,'city','world_event_index','user','historical-owner',terminal.source_event,origin.session,'character','{}','{}');
    }else{
      db.prepare('INSERT INTO rolls VALUES(?,?,?)').run('g',1,'{"id":"saved-result","total":15}');const roll=repo.getSavedRoll('g',1);
      const request=record('roll_request','request',{roll_id:1},{visibility:'character',subject:'pc'});
      terminalRef=`group-effect:${hash('child')}`;
      const effect=record('gm_group_feature_effect',terminalRef,{owner:'historical-owner',decision:'child',request:'request',request_hash:hash(request),roll_hash:hash(roll)},{visibility:'character',subject:'pc'});world(effect.source_event,'native_group_feature_effect',{payload_hash:hash(effect.data)});
    }
    const progress=record('gm_group_feature_progress',executionKey,{execution:executionKey,execution_hash:hash(data),children:[{decision:'child',character:'pc',status:withdrawn?'withdrawn':'resolved',proof:terminalRef}],...(area?{npc_conditions:npcConditions}:{})},{source:executionKey+':progress:source'});world(progress.source_event,'native_group_progress',{payload_hash:hash(progress.data)});
  }
  const read=()=>repo.withValidationSnapshot(()=>inspectGroupFeature(repo,'g',executionKey));
  const readClear=()=>repo.withValidationSnapshot(()=>inspectMixedConditionClear(repo,'g',repo.getCityRecord('g','native_mixed_condition',conditionRef)));
  const update=(kind,key,edit)=>{const row=repo.getCityRecord('g',kind,key);edit(row.data);db.prepare('UPDATE city_records SET data_json=? WHERE kind=? AND record_key=?').run(JSON.stringify(row.data),kind,key);};
  t.after(()=>{repo.close();db.close();rmSync(dir,{recursive:true,force:true});});return {db,repo,file,read,readClear,update,executionKey,conditionRef,clearRef,terminalRef,record,world,origin,pcTarget};
}
