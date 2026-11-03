import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createPcBootstrapSource} from '../../src/v2/pc-bootstrap-source.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk3-reviewed-bootstrap-')),scenes=openSceneStore(join(dir,'scenes.sqlite'));let actions=openActionStore(join(dir,'actions.sqlite'));
  const character={id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:{level:2,resources:{hp:{current:4,max:6},armor:{current:2,max:3},stress:{current:3,max:6},hope:2,hope_max:5},features:[],gm_private:'Hidden import hook'}},repository={getCharacter:()=>structuredClone(character)},check=()=>{};
  scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'registered-owner',records:[{kind:'actor',expectedRevision:null,data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}}]},{check});
  const readSource=createPcBootstrapSource({sceneStore:scenes,characterRepository:repository}),source=readSource('c','pc'),review={id:'native-gm-review',kind:'human_gm_pc_bootstrap_review',status:'approved',role:'human_gm',principal:'gm',campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',snapshotHash:hash(source),sourceRef:'authenticated-gm-review',sourceRevision:'1'};
  t.after(()=>{actions.close();scenes.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  return {character,review,source,readSource,options:{check,readSource,inspectReview:()=>review},get actions(){return actions;},projection:()=>createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:repository}),reopen(){actions.close();actions=openActionStore(join(dir,'actions.sqlite'));}};
}
test('reviewed native bootstrap initializes exact spent pools and provenance atomically without exposing private sheet data',t=>{
  const f=fixture(t),receipt=f.actions.initializePcFromReviewedSource('c','pc',f.options),state=f.actions.readPcLife('c','pc');assert.equal(receipt.status,'initialized');assert.equal(state.defenses.hp.current,4);assert.equal(state.defenses.armorSlots.current,2);assert.equal(state.hope.hope,2);assert.equal(state.hope.cap,5);assert.equal(state.life.stress.current,3);assert.equal(state.life.sourceRevision,f.source.sourceRevision);assert.equal(f.projection().readActorSnapshot('c','pc').data.gm_private,'Hidden import hook');assert.equal(JSON.stringify(receipt).includes('Hidden import hook'),false);assert.equal(f.character.data.resources.hp.current,4);
});
test('bootstrap receipt replays after native damage and reopen without resetting current resources',t=>{
  const f=fixture(t),receipt=f.actions.initializePcFromReviewedSource('c','pc',f.options),attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'hit',termsHash:'terms',sourceRef:'attempt',sourceRevision:'1',damage:2,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}},armor={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'roll',resultHash:'hit',termsHash:'terms',sourceRef:'armor-source',sourceRevision:'1',useArmor:false};f.actions.commitIncomingDamage({campaignId:'c',attackRef:'attack',expectedRevision:1},{check:()=>{},readAttack:()=>attack,readArmorChoice:()=>armor});f.reopen();assert.deepEqual(f.actions.initializePcFromReviewedSource('c','pc',f.options),receipt);assert.equal(f.actions.readPcLife('c','pc').defenses.hp.current,5);
});
test('final native authorization rollback leaves no partial pools or lifecycle and permits a later valid bootstrap',t=>{
  const f=fixture(t);let checks=0;assert.throws(()=>f.actions.initializePcFromReviewedSource('c','pc',{...f.options,check(){if(++checks===2)throw new Error('Review authority revoked');}}),/revoked/);f.reopen();assert.equal(f.actions.readPcDefenses('c','pc'),null);assert.equal(f.actions.readHope('c','pc'),null);assert.equal(f.actions.readPcLife('c','pc'),null);f.actions.initializePcFromReviewedSource('c','pc',f.options);assert.equal(f.actions.readPcLife('c','pc').life.level,2);
});
test('existing partial initialization cannot be overwritten or silently completed',t=>{
  const f=fixture(t);f.actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:1,cap:6},{check:()=>{}});assert.throws(()=>f.actions.initializePcFromReviewedSource('c','pc',f.options),/partial native/);assert.equal(f.actions.readHope('c','pc').hope,1);assert.equal(f.actions.readPcDefenses('c','pc'),null);assert.equal(f.actions.readPcLife('c','pc'),null);
});
test('historical death, final HP, zero slots and missing permanent cap remain migration holds without writes',t=>{
  for(const change of [c=>c.data.death_state={request:'old-death',status:'unconscious'},c=>c.data.resources.hp.current=6,c=>{c.data.resources.hope=0;c.data.resources.hope_max=0;},c=>delete c.data.resources.hope_max]){const f=fixture(t);change(f.character);assert.throws(()=>f.actions.initializePcFromReviewedSource('c','pc',f.options));assert.equal(f.actions.readHope('c','pc'),null);assert.equal(f.actions.readPcDefenses('c','pc'),null);}
});
test('owner/campaign mismatches, non-GM review, stale source hashes and changed approvals cannot authorize bootstrap',t=>{
  for(const change of [f=>f.character.owner_user_id='other',f=>f.character.guild_id='other',f=>f.review.role='owner',f=>f.review.snapshotHash='wrong',f=>f.review.status='revoked']){const f=fixture(t);change(f);assert.throws(()=>f.actions.initializePcFromReviewedSource('c','pc',f.options));assert.equal(f.actions.readPcLife('c','pc'),null);}
});
test('source changing at the final transaction boundary rolls back all initialized state',t=>{
  const f=fixture(t);let checks=0;assert.throws(()=>f.actions.initializePcFromReviewedSource('c','pc',{...f.options,check(){if(++checks===2)f.character.data.resources.hope=1;}}),/snapshot or review changed/);f.reopen();assert.equal(f.actions.readPcDefenses('c','pc'),null);assert.equal(f.actions.readHope('c','pc'),null);assert.equal(f.actions.readPcLife('c','pc'),null);
});
