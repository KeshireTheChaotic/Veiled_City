import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import {createFeatureEffectRules} from '../../src/frameworks/daggerheart/public.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function caseFor(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rf03-feedback-')),file=path.join(root,'effects.sqlite');let sql;
  function open(){sql=new DatabaseSync(file);sql.exec('CREATE TABLE IF NOT EXISTS entries(kind TEXT,id TEXT,json TEXT,PRIMARY KEY(kind,id));');}
  open();t.after(()=>{sql.close();fs.rmSync(root,{recursive:true,force:true});});
  const put=(kind,id,value)=>{sql.prepare('INSERT OR REPLACE INTO entries VALUES(?,?,?)').run(kind,id,JSON.stringify(value));return value;};
  const get=(kind,id)=>{const r=sql.prepare('SELECT json FROM entries WHERE kind=? AND id=?').get(kind,id);return r?JSON.parse(r.json):null;};
  const count=kind=>sql.prepare('SELECT count(*) AS n FROM entries WHERE kind=?').get(kind).n;
  const decision='decision:feedback',feature='adversary:static-wraith:feedback',pc={id:'pc:mika',owner_user_id:'owner:mika',
    data:{resources:{hope:3,stress:{current:1,max:6}},inventory:[{id:'device:phone',category:'electronic_device',equipped:true}]}};
  put('pc',pc.id,pc);
  const native={operation:'request_feature_reaction_roll',feature,feature_hash:'hash:descriptor',window:'window:one',character:pc.id,owner:pc.owner_user_id,
    resources_hash:hash(pc.data.resources),device_key:'device:phone',cost:{fear:0,npc_stress:1}};
  const row={kind:'gm_arbitration_decision',record_key:decision,source_event:'source:decision',data:{native,origin:{session:'s',scene:'scene',location:'location'}}};
  put('gm_arbitration_decision',decision,row);
  const window={kind:'native_feature_window',record_key:native.window,status:'hold_for_owner',data:{device_hash:hash(pc.data.inventory[0])}};put(window.kind,window.record_key,window);
  const request={kind:'roll_request',record_key:'request:reaction',source_event:'source:owner-roll',subject_key:pc.id,
    data:{kind:'reaction',input:{gm_invitation:decision},owner_user_id:pc.owner_user_id,breakdown:{trait:'Instinct'},roll_id:'roll:reaction'}};put(request.kind,request.record_key,request);
  put('gm_reaction_submission',`gm-reaction-submit:${hash([decision,pc.owner_user_id])}`,{status:'resolved',data:{request:request.record_key,invitation_hash:hash(row.data)}});
  const paid={feature_cost:native.cost,amount:0,before:2,after:2,npc_stress:{before:1,after:2}};
  put('gm_action_cost_receipt',`gm-feature-cost:${hash(decision)}`,{status:'committed',visibility:'gm',source_event:row.source_event,data:{...paid,payment_source:'source:paid'}});
  put('event','source:paid',{status:'active',visibility:'gm',kind:'native_feature_payment',source_id:'native:unified-gm',details:{input_source:row.source_event,payload_hash:hash(paid)}});
  const state={outcome:'failure',failReceipt:false},delegations=[],passiveRefs=new Set();
  const db={getCityRecord:(_g,kind,key)=>get(kind,key),saveCityRecord:(_g,v)=>{if(state.failReceipt&&v.kind==='gm_feature_effect_receipt')throw new Error('effect receipt unavailable');
      const saved={...v,record_key:v.key};delete saved.key;return put(v.kind,v.key,saved);},getWorldEvent:(_g,id)=>get('event',id),getCharacter:id=>get('pc',id),
    updateCharacterData:(id,fn)=>{const current=get('pc',id);fn(current.data);return put('pc',id,current);},
    recordMutation:(_g,v)=>{const id=`mutation:${count('mutation')+1}`;return put('mutation',id,{id,source_layer:v.sourceLayer,entity_key:v.entityKey,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)});},
    getMutation:(_g,id)=>get('mutation',id),transaction:fn=>{sql.exec('BEGIN IMMEDIATE');try{const v=fn();assert.equal(typeof v?.then,'undefined');sql.exec('COMMIT');return v;}catch(error){sql.exec('ROLLBACK');throw error;}}
  };
  const mechanics={inspectNativeGmDecision:()=>({row:get('gm_arbitration_decision',decision)}),inspectFeatureWindow:(_db,_g,key)=>get('native_feature_window',key),
    typedRollProof:()=>({difficulty:12,outcome:state.outcome}),groupReactionState:(...args)=>delegations.push(['state',...args]),
    applyGroupReactionOutcome:(...args)=>{delegations.push(['apply',...args]);return 'group-result';},settleGroupFeature:(...args)=>delegations.push(['settle',...args]),
    applyNativeStressPassive:(_db,_g,_kind,key)=>passiveRefs.add(key)};
  const rules=createFeatureEffectRules({source:{indexWorldEvent:(_db,_g,v)=>put('event',v.key,{...v,event_key:v.key,status:'active'})},mechanics,
    notices:{reserveGmArbitrationNotice:(...args)=>delegations.push(['notice',...args])}});
  return {db,rules,state,decision,row,request,native,pc,put,get,count,delegations,passiveRefs,reopen:()=>{sql.close();open();}};
}

test('failed owner reaction applies one Stress and source-bound device shutdown, then replays after reopen',t=>{
  const f=caseFor(t),first=f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),current=f.db.getCharacter(f.pc.id);
  assert.equal(current.data.resources.stress.current,2);assert.equal(current.data.inventory[0].disabled_by,first.record_key);
  assert.equal(first.visibility,'character');assert.equal(first.subject_key,f.pc.id);assert.equal(f.get('native_feature_window',f.native.window).status,'resolved');
  assert.equal(f.count('mutation'),1);f.reopen();
  assert.deepEqual(f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),first);
  assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,2);assert.equal(f.count('gm_feature_effect_receipt'),1);assert.equal(f.count('mutation'),1);
  assert.equal(f.passiveRefs.size,1);assert.equal(f.rules.validateFeatureReactionEffect(f.db,'g',first.record_key).record_key,first.record_key);
});

test('successful native reaction changes no resources or device state',t=>{
  const f=caseFor(t);f.state.outcome='success';const effect=f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request);
  assert.equal(effect.data.success,true);assert.deepEqual(f.db.getCharacter(f.pc.id),f.pc);assert.equal(f.passiveRefs.size,0);
  assert.equal(f.rules.validateFeatureReactionEffect(f.db,'g',effect.record_key).data.disabled_after,null);
});

test('changed current owner, unreviewed result or stale resource snapshot cannot apply a feature consequence',t=>{
  const f=caseFor(t);f.db.updateCharacterData(f.pc.id,d=>{d.resources.stress.current=2;});
  assert.throws(()=>f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),/target_state_changed/);
  f.put('pc',f.pc.id,{...f.pc,owner_user_id:'new-owner'});
  assert.throws(()=>f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),/current_owner/);
  f.put('pc',f.pc.id,f.pc);f.state.outcome='needs_review';
  assert.throws(()=>f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),/actual_owner_reaction/);
  assert.equal(f.count('gm_feature_effect_receipt'),0);assert.equal(f.count('mutation'),0);
});

test('failed receipt write rolls back resource, device, mutation and source event together',t=>{
  const f=caseFor(t);f.state.failReceipt=true;
  assert.throws(()=>f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),/effect receipt unavailable/);
  assert.deepEqual(f.db.getCharacter(f.pc.id),f.pc);assert.equal(f.count('mutation'),0);assert.equal(f.count('event'),1);
  assert.equal(f.get('native_feature_window',f.native.window).status,'hold_for_owner');
});

test('exact owner withdrawal cancels only its pending occurrence without treating silence as failed dice',t=>{
  const f=caseFor(t),key=`gm-reaction-submit:${hash([f.decision,f.pc.owner_user_id])}`,terminal=f.get('gm_reaction_submission',key);
  f.put('gm_reaction_submission',key,{...terminal,status:'withdrawn'});f.rules.cancelFeatureReaction(f.db,'g',f.decision);
  assert.equal(f.get('native_feature_window',f.native.window).status,'cancelled');assert.deepEqual(f.db.getCharacter(f.pc.id),f.pc);
  assert.equal(f.count('gm_feature_effect_receipt'),0);assert.equal(f.count('mutation'),0);
});

test('group reaction routes retain the original independent native service and notice callbacks',t=>{
  const f=caseFor(t),row=structuredClone(f.row);row.data.native.operation='request_group_feature_reaction';row.data.native.execution='group:one';
  f.put(row.kind,row.record_key,row);f.rules.validateFeatureInvitation(f.db,'g',row,null);
  assert.equal(f.rules.applyFeatureReactionOutcome(f.db,'g',f.decision,f.request),'group-result');
  f.rules.cancelFeatureReaction(f.db,'g',f.decision);assert.deepEqual(f.delegations.map(c=>c[0]),['state','apply','state','settle','notice']);
  assert.equal(f.count('mutation'),0);
});

test('existing provider cold-imports with the extracted native effect engine and exact stakes',async()=>{
  const provider=await import('../../src/native-feature-effects.js');
  assert.match(provider.featureReactionStakes('adversary:static-wraith:feedback'),/Stress/);assert.equal(typeof provider.nativeDeviceUseIssue,'function');
});
