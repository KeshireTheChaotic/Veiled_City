import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectUnifiedArbitration} from '../../src/framework-to-framework/daggerheart--intent/public.js';
import {resolveRuleReferences,AUTHORITY_POLICY} from '../../src/frameworks/daggerheart/public.js';
function fixture(t,{character=false}={}){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 sqlite.exec('CREATE TABLE records (guild TEXT, kind TEXT, key TEXT, value TEXT, PRIMARY KEY(guild,kind,key))');let depth=0;
 const db={getCityRecord(g,k,r){const row=sqlite.prepare('SELECT value FROM records WHERE guild=? AND kind=? AND key=?').get(g,k,r);return row?JSON.parse(row.value):null;},
 saveCityRecord(g,r){const v={...r,record_key:r.key};sqlite.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?)').run(g,r.kind,r.key,JSON.stringify(v));return v;},
 transaction(fn){if(depth)return fn();sqlite.exec('BEGIN IMMEDIATE');depth++;try{const v=fn();sqlite.exec('COMMIT');return v;}catch(e){sqlite.exec('ROLLBACK');throw e;}finally{depth--; }},getRulesRuling(){return null;}};
 const binding={source:'source-31',scene:'scene-amber',session:8,location:'station'};
 const entry={intent_ref:'intent-31',actor:{type:character?'character':'npc',key:'actor-31'},operation:character?'help_ally':'speak',target_refs:[]};
 const board=db.saveCityRecord('g',{kind:'scene_intent_board',key:'board-31',source_event:binding.source,data:{origin:binding,entries:[entry]}});
 if(character)db.saveCityRecord('g',{kind:'typed_intent',key:entry.intent_ref,status:'accepted',data:{type:'interact',operation:'help_ally',owner_user_id:'owner-31'}});
 const events=[],source={gmArbitrationProposalSchema:{},unifiedArbitrationSchema:{},inspectArbitrationOrigin(){events.push('origin');return {binding,scope:{mode:'party'}};},
 buildSceneIntentBoard(){events.push('board');return board;},currentScenePlayerInputs(_d,_g,_o,rows){return rows;},arbitrationTurnOrigin:r=>r.origin,
 matchesArbitrationSchema:(_s,v)=>v?.bad!==true};
 const mechanics={EncounterLibrary:class {},indexWorldEvent(_d,_g,e){events.push('event');return {event_key:e.key};},
 consentAction(){events.push('owner');},historicalActionSource(){events.push('history');},isPvpIntent:()=>false,
 applyNativeEnvironmentProfileProposals(){events.push('profiles');},establishPreparedPositions(){events.push('positions');},pendingFeatureWindows:()=>[],
 prepareNativeRollParticipation(){events.push('participation');return {eligibility:true};},executeEnvironmentProposal(_d,_g,_o,_b,p){events.push(p.id);if(p.id==='held')throw Object.assign(new Error('source stale'),{code:'STATE_CONFLICT'});},
 reserveFeatureWindow(){throw new Error('unexpected feature spend');}};
 const proposal={intent_ref:entry.intent_ref,disposition:'npc_no_roll',rule_basis_refs:['srd:gm-moves'],difficulty:null,trait:null,stakes:'none',reason:'The native NPC speaks.',feature_ref:'',experience_ref:'',advantage:false,disadvantage:false,proposal_version:2};
 return {db,sqlite,binding,entry,board,events,source,mechanics,proposal,service:()=>connectUnifiedArbitration({source,mechanics}),result(p=[proposal]){return {origin:{opaque:true},unified_arbitration:{decisions:p,npc_intents:[],environment_actions:[]}};}};
}
test('native NPC ordinary fiction produces a private source-bound decision and immutable replay',t=>{
 const f=fixture(t),s=f.service();const first=s.adjudicateSceneBoard(f.db,'g',{},f.board,[f.proposal]);
 assert.equal(first[0].status,'resolved_no_roll');assert.equal(first[0].visibility,'gm');assert.equal(first[0].data.native,null);assert.deepEqual(first[0].data.origin,f.binding);
 const n=f.events.filter(e=>e==='event').length;assert.deepEqual(s.adjudicateSceneBoard(f.db,'g',{},f.board,[f.proposal]),first);assert.equal(f.events.filter(e=>e==='event').length,n);
 assert.throws(()=>s.adjudicateSceneBoard(f.db,'g',{},f.board,[{...f.proposal,reason:'changed'}]),/immutable_decision_batch_changed/);
});
test('stale persisted board and cross-scene origin cannot authorize a proposal',t=>{
 const f=fixture(t);assert.throws(()=>f.service().adjudicateSceneBoard(f.db,'g',{}, {...f.board,data:{...f.board.data,entries:[]}},[f.proposal]),/current_native_board/);
 f.binding.scene='different';assert.throws(()=>f.service().adjudicateSceneBoard(f.db,'g',{},f.board,[f.proposal]),/current_native_board/);assert.equal(f.events.includes('event'),false);
});
test('unknown rule and conflicting Advantage remain review without an outcome',t=>{
 const f=fixture(t);const p={...f.proposal,rule_basis_refs:['srd:invented']};const [r]=f.service().adjudicateSceneBoard(f.db,'g',{},f.board,[p]);assert.equal(r.status,'needs_rules_review');assert.equal(r.data.native,null);
});
test('duplicate occurrence rolls back all decisions and batch reservation',t=>{
 const f=fixture(t);assert.throws(()=>f.service().adjudicateSceneBoard(f.db,'g',{},f.board,[f.proposal,f.proposal]),/decision_occurrence/);
 assert.equal(f.sqlite.prepare("SELECT count(*) n FROM records WHERE kind IN ('gm_arbitration_batch','gm_arbitration_decision')").get().n,0);
});
test('actual apply order consumes sealed board before independent environment proposals',t=>{
 const f=fixture(t),r=f.result();r.unified_arbitration.environment_actions=[{id:'held'},{id:'sibling'}];
 assert.equal(f.service().applyUnifiedArbitration(f.db,'g',r,[])[0].status,'resolved_no_roll');
 assert.ok(f.events.indexOf('profiles')<f.events.indexOf('board'));assert.ok(f.events.indexOf('event')<f.events.indexOf('held'));assert.ok(f.events.includes('sibling'));
 const held=f.sqlite.prepare("SELECT value FROM records WHERE kind='native_environment_action_review'").get();assert.equal(JSON.parse(held.value).data.execution_authorized,false);
});
test('owner Help classification is eligibility only; no consent or payment is manufactured',t=>{
 const f=fixture(t,{character:true});const p={...f.proposal,proposal_version:3,collaboration:{kind:'help'},disposition:'request_pc_action_roll'};
 const r=f.result([p]);assert.deepEqual([...f.service().prepareUnifiedCollaboration(f.db,'g',r,[])],[f.entry.intent_ref]);assert.ok(f.events.includes('owner'));
 const [d]=f.service().applyUnifiedArbitration(f.db,'g',r,[]);assert.equal(d.status,'pending_owner_choice');assert.match(d.data.reason,/separately chooses/);
});
test('revoked player authority propagates and rolls back native batch reservation',t=>{
 const f=fixture(t,{character:true});f.mechanics.consentAction=()=>{throw Object.assign(new Error('owner revoked'),{code:'PC_EFFECT_AUTHORITY'});};
 assert.throws(()=>f.service().adjudicateSceneBoard(f.db,'g',{},f.board,[f.proposal]),/owner revoked/);assert.equal(f.sqlite.prepare("SELECT count(*) n FROM records WHERE kind='gm_arbitration_batch'").get().n,0);
});
test('intent source port requires complete authenticated-source capabilities',t=>{
 const f=fixture(t);delete f.source.inspectArbitrationOrigin;assert.throws(()=>f.service(),/Complete current intent/);
});
test('moved rule authority checks reference existence, applicability and saved campaign scope',()=>{
 const db={getRulesRuling:(g,k)=>g==='g'&&k==='ruling'?{ruling_key:k,question:'Local ruling',updated_at:'v3'}:null};
 assert.equal(resolveRuleReferences(db,'g','RAW',['srd:action-rolls'],{rollKind:'reaction'}),null);
 assert.equal(resolveRuleReferences(db,'other','campaign_override',['override:ruling']),null);
 assert.equal(resolveRuleReferences(db,'g','campaign_override',['override:ruling'])[0].scope,'campaign:g');
 assert.equal(resolveRuleReferences(db,'g','campaign_override',['override:ruling@scene:x']),null);assert.match(AUTHORITY_POLICY,/Only native RNG/);
});
