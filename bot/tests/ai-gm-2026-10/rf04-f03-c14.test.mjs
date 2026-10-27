import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeKnowledgeWorld} from '../../src/application/composition/public.js';
initializeKnowledgeWorld();
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createSemanticCandidateProof} from '../../src/frameworks/knowledge/public.js';
import {conversationPrincipal} from '../../src/conversation-principal.js';
import {currentScene} from '../../src/scene-continuity.js';
import {overlapsOwnerActionTerminal} from '../../src/owner-action-terminal.js';
import {authoredTurnEnvelope,captureAuthoredTurnEnvelope,recordNativeConsumedSpans} from '../../src/authored-turn-envelope.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
import {persistPlayerIntents} from '../../src/typed-intents.js';
import {captureArcCandidate,personalArc} from '../../src/personal-continuity.js';
import {applyCanonProposalDrafts} from '../../src/state.js';
import {stateRevision} from '../../src/kernel/state-revision.js';
import {indexWorldEvent} from '../../src/frameworks/world/public.js';
import * as original from '../../src/semantic-candidate-source.js';

function sourceTable(t,{privateScene=false,operation='personal_commitment_candidate',raw='I want to understand the old library letter.'}={}){
 const folder=mkdtempSync(join(tmpdir(),'rf04-owner-proof-c14-')),file=join(folder,'proof.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema);db.ensureCampaign('proof');db.setCityCalendar('proof',{flags:{personal_arcs:true}});for(const user of ['author','visitor'])db.upsertPlayer('proof',user,user);const pc=db.createCharacter('proof','author','Author'),other=db.createCharacter('proof','visitor','Visitor'),session=db.startSession('proof','Native source qualification');for(const [user,c] of [['author',pc],['visitor',other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,'present');}const message='proof-message',scope={mode:privateScene?'private':'party',actorUserId:'author',actorCharacterId:pc.id},world=captureWorldInput(db,'proof','author',pc.id,message,raw,{privateScene}),envelope=captureAuthoredTurnEnvelope(db,'proof','author',pc.id,message,raw,{privateScene});
 const proposal={type:'other',source_span:raw,target_name:'',target_key:'',destination:'unspecified',operation,utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Deterministic mock semantic proposal; native verifies source, control and framing.'},accepted=persistPlayerIntents(db,'proof',[proposal],scope,{messageId:message})[0],api=createSemanticCandidateProof({conversationPrincipal,currentScene,overlapsOwnerActionTerminal,authoredTurnEnvelope}),verify=()=>api.ownerSemanticSource(db,'proof',accepted.record_key,scope,operation,message);
 assert.equal(accepted?.status,'accepted_for_adjudication','native proposal must be accepted before proof qualification');t.after(()=>{db.close();rmSync(folder,{recursive:true,force:true});});return {get db(){return db;},api,pc,other,session,message,raw,scope,world,envelope,accepted,proposal,operation,verify,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('native input capture and intent acceptance yield exact owner source proof without PC decision, movement or outcome',t=>{
 const f=sourceTable(t),before=f.db.getCharacter(f.pc.id),counts=f.db.cityRecordCounts('proof'),verified=f.verify();assert.equal(f.accepted.status,'accepted_for_adjudication');assert.equal(f.accepted.data.resolution,'conversational');assert.equal(verified.source.event_key,f.envelope.source_event);assert.equal(verified.statement,f.raw);assert.equal(verified.proof.world_hash,original.semanticCandidateHash(f.world));assert.equal(verified.proof.accepted_hash,original.semanticCandidateHash(f.accepted));assert.deepEqual(f.db.cityRecordCounts('proof'),counts);assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.listSimulationRecords('proof',{kind:'action'}).length,0);assert.equal(f.db.listCanon('proof',{includeGM:true}).length,0);
});

test('actual private optional candidate remains pending until explicit owner confirmation of its immutable words',t=>{
 const f=sourceTable(t,{privateScene:true}),candidate=captureArcCandidate(f.db,'proof','author',f.pc.id,f.message,f.raw,{acceptedIntent:f.accepted.record_key});assert.equal(candidate.status,'pending');assert.equal(candidate.visibility,'character');assert.equal(candidate.data.version,2);assert.equal(candidate.data.nonbinding,true);assert.equal(candidate.data.statement,f.raw);assert.equal(f.db.listCityRecords('proof',{kind:'arc',includeGM:true}).length,0);const response=personalArc(f.db,'proof','author',{op:'confirm',key:candidate.record_key,arc_key:'letter',expected_revision:stateRevision(candidate)});assert.equal(response.status,'confirmed');assert.equal(f.db.getCityRecord('proof','arc',f.pc.id+':letter').data.statement,f.raw);assert.equal(f.db.listCanon('proof',{includeGM:true}).length,0);
});

test('actual private canon draft remains pending and exact proof terms and audience are required before native GM review',t=>{
 const raw='The Lantern Guild was founded at this library. Please submit this for GM review.',f=sourceTable(t,{privateScene:true,operation:'proposal_campaign_canon',raw}),value='The Lantern Guild was founded at this library.',out=applyCanonProposalDrafts(f.db,'proof',f.session.id,[{key:'guild.origin',value,visibility:'gm',reason:'Explicit private owner proposal'}],f.scope,{typedIntents:[f.accepted],messageId:f.message});assert.equal(out[0].ok,true);const row=out[0].row;assert.equal(row.source,'typed_private_proposal_v2');assert.equal(f.db.listCanon('proof',{includeGM:true}).length,0);assert.doesNotThrow(()=>f.api.assertCanonProposalProof(f.db,'proof',row,'gm'));assert.throws(()=>f.api.assertCanonProposalProof(f.db,'proof',{...row,proposed_value:'Different terms'},'gm'));assert.throws(()=>f.api.assertCanonProposalProof(f.db,'proof',row,'party'));const resolved=f.db.resolveCanonProposal('proof',row.id,{resolution:'accept',actorId:'human-gm'});assert.equal(resolved.status,'accepted');assert.equal(f.db.currentCanon('proof','guild.origin').value,value);assert.equal(f.db.currentCanon('proof','guild.origin').visibility,'gm');
});

test('changed current controller revision invalidates saved optional proof without erasing native source or accepted history',t=>{
 const f=sourceTable(t),proof=f.verify().proof;f.db.assignCharacter(f.session.id,'author',f.pc.id);assert.throws(()=>f.api.assertSemanticCandidateProof(f.db,'proof',proof));assert.equal(f.db.getCityRecord('proof','typed_intent',f.accepted.record_key).status,'accepted_for_adjudication');assert.equal(f.db.getWorldEvent('proof',f.envelope.source_event).details.raw_text,f.raw);
});

test('changed scene invalidates prior optional proof and does not silently recapture owner declaration',t=>{
 const f=sourceTable(t),proof=f.verify().proof;f.db.setDirectorState(f.session.id,{scene_number:2,scene_label:'Later scene'});assert.throws(()=>f.api.assertSemanticCandidateProof(f.db,'proof',proof));assert.equal(f.db.listCityRecords('proof',{kind:'arc_candidate',includeGM:true}).length,0);assert.equal(f.db.getWorldEvent('proof',f.envelope.source_event).scene,f.accepted.data.scene);assert.notEqual(currentScene(f.db,'proof').key,f.accepted.data.scene);
});

test('retracted world source holds proof while immutable authenticated envelope and typed intent remain readable',t=>{
 const f=sourceTable(t),proof=f.verify().proof;indexWorldEvent(f.db,'proof',{key:f.world.event_key,status:'retracted'});f.reopen();assert.throws(()=>f.api.assertSemanticCandidateProof(f.db,'proof',proof));assert.equal(authoredTurnEnvelope(f.db,'proof',f.message,f.pc.id).raw_text,f.raw);assert.equal(f.db.getCityRecord('proof','typed_intent',f.accepted.record_key).data.source_span,f.raw);
});

test('tampered owner raw text or copied proof hashes cannot substitute the authenticated source',t=>{
 const f=sourceTable(t),verified=f.verify();assert.throws(()=>f.api.assertSemanticCandidateProof(f.db,'proof',{...verified.proof,accepted_hash:'changed'}));const event=f.db.getWorldEvent('proof',f.envelope.source_event);f.db.saveWorldEvent('proof',{...event,key:event.event_key,details:{...event.details,raw_text:'I consent to a different action.'}});assert.throws(()=>f.verify());assert.equal(f.db.listCityRecords('proof',{kind:'arc_candidate',includeGM:true}).length,0);
});

test('actual native consumed-span annotation prevents the same owner range becoming another optional proposal',t=>{
 const f=sourceTable(t);f.db.recordOperationReceipt('proof',{interactionId:'mock-native-consumption',commandKey:'fixture:no-gameplay-effect',actorUserId:'author',payload:{mock_boundary_only:true}});recordNativeConsumedSpans(f.db,'proof','author',f.pc.id,f.message,[{start:0,end:f.raw.length,receipt_ref:'mock-native-consumption'}]);assert.throws(()=>f.verify());assert.equal(f.db.listCityRecords('proof',{kind:'arc_candidate',includeGM:true}).length,0);assert.equal(f.db.listCanon('proof',{includeGM:true}).length,0);
});

test('owner terminal-range capability and private audience independently prevent optional source reuse',t=>{
 const f=sourceTable(t,{privateScene:true}),terminal=createSemanticCandidateProof({conversationPrincipal,currentScene,overlapsOwnerActionTerminal:()=>true,authoredTurnEnvelope});assert.throws(()=>terminal.ownerSemanticSource(f.db,'proof',f.accepted.record_key,f.scope,f.operation,f.message));assert.throws(()=>f.api.ownerSemanticSource(f.db,'proof',f.accepted.record_key,{...f.scope,mode:'party'},f.operation,f.message));assert.throws(()=>f.api.ownerSemanticSource(f.db,'proof',f.accepted.record_key,{mode:'private',actorUserId:'visitor',actorCharacterId:f.other.id},f.operation,f.message));
});

test('non-first-person optional candidate and nonprivate canon request do not pass source proof despite fallible interpretation',t=>{
 const other=sourceTable(t,{raw:'The librarian wants to revisit a letter.'});assert.throws(()=>other.verify());const publicCanon=sourceTable(t,{operation:'proposal_campaign_canon',raw:'Please submit the guild origin for review.'});assert.throws(()=>publicCanon.verify());assert.equal(publicCanon.db.listCanon('proof',{includeGM:true}).length,0);
});

test('historical imported canon proposals retain old review compatibility but typed version cannot omit native binding',t=>{
 const f=sourceTable(t);assert.equal(f.api.assertCanonProposalProof(f.db,'proof',{id:'historical-import',source:'external_character_creator'}),undefined);assert.throws(()=>f.api.assertCanonProposalProof(f.db,'proof',{id:'unbound-typed',source:'typed_private_proposal_v2'}));assert.deepEqual(original.semanticCandidateOperations,['personal_commitment_candidate','proposal_campaign_canon']);assert.equal(f.api.semanticCandidateHash({a:1,b:2}),createHash('sha256').update(JSON.stringify({a:1,b:2})).digest('hex'));
});

test('saved native source proof survives restart and original source exports revalidate exact current ancestry',t=>{
 const f=sourceTable(t),before=f.verify();f.reopen();const after=original.assertSemanticCandidateProof(f.db,'proof',before.proof);assert.equal(after.statement,f.raw);assert.deepEqual(after.proof,before.proof);assert.equal(original.ownerSemanticSource(f.db,'proof',f.accepted.record_key,f.scope,f.operation,f.message).row.record_key,f.accepted.record_key);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});
