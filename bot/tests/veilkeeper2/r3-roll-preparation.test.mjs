import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
import {createKernel,createMemoryJournal,createRulesetRegistry} from '../../src/v2/kernel.js';
function fixture(t){const store=openRollStore();t.after(()=>store.close());const source={id:'m',revision:'1',campaign:'c',scene:'s',principal:'u',actors:['pc'],recipients:['u'],text:'I try the latch.'};
  const actor={id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner',controlRevision:'1'},adjudication={id:'a',revision:'1',status:'accepted',sourceRef:'m',sourceRevision:'1',actorId:'pc',campaignId:'c',sceneId:'s',difficulty:12,stakes:'A guard may hear.',modifier:0,experience:0,advantage:0,disadvantage:0};
  const authority={authenticate:()=>source,revalidate:()=>true},service=createOrdinaryRollPreparation({sourceAuthority:authority,readActor:()=>actor,readAdjudication:()=>adjudication,rollStore:store});
  const kernel=createKernel({authority,journal:createMemoryJournal(),rules:createRulesetRegistry([service.definition])});return {store,source,actor,adjudication,service,tools:kernel.bind(kernel.intake({}))};}
test('generic preparation returns pending without persisting a request or accepting model roll terms',t=>{const f=fixture(t),input={source_ref:'m',actor_ref:'pc',action:{kind:'ordinary_roll.prepare',parameters:{adjudication_ref:'a'}}};assert.equal(f.tools.action_propose(input).status,'pending');
  assert.equal(f.tools.action_propose({...input,action:{...input.action,parameters:{adjudication_ref:'a',difficulty:1}}}).status,'blocked');
  const request=f.service.commitRequest(f.source,'pc',{adjudication_ref:'a'});assert.equal(request.status,'awaiting_notice');assert.equal(request.difficulty,12);assert.equal(f.store.readDelivery('c',request.noticeRef),null);
});
test('native source, actor and adjudication bindings reject invalid preparation',t=>{for(const change of [f=>f.actor.controlRole='proxy',f=>f.adjudication.sourceRevision='other',f=>f.adjudication.actorId='other',f=>f.adjudication.modifier=2]){const f=fixture(t);change(f);assert.throws(()=>f.service.commitRequest(f.source,'pc',{adjudication_ref:'a'}));}});
