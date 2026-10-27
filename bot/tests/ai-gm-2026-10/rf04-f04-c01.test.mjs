import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeNativeScenes} from '../../src/application/composition/public.js';
initializeNativeScenes();
import {initializeNativeWorldEvents} from '../../src/application/composition/public.js';
initializeNativeWorldEvents();
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import * as sessionApi from '../../src/frameworks/session/public.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
import {captureAuthoredTurnEnvelope} from '../../src/authored-turn-envelope.js';
import {persistPlayerIntents} from '../../src/typed-intents.js';
import {actionReviewOperation} from '../../src/gm-action-review.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import {stateRevision} from '../../src/kernel/state-revision.js';

function gathering(t){
 const folder=mkdtempSync(join(tmpdir(),'rf04-session-leaf-c01-')),file=join(folder,'session.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('table');for(const user of ['owner','visitor','observer','npc-user'])db.upsertPlayer('table',user,user);const pc=db.createCharacter('table','owner','Mira'),other=db.createCharacter('table','visitor','Tavian'),session=db.startSession('table','Controller identity');for(const [user,c] of [['owner',pc],['visitor',other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,'present');}db.setPresence(session.id,'observer','late');
 t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {get db(){return db;},pc,other,session,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('five isolated Session moves preserve implementation fingerprints and historical exported identities',async()=>{
 const manifest=JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/Implementation_Plans/Framework_Refactor/features/RF04-F04/C01-MOVE.json',import.meta.url)),'utf8'));assert.equal(manifest.moves.length,5);for(const item of manifest.moves){const path=fileURLToPath(new URL('../../../'+item.to,import.meta.url));assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),item.moved_sha256);if(item.change==='byte-identical')assert.equal(item.original_sha256,item.moved_sha256);const before=await import('../../src/'+item.from.split('/').at(-1)),after=await import('../../src/frameworks/session/'+item.to.split('/').at(-1));for(const [key,value] of Object.entries(after)){assert.equal(before[key],value);assert.equal(sessionApi[key],value);}}
});

test('current owner principal binds actual session assignment and revision without PC action, spending or placement',t=>{
 const f=gathering(t),before=f.db.getCharacter(f.pc.id),principal=sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id);assert.equal(principal.kind,'owner');assert.equal(principal.character_id,f.pc.id);assert.equal(principal.context_id,f.pc.id);assert.equal(principal.session_id,f.session.id);assert.match(principal.authority,/no owner-private memory, spending, consent or voluntary PC decisions delegated/);assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(before.data.location,undefined);f.reopen();assert.equal(sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id).revision,principal.revision);
});

test('native current-role revision changes on reassignment and absent/no-role controllers receive no principal',t=>{
 const f=gathering(t),before=sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id);f.db.assignCharacter(f.session.id,'owner',f.pc.id);assert.notEqual(sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id).revision,before.revision);f.db.setPresence(f.session.id,'owner','absent');assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id),/attendance/);assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','observer'),/authenticated current controlled role/);f.db.endSession('table');assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','owner'),/Active session/);
});

test('actual PC proxy context is distinct from owner-private identity and never qualifies as historical owner',t=>{
 const f=gathering(t);f.db.assignCharacter(f.session.id,'visitor',f.pc.id,{role:'proxy'});const proxy=sessionApi.conversationPrincipal(f.db,'table','visitor',f.pc.id);assert.equal(proxy.kind,'pc_proxy');assert.match(proxy.context_id,/^control:/);assert.notEqual(proxy.context_id,f.pc.id);assert.throws(()=>sessionApi.historicalOwnerPrincipal(f.db,'table','visitor',f.pc.id),/no proxy history/);assert.equal(sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id).kind,'owner');
});

test('offered NPC control is not a current role; explicit activation grants only its separate proxy context',t=>{
 const f=gathering(t);f.db.setPresence(f.session.id,'npc-user','guest');const offered=f.db.upsertNpcProxy('table',f.session.id,{npcName:'Clockmaker',userId:'npc-user',status:'offered',playerPacket:{known:'Actor-only packet'},gmNote:'Distinct hidden GM cause'});assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','npc-user'),/controlled role/);f.db.activateNpcProxy(offered.id,'npc-user');const proxy=sessionApi.conversationPrincipal(f.db,'table','npc-user');assert.equal(proxy.kind,'npc_proxy');assert.match(proxy.context_id,/^control:/);assert.notEqual(proxy.context_id,f.pc.id);f.db.releaseNpcProxy(offered.id);assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','npc-user'),/controlled role/);
});

test('historical owner ancestry preserves dead or retired source readers without restoring live action authority',t=>{
 const f=gathering(t);for(const status of ['retired','dead']){f.db.setCharacterStatus(f.pc.id,status,f.session.id);assert.throws(()=>sessionApi.conversationPrincipal(f.db,'table','owner',f.pc.id),/Active campaign character/);const historical=sessionApi.historicalOwnerPrincipal(f.db,'table','owner',f.pc.id);assert.equal(historical.kind,'historical_owner');assert.match(historical.authority,/no new consent, action, spending or effect/);assert.equal(historical.character_id,f.pc.id);}
});

function acceptedAttempt(f){
 const raw='I inspect the sealed exhibit.',message='native-withdrawal',scope={mode:'private',actorUserId:'owner',actorCharacterId:f.pc.id};captureWorldInput(f.db,'table','owner',f.pc.id,message,raw,{privateScene:true});const envelope=captureAuthoredTurnEnvelope(f.db,'table','owner',f.pc.id,message,raw,{privateScene:true}),proposal={type:'interact',source_span:raw,target_name:'',target_key:'',destination:'unspecified',operation:'inspect',utterance:'',excluded_targets:[],framing:'immediate',resolution:'blocked',reason:'Deterministic unsupported native action fixture'},action=persistPlayerIntents(f.db,'table',[proposal],scope,{messageId:message})[0];assert.equal(action.status,'accepted_for_adjudication');const review=f.db.saveCityRecord('table',{kind:'unsupported_action',key:'native-review',status:'needs_review',visibility:'gm',source_event:action.source_event,data:{action:action.record_key,owner:'owner',actor:f.pc.id,principal_revision:action.data.actor_principal_revision,source_hash:action.data.source_hash,session:f.session.id,scene:action.data.scene,private_scene:true,category:'native_adapter_absence',reason_code:'ADAPTER_UNSUPPORTED',original_resolution:'blocked',alternative:'Use reviewed native support or a fresh owner declaration.',ruling:null}});return {raw,message,scope,envelope,proposal,action,review};
}

test('actual owner native withdrawal creates a source-range tombstone, retained across restart and presentation retraction',t=>{
 const f=gathering(t),a=acceptedAttempt(f),before=f.db.getCharacter(f.pc.id);actionReviewOperation(f.db,'table','owner',{op:'action-review-withdraw',review:a.review.record_key,revision:stateRevision(a.review)});const updated=f.db.getCityRecord('table','typed_intent',a.action.record_key);assert.ok(updated.data.gm_review_terminal);assert.equal(sessionApi.overlapsOwnerActionTerminal(f.db,'table',a.envelope.source_event,0,1),true);assert.equal(sessionApi.overlapsOwnerActionTerminal(f.db,'table',a.envelope.source_event,a.raw.length,a.raw.length+1),false);indexWorldEvent(f.db,'table',{key:updated.data.gm_review_terminal,status:'retracted'});f.reopen();assert.equal(sessionApi.overlapsOwnerActionTerminal(f.db,'table',a.envelope.source_event,1,2),true);assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.listSimulationRecords('table',{kind:'action'}).length,0);
});

test('wrong controller or forged terminal choice cannot cancel another owner range or turn stale history into execution',t=>{
 const f=gathering(t),a=acceptedAttempt(f);assert.throws(()=>actionReviewOperation(f.db,'table','visitor',{op:'action-review-withdraw',review:a.review.record_key,revision:stateRevision(a.review)}),/current action owner/);assert.throws(()=>sessionApi.recordOwnerActionTerminal(f.db,'table',a.action,'fabricated-choice'),/source ancestry/);assert.equal(sessionApi.overlapsOwnerActionTerminal(f.db,'table',a.envelope.source_event,0,1),false);assert.equal(f.db.getCityRecord('table','unsupported_action',a.review.record_key).status,'needs_review');
});

test('truthful authoring codes never include provider body and opening evidence does not equate acknowledgment with semantic coverage',()=>{
 assert.equal(sessionApi.openingEntryAuthoringCode({code:'OPENING_WRITER_PROVIDER',message:'Distinct provider private body'}),'PROVIDER_ERROR');assert.equal(sessionApi.openingEntryAuthoringCode({name:'TimeoutError'}),'PROVIDER_DEADLINE');assert.equal(sessionApi.openingEntryAuthoringCode({code:'OPENING_ENTRY_STALE'}),'SOURCE_CHANGED');assert.equal(sessionApi.openingEntryAuthoringCode({code:'OPENING_WRITER_PARSE'}),'WRITER_PARSE');const refs=['source-one'],e=sessionApi.openingEntryEvidence({source_refs:refs},{narrativeVerified:true});refs.push('later');assert.deepEqual(e.source_refs,['source-one']);assert.equal(e.hook_verified,false);assert.equal(e.dramatic_coverage,'unverified');assert.equal(sessionApi.openingEntryEvidence({source_refs:[]},{fallback:true}).coverage_reason,'native_orientation_is_not_authored_scene');
});

test('delivery truth derives from every actual status and message receipt, retaining fallback and uncertainty distinctions',()=>{
 const delivered={status:'delivered',discord_message_id:'mock-message'};assert.equal(sessionApi.openingEntryDeliveryStatus({},[]),'pending');assert.equal(sessionApi.openingEntryDeliveryStatus({},[{status:'delivered'}]),'pending');assert.equal(sessionApi.openingEntryDeliveryStatus({},[delivered]),'delivered');assert.equal(sessionApi.openingEntryDeliveryStatus({fallback:true},[delivered]),'fallback_delivered');assert.equal(sessionApi.openingEntryDeliveryStatus({},[delivered],1),'pending');assert.equal(sessionApi.openingEntryDeliveryStatus({},[delivered,{status:'failed'}]),'failed');for(const status of ['uncertain','delivering'])assert.equal(sessionApi.openingEntryDeliveryStatus({},[delivered,{status},{status:'failed'}]),'uncertain');
});

test('assembly dramatic intent revision changes with source or goal but never claims semantic fulfillment',()=>{
 const one=sessionApi.assemblyCoverageEvidence({assembly_contract:{version:2,input_fingerprint:'revision-one'},convergence_goal:'A public opportunity'},'session');assert.equal(one.dramatic_coverage,'unverified');assert.equal(typeof one.dramatic_intent_revision,'string');assert.notEqual(sessionApi.assemblyCoverageEvidence({assembly_contract:{version:2,input_fingerprint:'revision-two'},convergence_goal:'A public opportunity'},'session').dramatic_intent_revision,one.dramatic_intent_revision);assert.equal(sessionApi.assemblyCoverageEvidence({assembly_contract:{version:1},convergence_goal:'Old goal'},'session').dramatic_intent_revision,null);
});

test('real roster diagnostics distinguish present unassigned players, PC proxies and offered NPC roles without claiming co-location',t=>{
 const f=gathering(t);f.db.assignCharacter(f.session.id,'owner',f.pc.id,{controlPolicy:'proxy',proxyUserId:'visitor'});f.db.upsertNpcProxy('table',f.session.id,{npcName:'Clockmaker',userId:'npc-user',status:'offered',gmNote:'Distinct hidden GM cause'});const lines=sessionApi.buildSessionRosterReport(f.db,'table',f.session),text=lines.join('\n');assert.match(text,/Assignment warning/);assert.match(text,/No active character assignment/);assert.match(text,/PC proxy/);assert.match(text,/Pending NPC Proxy Offers/);assert.doesNotMatch(text,/Distinct hidden GM cause/);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);const chunks=sessionApi.chunkRosterReport(lines,120);assert.ok(chunks.every(c=>c.length<=120));assert.deepEqual(sessionApi.chunkRosterReport([]),['No roster data.']);
});

test('six actual Session consumers adopt own public principal API without changing the source implementation',()=>{
 const manifest=JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/Implementation_Plans/Framework_Refactor/features/RF04-F04/C01-MOVE.json',import.meta.url)),'utf8'));assert.equal(manifest.consumers.length,6);for(const path of manifest.consumers){const source=readFileSync(fileURLToPath(new URL('../../../'+path,import.meta.url)),'utf8');assert.match(source,/from '.\/frameworks\/session\/public.js'/);assert.doesNotMatch(source,/from ['"]\.\/conversation-principal.js['"]/);}
});
