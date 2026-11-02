import test from 'node:test';
import assert from 'node:assert/strict';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';
function fixture(t){
  const store=openPrivateHookStore();t.after(()=>store.close());
  const proof={campaign:'c',principal:'gm',role:'human_gm',sourceRef:'import',revision:'1'},character={id:'pc',guild_id:'c',owner_user_id:'owner',name:'Mara',data:{}};
  const target={campaignId:'c',type:'npc',id:'clerk',label:'The Clerk',revision:'1',status:'active'},state={resolves:0,resolve:true,onResolve:()=>{}};
  const service=createCharacterPackageService({authenticate:()=>({...proof}),readCharacter:()=>character,readRevision:()=>'1',repository:store,hookStore:store,
    resolveRelationshipTarget:()=>{state.onResolve(++state.resolves);return state.resolve?{...target}:null;}});
  const payload={schema:'veiled-city-gm-hooks-v3.3.3',hooks:[{key:'clerk-hook',premise:'A former contact returns.',targets:[{type:'npc',key:'clerk',relationship_type:'trust',score:12}]}]};
  return {store,proof,target,state,payload,service,run:()=>service.importHooks({}, {characterId:'pc',payload})};
}
test('authorized target creates one directional GM-private connection with bounded score and no PC authority',t=>{
  const f=fixture(t),receipt=f.run(),rows=f.store.listRelationships('c',{includeGM:true,characterId:'pc'});
  assert.equal(receipt.relationshipsApplied,1);assert.deepEqual(receipt.relationshipHolds,[]);assert.equal(rows.length,1);
  assert.equal(rows[0].from_key,'pc');assert.equal(rows[0].to_key,'clerk');assert.equal(rows[0].score,5);
  assert.equal(rows[0].consent_authority,false);assert.equal(rows[0].pc_choice_authority,false);assert.equal(rows[0].publication_authority,false);
  assert.equal(rows[0].provenance.target_revision,'1');assert.deepEqual(f.store.listRelationships('c',{includeGM:false,characterId:'pc'}),[]);
  assert.deepEqual(f.store.listRelationships('other',{includeGM:true}),[]);assert.deepEqual(f.store.listRelationships('c',{includeGM:true,characterId:'unrelated'}),[]);
});
test('same command replay is inert; later authorized update preserves connection history',t=>{
  const f=fixture(t),first=f.run();assert.deepEqual(f.run(),first);
  const id=f.store.listRelationships('c',{includeGM:true})[0].id;assert.equal(f.store.relationshipHistory('c',id).length,1);
  f.proof.sourceRef='update';f.payload.hooks[0].targets[0].score=-2;f.run();
  assert.deepEqual(f.store.relationshipHistory('c',id).map(r=>r.score),[5,-2]);
  f.proof.sourceRef='import';f.payload.hooks[0].targets[0].score=12;assert.deepEqual(f.run(),first);
  assert.equal(f.store.listRelationships('c',{includeGM:true})[0].score,-2);
});
test('unresolved and canon-suggestion targets are preserved as holds without invented entities or relationships',t=>{
  const f=fixture(t);f.state.resolve=false;const first=f.run();assert.equal(first.relationshipsApplied,0);assert.equal(first.relationshipHolds[0].reason,'target_unresolved');
  f.state.resolve=true;assert.deepEqual(f.run(),first);assert.deepEqual(f.store.listRelationships('c',{includeGM:true}),[]);
  f.proof.sourceRef='canon-import';f.payload.hooks[0].type='canon_suggestion';const second=f.run();assert.equal(second.relationshipHolds[0].reason,'canon_review_required');
  assert.equal(second.prepared.content.hooks[0].targets[0].key,'clerk');
});
test('wrong campaign or changed target at transaction completion leaves no import or partial relationship',t=>{
  const f=fixture(t);f.target.campaignId='other';assert.throws(()=>f.run(),/Current campaign/);assert.equal(f.store.receipt('c','import'),null);
  f.target.campaignId='c';f.state.resolves=0;f.state.onResolve=n=>{if(n===3)f.target.revision='2';};
  assert.throws(()=>f.run(),/target changed/);assert.equal(f.store.receipt('c','import'),null);
  assert.deepEqual(f.store.listCharacterGmHooks('c','pc'),[]);assert.deepEqual(f.store.listRelationships('c',{includeGM:true}),[]);
});
test('invalid relationship targets abort atomically and duplicates use the final supplied connection without duplicate rows',t=>{
  const f=fixture(t);f.payload.hooks[0].targets.push({type:'invalid',key:'bad'});assert.throws(()=>f.run(),/Valid relationship/);
  assert.equal(f.store.receipt('c','import'),null);f.payload.hooks[0].targets[1]={type:'npc',key:'clerk',relationship_type:'trust',score:1};
  const receipt=f.run();assert.equal(receipt.relationshipsApplied,1);assert.equal(f.store.listRelationships('c',{includeGM:true})[0].score,1);
});
test('player cannot import a private relationship even when it names their own PC',t=>{
  const f=fixture(t);f.proof.principal='owner';f.proof.role='owner';assert.throws(()=>f.run(),/authority/);assert.equal(f.state.resolves,0);
  assert.deepEqual(f.store.listRelationships('c',{includeGM:true}),[]);
});
