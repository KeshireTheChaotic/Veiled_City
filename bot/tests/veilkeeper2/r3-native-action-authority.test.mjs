import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createHopeConsentIngress} from '../../src/v2/rules/hope-consent-ingress.js';
import {createNativeActionAuthority} from '../../src/v2/native-action-authority.js';
import {createKernel,createMemoryJournal} from '../../src/v2/kernel.js';
import {createRehearsal} from '../../src/v2/rehearsal.js';

function fixture(t,{partyOriginal=false,decision='accept',persistent=false}={}){
  const directory=persistent?mkdtempSync(join(tmpdir(),'vk2-native-action-')):null,scenes=openSceneStore(),registry=openSourceRegistry(),check=()=>{};let actions=openActionStore(directory?join(directory,'actions.sqlite'):':memory:');
  t.after(()=>{actions.close();registry.close();scenes.close();if(directory){assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}});
  const character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:3,hope_max:6},gm_private:'hidden-native-hook'}};
  scenes.commitSnapshot({campaignId:'c',principal:'gm',sourceRef:'setup',records:[
    {kind:'session',data:{id:'session',campaignId:'c',status:'active'}},
    {kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'u',actorId:'pc',presence:'present'}]}},
    {kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},
    {kind:'channel',data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}},
    {kind:'channel',data:{id:'party',campaignId:'c',sceneId:'s',kind:'party',permissionsVerified:true,recipientIds:['u','v'],writerIds:['u']}},
    {kind:'message',data:{id:'attempt',campaignId:'c',channelId:partyOriginal?'party':'private',userId:'u',deleted:false,text:'I attempt the action.'}},
    {kind:'message',data:{id:'choice',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:'I explicitly choose the saved Hope cost.'}}
  ].map(r=>({...r,expectedRevision:null}))},{check});
  actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:3,cap:6},{check});actions.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:3,max:3}},{check});actions.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'reviewed-profile',sourceRevision:'1',level:2,stress:{current:0,max:6}},{check});
  let canonical=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:{getCharacter:()=>character}});const readers={...canonical.readers,readActor:(...args)=>canonical.readActor(...args),sourceRegistry:registry},authority=createSourceAuthority(readers),event=id=>({campaignId:'c',messageId:id,userId:'u',actorId:'pc'}),origin=authority.authenticate(event('attempt')),choice=authority.authenticate(event('choice'));
  const identity={id:'a',kind:'hope_cost',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',sourceRef:origin.id,sourceRevision:origin.revision};
  actions.create(identity,{check});actions.registerHopeTerms({...identity,revision:'terms-1',controlRevision:'1',cost:{resource:'hope',slot:'base',amount:2}},{check});actions.transition({campaignId:'c',actionId:'a',sourceRef:'notice',expectedRevision:1,to:'awaiting_consent'},{check});
  const ingress=createHopeConsentIngress({sourceAuthority:authority,readActor:canonical.readActor,actionStore:actions,readDecision:()=>({sourceRef:choice.id,sourceRevision:choice.revision,principal:'u',campaignId:'c',sceneId:'s',actionRef:'a',termsRevision:'terms-1',actorId:'pc',amount:2,costSlot:'base',decision})}),consent=ingress.record(choice,'a');
  const native=createNativeActionAuthority({sourceAuthority:authority,readActor:canonical.readActor,actionStore:actions}),kernel=createKernel({authority,journal:createMemoryJournal(),actionAuthority:native}),tools=kernel.bind(kernel.intake(event('choice')));
  const proposal={source_ref:choice.id,actor_ref:'pc',action:{kind:'hope_cost.commit',parameters:{action_ref:'a',consent_ref:consent.id}}};
  return {scenes,get actions(){return actions;},get canonical(){return canonical;},authority,readers,event,origin,choice,consent,native,kernel,tools,proposal,directory,reopen(){if(!directory)throw new Error('Persistent fixture required');actions.close();actions=openActionStore(join(directory,'actions.sqlite'));canonical=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:{getCharacter:()=>character}});return createNativeActionAuthority({sourceAuthority:authority,readActor:canonical.readActor,actionStore:actions});}};
}

test('generic action proposal commits exact owner-consented native Hope once and inspection returns only receipt projection',t=>{
  const f=fixture(t);assert.deepEqual(Object.keys(f.tools),['context_read','action_propose','state_inspect','knowledge_propose']);
  const first=f.tools.action_propose(f.proposal);assert.equal(first.effects_committed,true);assert.equal(first.receipt_ref,'a');assert.deepEqual(first.disclosure,{recipient_ids:['u'],npc_knowledge:false});assert.deepEqual(first.effects,[{kind:'resource_spent',resource:'hope',amount:2}]);assert.equal(f.actions.readHope('c','pc').hope,1);
  assert.deepEqual(f.tools.action_propose(f.proposal),first);assert.deepEqual(f.tools.state_inspect({receipt_ref:'a'}),first);assert.equal(f.actions.readHope('c','pc').hope,1);assert.equal(JSON.stringify(first).includes('hidden-native-hook'),false);assert.equal(Object.hasOwn(first,'beforeHope'),false);assert.equal(f.kernel.describe().effectExecution,true);
});
test('model amounts, fake consent, wrong actor and arbitrary patch kinds cannot spend Hope',t=>{
  for(const change of [p=>p.action.parameters.amount=1,p=>p.action.parameters.consent_ref='fake',p=>p.actor_ref='other',p=>p.action.kind='state.patch']){
    const f=fixture(t),input=structuredClone(f.proposal);change(input);assert.equal(f.tools.action_propose(input).status,'blocked');assert.equal(f.actions.readHope('c','pc').hope,3);assert.equal(f.actions.readOutcome('c','a'),null);
  }
});
test('a party-origin action can use its exact private owner-choice source, without disclosing resource receipts to party inference',t=>{
  const f=fixture(t,{partyOriginal:true}),party=f.kernel.bind(f.kernel.intake(f.event('attempt')));
  assert.equal(party.action_propose({...f.proposal,source_ref:f.origin.id}).status,'blocked');assert.equal(f.actions.readHope('c','pc').hope,3);
  assert.equal(f.tools.action_propose(f.proposal).effects_committed,true);assert.equal(party.state_inspect({receipt_ref:'a'}).status,'blocked');assert.equal(f.actions.readHope('c','pc').hope,1);
});
test('rejected consent or revoked owner source cannot become a native effect',t=>{
  const rejected=fixture(t,{decision:'reject'});assert.equal(rejected.tools.action_propose(rejected.proposal).status,'blocked');assert.equal(rejected.actions.readHope('c','pc').hope,3);
  const revoked=fixture(t),old=revoked.scenes.readers.readMessage('c','choice');revoked.scenes.commitSnapshot({campaignId:'c',principal:'u',sourceRef:'edit',records:[{kind:'message',expectedRevision:Number(old.revision),data:{id:'choice',campaignId:'c',channelId:'private',userId:'u',deleted:false,text:'Changed choice'}}]},{check:()=>{}});
  assert.equal(revoked.tools.action_propose(revoked.proposal).code,'source_authority_changed');assert.equal(revoked.actions.readHope('c','pc').hope,3);
});
test('real rehearsal exposes the generic native bridge and returns engine results before prose without a rewrite call',async t=>{
  const f=fixture(t),calls=[];const app=createRehearsal({readers:f.readers,records:{metadata:()=>null,readText:()=>null},actionAuthority:f.native,provider:{generate:async input=>{calls.push(input);if(!input.history.length)return {toolCalls:[{id:'commit',name:'action_propose',arguments:{...f.proposal,source_ref:input.context.source_ref}}]};assert.equal(input.history[0].toolResults[0].result.effects_committed,true);return {text:'The native cost was processed.'};}}});
  const turn=await app.respond(f.event('choice'));assert.equal(turn.metrics.modelCalls,2);assert.equal(turn.metrics.toolCalls,1);assert.equal(f.actions.readHope('c','pc').hope,1);const publication=app.inspectPublication(turn.publication.id);assert.equal(publication.sent,false);assert.equal(publication.receiptDependencies.length,1);assert.equal(publication.receiptDependencies[0].receiptRef,'a');assert.equal(f.native.verifyDependencies(f.choice,JSON.parse(JSON.stringify(publication.receiptDependencies))),true);assert.equal(JSON.stringify(calls).includes('hidden-native-hook'),false);
});

test('final native engine authorization failure rolls back the debit and terminal receipt',t=>{
  const f=fixture(t);let checks=0;const store={...f.actions,commitHopeCost:(input,options)=>f.actions.commitHopeCost(input,{...options,check:()=>{options.check();if(++checks===2)throw new Error('native final authority revoked');}})},native=createNativeActionAuthority({sourceAuthority:f.authority,readActor:f.canonical.readActor,actionStore:store}),kernel=createKernel({authority:f.authority,journal:createMemoryJournal(),actionAuthority:native}),tools=kernel.bind(kernel.intake(f.event('choice')));
  assert.equal(tools.action_propose(f.proposal).status,'blocked');assert.equal(f.actions.readHope('c','pc').hope,3);assert.equal(f.actions.read('c','a').status,'ready_to_commit');assert.equal(f.actions.readOutcome('c','a'),null);
});

test('receipt inspection checks ownership before accessing full outcome or consent bodies',t=>{
  const f=fixture(t);f.actions.create({id:'other',kind:'hope_cost',campaignId:'c',sceneId:'s',actorId:'other-pc',ownerUserId:'v',sourceRef:'other-source',sourceRevision:'1'},{check:()=>{}});let bodyReads=0;
  const native=createNativeActionAuthority({sourceAuthority:f.authority,readActor:f.canonical.readActor,actionStore:{...f.actions,readOutcome:()=>{bodyReads++;throw new Error('private outcome');},readActionTerms:()=>{bodyReads++;throw new Error('private terms');},readConsent:()=>{bodyReads++;throw new Error('private consent');}}});
  assert.throws(()=>native.inspect(f.choice,'other'),/owner-private/);assert.equal(bodyReads,0);assert.equal(f.actions.readHope('c','pc').hope,3);
});

test('a fresh native verifier checks saved receipt hashes and denies changed hashes, duplicates and party disclosure',t=>{
  const f=fixture(t,{partyOriginal:true}),receipt=f.tools.action_propose(f.proposal),dependencies=[{receiptRef:receipt.receipt_ref,receiptHash:receipt.receipt_hash}],fresh=createNativeActionAuthority({sourceAuthority:f.authority,readActor:f.canonical.readActor,actionStore:f.actions});
  assert.equal(fresh.verifyDependencies(f.choice,dependencies),true);assert.throws(()=>fresh.verifyDependencies(f.choice,[{receiptRef:'a',receiptHash:'0'.repeat(64)}]),/lineage changed/);assert.throws(()=>fresh.verifyDependencies(f.choice,[...dependencies,...dependencies]),/dependency/);assert.throws(()=>fresh.verifyDependencies(f.origin,dependencies),/private/);assert.equal(f.actions.readHope('c','pc').hope,1);
});

test('asynchronous native handler results are held and rejected promises do not escape the generic boundary',t=>{
  const f=fixture(t),kernel=createKernel({authority:f.authority,journal:createMemoryJournal(),actionAuthority:{supports:()=>true,describe:()=>[],propose:()=>Promise.reject(new Error('private native diagnostic')),inspect:()=>Promise.reject(new Error('private inspection diagnostic'))}}),tools=kernel.bind(kernel.intake(f.event('choice')));
  assert.equal(tools.action_propose(f.proposal).code,'asynchronous_native_handler');assert.equal(tools.state_inspect({receipt_ref:'a'}).code,'asynchronous_native_handler');assert.equal(f.actions.readHope('c','pc').hope,3);
});

test('saved native effect dependencies revalidate after resource-store reopen without spending again',t=>{
  const f=fixture(t,{persistent:true}),receipt=f.tools.action_propose(f.proposal),path=join(f.directory,'receipt-dependencies.json');writeFileSync(path,JSON.stringify([{receiptRef:receipt.receipt_ref,receiptHash:receipt.receipt_hash}]));
  const fresh=f.reopen(),saved=JSON.parse(readFileSync(path,'utf8'));assert.equal(fresh.verifyDependencies(f.choice,saved),true);assert.equal(fresh.inspect(f.choice,'a').receipt_hash,receipt.receipt_hash);assert.equal(f.actions.readHope('c','pc').hope,1);assert.equal(fresh.propose(f.choice,f.proposal).effects_committed,true);assert.equal(f.actions.readHope('c','pc').hope,1);
});

test('ordinary party speech remains one inference with no cost or native receipt dependency',async t=>{
  const f=fixture(t,{partyOriginal:true});let calls=0;const app=createRehearsal({readers:f.readers,records:{metadata:()=>null,readText:()=>null},actionAuthority:f.native,provider:{generate:async()=>{calls++;return {text:'The clerk considers your offer.'};}}});const turn=await app.respond(f.event('attempt'));assert.equal(calls,1);assert.equal(turn.metrics.toolCalls,0);assert.deepEqual(app.inspectPublication(turn.publication.id).receiptDependencies,[]);assert.equal(f.actions.readHope('c','pc').hope,3);
});

test('receipt-proof drift during continuation holds prose but preserves the already legitimate native cost',async t=>{
  const f=fixture(t);let drift=false,calls=0;const native={...f.native,inspect:(source,ref)=>{const value=f.native.inspect(source,ref);return drift?{...value,receipt_hash:'0'.repeat(64)}:value;}};
  const app=createRehearsal({readers:f.readers,records:{metadata:()=>null,readText:()=>null},actionAuthority:native,provider:{generate:async input=>{calls++;if(!input.history.length)return {toolCalls:[{id:'commit',name:'action_propose',arguments:{...f.proposal,source_ref:input.context.source_ref}}]};drift=true;return {text:'A draft that must remain held.'};}}});
  await assert.rejects(app.respond(f.event('choice')),/receipt dependency changed/);assert.equal(calls,2);assert.equal(f.actions.readHope('c','pc').hope,1);assert.equal(f.actions.readOutcome('c','a').effectsCommitted,true);
});
