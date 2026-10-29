import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRulesArbitration} from '../../src/frameworks/daggerheart/rules-arbitration-rules.js';
import {createGmRulingRules} from '../../src/frameworks/daggerheart/gm-ruling-rules.js';
import {validateGmRulingProposal} from '../../src/gm-ruling-schema.js';
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'vc-adjudication-c19-')),file=join(dir,'native.sqlite');let sql=new DatabaseSync(file),depth=0,failure='',withdrawn=false,captures=0,requests=0,last;
 t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT);');
 const guild='guild-c19',scope={mode:'private',actorUserId:'owner-c19',actorCharacterId:'pc-c19'},scene={key:'scene-c19',session_id:'session-c19'},pc={id:'pc-c19',owner_user_id:scope.actorUserId,data:{location:'location-c19'}},principal={kind:'owner',user:scope.actorUserId,character_id:pc.id,revision:'principal-c19'},action={record_key:'action-c19',source_event:'owner-source-c19',status:'accepted_for_adjudication',visibility:'character',subject_key:pc.id,data:{actor:pc.id,owner_user_id:scope.actorUserId,actor_principal_revision:principal.revision,type:'interact',operation:'inspect',framing:'immediate',resolution:'roll_required',scene:scene.key,session_id:scene.session_id,start:0,end:22,source_span:'I inspect the mechanism.',source_hash:'raw-c19'}};
 const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(v.kind===failure)throw Error('injected '+v.kind);const row={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(row));return row;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},getCharacter:()=>structuredClone(pc),getSimulationEntity:()=>({state:{established:true}}),getCityCalendar:()=>({flags:{gm_discretion:true}}),getRulesRuling:()=>null,ownerAuthoredSource(_g,key,user){return this.getWorldEvent(guild,key)?.source_id==='player:'+user;},transaction(fn){const level=depth++,sp='native_'+level;sql.exec(level?'SAVEPOINT '+sp:'BEGIN IMMEDIATE');try{const v=fn();sql.exec(level?'RELEASE '+sp:'COMMIT');return v;}catch(e){sql.exec(level?'ROLLBACK TO '+sp:'ROLLBACK');if(level)sql.exec('RELEASE '+sp);throw e;}finally{depth--;}}};
 const event=(_d,_g,v)=>{const row={...v,event_key:v.key,status:v.status||'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(row));return row;};event(null,null,{key:action.source_event,kind:'authored_turn',source_id:'player:'+scope.actorUserId,session_id:scene.session_id,scene:scene.key,details:{author:scope.actorUserId}});event(null,null,{key:'presence-c19',visibility:'party'});event(null,null,{key:'fact-c19',kind:'scene_fact',status:'active',source_kind:'gm',source_id:'gm:gm-c19',truth_status:'observed',session_id:scene.session_id,scene:scene.key,location_key:pc.data.location,visibility:'party',details:{description:'An established mechanism.'}});db.saveCityRecord(guild,{...action,kind:'typed_intent',key:action.record_key});
 const proof=()=>({row:db.getCityRecord(guild,'typed_intent',action.record_key),source:db.getWorldEvent(guild,action.source_event),scene,principal}),arbitration=createRulesArbitration({capabilities:{indexWorldEvent:event,cityKey:key=>key,prepareRollRequest:(_d,_g,input)=>{requests++;return db.saveCityRecord(guild,{kind:'roll_request',key:'request-c19',status:'pending',visibility:'character',subject_key:pc.id,source_event:action.source_event,data:{owner_user_id:scope.actorUserId,session_id:scene.session_id,scene:scene.key,kind:input.kind,input,revision:1,breakdown:{unresolved:[]}}});},conversationPrincipal:()=>principal,currentScene:()=>scene,isPvpIntent:()=>false,overlapsOwnerActionTerminal:()=>withdrawn,captureNoRollFeatureWindows:(_d,_g,ref)=>{assert.equal(db.getCityRecord(guild,'action_outcome_receipt',ref).status,'resolved');captures++;},nativeDeviceUseIssue:()=>null,consentAction:proof,historicalActionSource:proof}}),ruling=createGmRulingRules({capabilities:{adjudicateAcceptedIntent:(...args)=>{last={input:args[2],actor:args[3],context:args[4]};return arbitration.adjudicateAcceptedIntent(...args);},selectRuleBasis:arbitration.selectRuleBasis,consentAction:proof,historicalActionSource:proof,conversationPrincipal:()=>principal,currentScene:()=>scene,scenePresence:()=>({source_event:'presence-c19',location_key:pc.data.location,data:{state:'actually_present'}}),isPvpIntent:()=>false,assertPcCanAct:()=>{},nativeDeviceUseIssue:()=>null,validateGmRulingProposal}}),proposal={version:1,disposition:'standard_action_roll',context_refs:['fact-c19'],capability:{kind:'mundane',ref:''},effect_class:'attempt_only',trait:'Knowledge',difficulty:12,risk:'The mechanism may jam.',stakes:'Learn or fail to learn the mechanism.',explanation:'Carefully inspect the established mechanism.',difficulty_reason:'A worn intricate mechanism.',saved_ruling_key:'',override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],modifier_keys:[]},adjudicate=()=>ruling.adjudicateGmRuling(db,guild,action.record_key,proposal,scope),replay=(newScope=scope)=>db.transaction(()=>arbitration.adjudicateAcceptedIntent(db,guild,last.input,last.actor,{...last.context,scope:newScope}));
 function noRoll(){const row=db.getCityRecord(guild,'typed_intent',action.record_key);row.data.type='other';row.data.operation='describe_scene';row.data.resolution='conversational';db.saveCityRecord(guild,{...row,key:row.record_key});Object.assign(proposal,{disposition:'narrative_no_roll',effect_class:'observation',trait:null,difficulty:null,risk:'none',stakes:'none'});}
 return {db,guild,scope,scene,pc,action,proposal,ruling,arbitration,adjudicate,replay,noRoll,event,setFailure:v=>failure=v,setWithdrawn:v=>withdrawn=v,captures:()=>captures,requests:()=>requests,reopen(){sql.close();sql=new DatabaseSync(file);},count(table){return sql.prepare('SELECT count(*) n FROM '+table).get().n;}};
}
test('actual native GM ruling and arbitration create one private grounded pending request and exact replay after restart',t=>{
 const f=fixture(t),row=f.adjudicate(),q=f.db.getCityRecord(f.guild,'roll_request','request-c19');assert.equal(row.status,'roll_pending');assert.equal(q.data.input.private_result,true);assert.equal(q.data.input.gm_ruling,row.record_key);assert.equal(q.data.input.trait,'Knowledge');assert.equal(f.db.getWorldEvent(f.guild,q.data.input.difficulty_source).details.roll_difficulty.value,12);f.reopen();assert.equal(f.replay().roll_request_ref,q.record_key);assert.deepEqual(f.adjudicate(),row);assert.equal(f.requests(),1);
});
test('actual no-roll native receipt settles only costless observation and captures feature timing after its saved receipt',t=>{
 const f=fixture(t);f.noRoll();const row=f.adjudicate(),outcome=f.db.getCityRecord(f.guild,'action_outcome_receipt',row.data.adjudication.receipts[0]);assert.equal(outcome.data.outcome,'resolved_no_roll');assert.deepEqual(outcome.data.state_mutations,[]);assert.deepEqual(outcome.data.native_roll_refs,[]);assert.equal(outcome.visibility,'character');assert.equal(f.db.getCityRecord(f.guild,'typed_intent',f.action.record_key).status,'resolved');assert.equal(f.captures(),1);f.reopen();assert.deepEqual(f.replay(),row.data.adjudication);assert.equal(f.captures(),1);assert.equal(f.requests(),0);
});
test('withdrawn owner source range blocks native preparation, and unsupported source rules remain a scoped hold',t=>{
 const f=fixture(t);f.setWithdrawn(true);assert.throws(f.adjudicate,/owner withdrew this source range/);assert.equal(f.requests(),0);const g=fixture(t);g.proposal.raw_refs=['srd:unsupported-c19'];const held=g.adjudicate();assert.equal(held.data.review_reason,'RULE_UNVERIFIED');assert.equal(g.requests(),0);assert.equal(g.db.getCityRecord(g.guild,'roll_request','request-c19'),null);
});
test('native saved adjudication rejects another owner audience and altered exact request trait without replacement mechanics',t=>{
 const f=fixture(t);f.adjudicate();assert.throws(()=>f.replay({...f.scope,actorUserId:'stranger'}),/owner or audience/);const q=f.db.getCityRecord(f.guild,'roll_request','request-c19');f.db.saveCityRecord(f.guild,{...q,key:q.record_key,data:{...q.data,input:{...q.data.input,trait:'Strength'}}});assert.throws(()=>f.replay(),/exact native request ancestry/);assert.equal(f.requests(),1);
});
test('failure after native request or no-roll completion rolls the entire coupled ruling transaction back',t=>{
 for(const noRoll of [false,true]){const f=fixture(t);if(noRoll)f.noRoll();const original=f.db.getCityRecord(f.guild,'typed_intent',f.action.record_key),events=f.count('events');f.setFailure('gm_action_ruling');assert.throws(f.adjudicate,/injected/);assert.deepEqual(f.db.getCityRecord(f.guild,'typed_intent',f.action.record_key),original);assert.equal(f.db.getCityRecord(f.guild,'roll_request','request-c19'),null);assert.equal(f.count('events'),events);assert.equal(f.count('records'),1);}
});
test('native envelopes cannot claim resolution without receipts or bypass no-roll consent and costs',t=>{
 const f=fixture(t);assert.throws(()=>f.arbitration.adjudicationEnvelope({intent:'attempt',source_refs:['source'],mode:'native_resolved'}),/application receipt/);assert.throws(()=>f.arbitration.adjudicationEnvelope({intent:'attempt',source_refs:['source'],mode:'no_roll',required_consent:['owner']}),/bypass consent or costs/);const blocked=f.arbitration.movementAdjudication({sourceRef:'source',sourceSpan:'I try to leave.',blockedReason:'Native route pending'});assert.equal(blocked.mode,'blocked');assert.deepEqual(blocked.proposed_mutations,[]);
});
test('actual arbitration provider cold-imports all original rule and adjudication interfaces',async()=>{
 const p=await import('../../src/rules-arbitration.js');for(const name of ['selectRuleBasis','adjudicationEnvelope','adjudicateAcceptedIntent','movementAdjudication'])assert.equal(typeof p[name],'function');
});

test('a mundane capability that repeats an SRD rule already in raw_refs still creates the pending roll',t=>{
 // Mirrors the live 2026-10-28 ruling held as CAPABILITY_ADAPTER_REQUIRED for capability.ref 'srd:action-rolls'.
 const f=fixture(t);Object.assign(f.proposal,{capability:{kind:'mundane',ref:'srd:action-rolls'},raw_refs:['srd:action-rolls']});
 const row=f.adjudicate();assert.equal(row.status,'roll_pending');assert.equal(row.data.review_reason??null,null);
 const g=fixture(t);Object.assign(g.proposal,{capability:{kind:'mundane',ref:'feature:shadow-stepper'},raw_refs:['srd:action-rolls']});
 assert.equal(g.adjudicate().data.review_reason,'CAPABILITY_ADAPTER_REQUIRED','a real feature reference still needs its adapter');
});

test('a re-proposal for an already-ruled action returns the saved ruling instead of failing',t=>{
 // Mirrors the live 2026-10-28 world-director failure "Ruling terms changed" on a re-read of a ruled player action.
 const f=fixture(t),first=f.adjudicate();assert.equal(first.status,'roll_pending');
 Object.assign(f.proposal,{difficulty:15,context_refs:['fact-c19']});
 const again=f.adjudicate();assert.equal(again.record_key,first.record_key);assert.equal(again.data.proposal.difficulty,12,'saved terms are unchanged');
 assert.equal(f.requests(),1,'no second roll request is prepared');
});

test('invented context labels are ignored while real cited evidence still grounds the ruling',t=>{
 // Mirrors the live 2026-10-28 ruling held as CONTEXT_UNVERIFIED for refs like 'presence:npc-nessa-vale'.
 const f=fixture(t);f.proposal.context_refs=['fact-c19','presence:npc-c19'];
 assert.equal(f.adjudicate().status,'roll_pending');
 const g=fixture(t);g.proposal.context_refs=['presence:npc-c19'];
 assert.equal(g.adjudicate().status,'roll_pending','with only invented labels the native scene context grounds the attempt');
 const h=fixture(t);h.proposal.context_refs=[h.action.source_event,'presence:npc-c19'];
 assert.equal(h.adjudicate().data.review_reason,'CONTEXT_UNVERIFIED','a real but ineligible event (the player declaration) still fails');
});