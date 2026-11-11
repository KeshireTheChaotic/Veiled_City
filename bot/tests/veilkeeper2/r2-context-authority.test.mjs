import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createContextAuthority} from '../../src/v2/context-authority.js';

function fixture(){
  const source={id:'s',campaign:'c',scene:'scene',actors:['pc'],recipients:['u','v'],text:'Interesting.',traceId:'trace',revision:'1'};
  const rows=new Map(),bodies=new Map(),reads=[];
  let active=true;
  const actor={id:'npc',campaignId:'c',sceneId:'scene',kind:'npc',status:'active',controllerUserId:null,controlRevision:'1'};
  const authority=createContextAuthority({sourceAuthority:{revalidate:()=>active},readActor:()=>actor,records:{metadata:(_c,ref)=>rows.get(ref),readText:(_c,ref,revision)=>{reads.push(ref);return {revision,text:bodies.get(ref)};}}});
  function add(ref,patch={}){rows.set(ref,{id:ref,revision:'1',contentHash:createHash('sha256').update(`body:${ref}`).digest('hex'),campaignId:'c',status:'active',kind:'testimony',scope:'scene',sceneId:'scene',sourceRefs:[],recipientIds:['u','v'],knownBy:['npc'],visibility:'recipients',disclosure:'acknowledged',...patch});bodies.set(ref,`body:${ref}`);}
  return {source,rows,bodies,reads,authority,actor,add,revoke:()=>{active=false;}};
}
test('GM, cross-PC, other campaign/scene and pending disclosures never have their body read',()=>{
  const f=fixture();f.add('ok');f.add('gm',{visibility:'gm'});f.add('private',{recipientIds:['u']});f.add('cross',{campaignId:'other'});f.add('scene',{sceneId:'other'});f.add('pending',{disclosure:'pending'});
  const grant=f.authority.issue(f.source,[...f.rows.keys()]);
  assert.deepEqual(f.reads,['ok']);assert.deepEqual(f.authority.inspect(grant).records.map(r=>r.ref),['ok']);
  assert.equal(f.authority.inspect(grant).utterance,'Interesting.');
});
test('an apparently shared paraphrase with a private source ancestor is excluded before inference',()=>{
  const f=fixture();f.add('secret',{visibility:'gm'});f.add('paraphrase',{sourceRefs:['secret'],visibility:'public',disclosure:'public'});
  const packet=f.authority.inspect(f.authority.issue(f.source,['paraphrase']));assert.equal(packet.records.length,0);assert.deepEqual(f.reads,[]);
});
test('source closure accepts shared ancestry but rejects cycles and missing ancestors',()=>{
  const f=fixture();f.add('base');f.add('a',{sourceRefs:['base']});f.add('b',{sourceRefs:['base']});f.add('diamond',{sourceRefs:['a','b']});f.add('cycle',{sourceRefs:['cycle']});f.add('missing',{sourceRefs:['absent']});
  const packet=f.authority.inspect(f.authority.issue(f.source,['diamond','cycle','missing']));assert.deepEqual(packet.records.map(r=>r.ref),['diamond']);assert.deepEqual(f.reads,['diamond']);
});
test('NPC knowledge intersects audience entitlement, and human proxy portrayal is refused',()=>{
  const f=fixture();f.add('known');f.add('unknown',{knownBy:[]});
  const grant=f.authority.issue(f.source,['known','unknown'],{actorId:'npc'});assert.deepEqual(f.authority.inspect(grant).records.map(r=>r.ref),['known']);
  f.actor.controllerUserId='human';assert.throws(()=>f.authority.inspect(grant),/authority/);assert.throws(()=>f.authority.issue(f.source,['known'],{actorId:'npc'}));
});
test('revoked source, changed ancestors and changed actor control invalidate issued packets',()=>{
  const f=fixture();f.add('base');f.add('child',{sourceRefs:['base']});const grant=f.authority.issue(f.source,['child']);
  f.rows.get('base').status='retracted';assert.throws(()=>f.authority.inspect(grant));
  const g=fixture();const empty=g.authority.issue(g.source,[]);g.revoke();assert.throws(()=>g.authority.inspect(empty));
});
test('testimony stays testimony and forged or edited capabilities cannot supply model context',()=>{
  const f=fixture();f.add('rumor');const grant=f.authority.issue(f.source,['rumor']);
  const packet=f.authority.inspect(grant);assert.equal(packet.records[0].kind,'testimony');assert.ok(Object.isFrozen(packet.records[0]));
  assert.throws(()=>f.authority.inspect({packet}));assert.throws(()=>{packet.records[0].kind='canon';});
  assert.deepEqual(f.authority.audience(grant).recipients,['u','v']);
});
test('stale or substituted body under a current revision cannot enter a prompt packet',()=>{
  const f=fixture();f.add('record');f.bodies.set('record','An unrelated private cache entry');
  assert.throws(()=>f.authority.issue(f.source,['record']),/authority/);
});

test('audience packets explicitly separate human-controlled roles from native NPC portrayal without full actor data',()=>{
  const f=fixture(),gm=f.authority.inspect(f.authority.issue(f.source,[]));assert.deepEqual(gm.human_controlled_actor_refs,['pc']);assert.deepEqual(gm.portrayal,{kind:'gm',actor_ref:null});
  const npc=f.authority.inspect(f.authority.issue(f.source,[],{actorId:'npc'}));assert.deepEqual(npc.human_controlled_actor_refs,['pc']);assert.deepEqual(npc.portrayal,{kind:'independent_npc',actor_ref:'npc'});assert.equal(Object.hasOwn(npc,'ownerUserId'),false);assert.equal(Object.hasOwn(npc,'character'),false);assert.deepEqual(f.reads,[]);
  assert.throws(()=>{npc.human_controlled_actor_refs.push('other');});assert.throws(()=>{npc.portrayal.kind='player';});
  f.actor.controllerUserId='human-proxy';assert.throws(()=>f.authority.issue(f.source,[],{actorId:'npc'}));
});

test('human-controlled NPC source refs remain protected rather than becoming an independent portrayal grant',()=>{
  const f=fixture();f.source.actors=['human-proxy'];const packet=f.authority.inspect(f.authority.issue(f.source,[]));assert.deepEqual(packet.human_controlled_actor_refs,['human-proxy']);assert.equal(packet.portrayal.kind,'gm');
  f.source.actors=['pc','pc'];assert.throws(()=>f.authority.issue(f.source,[]),/authority/);
});

test('durable dependency manifests contain complete ancestry hashes and revalidate without body reads',()=>{
  const f=fixture();f.add('base');f.add('child',{sourceRefs:['base']});const grant=f.authority.issue(f.source,['child']),manifest=JSON.parse(JSON.stringify(f.authority.dependencyManifest(grant))),reads=f.reads.length;
  assert.deepEqual(manifest.records.map(r=>r.ref).sort(),['base','child']);assert.equal(JSON.stringify(manifest).includes('body:'),false);assert.equal(f.authority.verifyDependencies(f.source,manifest),true);assert.equal(f.reads.length,reads);
  assert.throws(()=>f.authority.verifyDependencies(f.source,{...manifest,records:manifest.records.filter(r=>r.ref!=='base')}));
  f.rows.get('base').visibility='gm';assert.throws(()=>f.authority.verifyDependencies(f.source,manifest));assert.equal(f.reads.length,reads);
});

test('persisted context lineage cannot change source/recipients or portray a newly human-controlled NPC',()=>{
  const f=fixture();f.add('known');const manifest=f.authority.dependencyManifest(f.authority.issue(f.source,['known'],{actorId:'npc'}));
  for(const patch of [{sourceRevision:'other'},{campaignId:'other'},{recipientIds:['u']},{records:[...manifest.records,...manifest.records]}])assert.throws(()=>f.authority.verifyDependencies(f.source,{...manifest,...patch}));
  f.actor.controllerUserId='human';assert.throws(()=>f.authority.verifyDependencies(f.source,manifest));
});

test('forged cyclic lineage is rejected even when its metadata hashes and ACLs are current',()=>{
  const f=fixture();f.add('cycle',{sourceRefs:['cycle']});const empty=f.authority.dependencyManifest(f.authority.issue(f.source,[])),record=f.rows.get('cycle');
  assert.throws(()=>f.authority.verifyDependencies(f.source,{...empty,records:[{ref:'cycle',metadataHash:createHash('sha256').update(JSON.stringify(record)).digest('hex')}]}));assert.deepEqual(f.reads,[]);
});
