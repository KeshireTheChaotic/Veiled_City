import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';

function fixture(){
  const proof={principal:'owner',campaign:'c',sourceRef:'command',revision:'1',role:'owner'};
  const character={id:'pc',guild_id:'c',owner_user_id:'owner',name:'Mara Vale',status:'active',is_guest:false,data:{level:2,class:'Rogue',background:'Grew up near the docks.',traits:{agility:2},gm_hooks:['SECRET hook'],notes:[{text:'Known note'},{text:'SECRET nested',visibility:'gm'}],nested:{gm_secrets:['SECRET'],known:'Visible'},canon_suggestions:['SECRET proposal']}};
  const state={revision:'1',reads:[],onRead:()=>{}};
  const fact={category:'clue',fact_key:'clue',content:'Known rumor',visibility:'character',session_id:'session',source:'observed',created_at:'date'};
  const relationship={id:'edge',from_type:'character',from_key:'pc',from_label:'Mara',to_type:'npc',to_key:'clerk',to_label:'Clerk',relationship_type:'acquaintance',score:1,visibility:'character',note:'Met yesterday',source:'encounter',updated_at:'date'};
  function read(name,value){state.reads.push(name);state.onRead(name);return value;}
  const repository={
    playerFactsFor:(campaign,user,options)=>{assert.equal(campaign,'c');assert.equal(user,'owner');assert.equal(options.characterId,'pc');return read('playerFacts',[fact]);},
    listRelationships:(_c,options)=>read(options.includeGM?'gmRelationships':'playerRelationships',[relationship,...(options.includeGM?[{...relationship,id:'secret-edge',note:'SECRET relation',visibility:'gm'}]:[])]),
    listCharacterGmHooks:()=>read('hooks',[{hook_key:'hook',title:'Secret',hook_type:'entry_seed',premise:'SECRET imported',permission:'open_question',suggested_entry:'Later',status:'active',payload:{source:'import'},source:'package',updated_at:'date'}]),
    characterPrivateFacts:()=>read('privateFacts',[{...fact,content:'SECRET fact',visibility:'gm'}]),
    characterPrivateClocks:()=>read('privateClocks',[{clock_key:'clock',label:'SECRET clock',value:1,max_value:6,visibility:'gm',updated_at:'date'}]),
    characterPrivateThreads:()=>read('privateThreads',[{id:'thread',label:'SECRET thread',status:'active',visibility:'gm',notes:'Secret',updated_at:'date'}]),
    characterPrivateReferences:()=>read('privateReferences',[{kind:'npc',entity_key:'hidden',display_name:'SECRET name',summary:'Hidden',visibility:'gm',updated_at:'date'}]),
    listCanon:()=>read('canon',[{canon_key:'mara_origin',value:'SECRET canon',visibility:'gm',status:'current',source_id:'pc',source_type:'human',provenance:{review:'review'},created_at:'date'}]),
    listCanonConflicts:()=>read('conflicts',[{id:'conflict',canon_key:'mara_origin',existing_value:'Old',proposed_value:'SECRET new',proposed_visibility:'gm',status:'pending',created_at:'date'}]),
    listCanonProposals:()=>read('proposals',[{id:'proposal',canon_key:'mara_origin',proposed_value:'SECRET suggestion',proposed_visibility:'gm',reason:'Imported',status:'pending',created_at:'date'}])
  };
  const service=createCharacterPackageService({authenticate:()=>({...proof}),readCharacter:()=>character,readRevision:()=>state.revision,repository});
  return {service,proof,character,state};
}
test('player package preserves sheet and entitled semantic fields without reading GM repositories',()=>{
  const f=fixture(),p=f.service.exportPackage({}, {characterId:'pc',scope:'player'});
  assert.equal(p.export_meta.schema,'veiled-city-character-export-v3.3.3');assert.equal(p.export_meta.visibility,'player_safe');
  assert.equal(p.background,'Grew up near the docks.');assert.deepEqual(p.traits,{agility:2});assert.deepEqual(p.notes,[{text:'Known note'}]);
  assert.deepEqual(p.nested,{known:'Visible'});assert.equal(JSON.stringify(p).includes('SECRET'),false);
  assert.deepEqual(p.campaign_knowledge,[{category:'clue',key:'clue',content:'Known rumor',visibility:'character',session_id:'session',source:'observed',created_at:'date'}]);
  assert.equal(p.relationships[0].to_key,'clerk');assert.deepEqual(f.state.reads,['playerFacts','playerRelationships']);
});
test('GM hook/private/canon packages retain their distinct versioned fields and review state',()=>{
  const f=fixture();f.proof.role='human_gm';
  const hooks=f.service.exportPackage({}, {characterId:'pc',scope:'hooks'});assert.equal(hooks.export_meta.schema,'veiled-city-gm-hooks-v3.3.3');assert.equal(hooks.imported_gm_hooks[0].premise,'SECRET imported');
  const priv=f.service.exportPackage({}, {characterId:'pc',scope:'private'});assert.equal(priv.export_meta.schema,'veiled-city-gm-private-v3.3.3');assert.equal(priv.private_facts[0].content,'SECRET fact');assert.equal(priv.private_clocks[0].max_value,6);assert.equal(priv.private_threads[0].status,'active');assert.equal(priv.private_references[0].key,'hidden');assert.equal(priv.relationships.length,2);
  const canon=f.service.exportPackage({}, {characterId:'pc',scope:'canon'});assert.equal(canon.export_meta.schema,'veiled-city-gm-canon-v3.3.3');assert.equal(canon.canon[0].provenance.review,'review');assert.equal(canon.pending_conflicts[0].status,'pending');assert.equal(canon.canon_proposals[0].status,'pending');
  assert.ok([hooks,priv,canon].every(p=>p.export_meta.visibility==='gm_private'));
});
test('cross-owner/campaign and player requests for GM artifacts fail before private reads',()=>{
  const f=fixture();for(const scope of ['hooks','private','canon'])assert.throws(()=>f.service.exportPackage({}, {characterId:'pc',scope}),/authority/);
  f.proof.principal='other';assert.throws(()=>f.service.exportPackage({}, {characterId:'pc',scope:'player'}),/authority/);
  f.proof.role='human_gm';f.proof.campaign='other';assert.throws(()=>f.service.exportPackage({}, {characterId:'pc',scope:'private'}),/authority/);assert.deepEqual(f.state.reads,[]);
});
test('owner or repository revision changes during assembly prevent release',()=>{
  const f=fixture();f.state.onRead=()=>{f.character.owner_user_id='other';};assert.throws(()=>f.service.exportPackage({}, {characterId:'pc',scope:'player'}),/authority/);
  const g=fixture();g.state.onRead=()=>{g.state.revision='2';};assert.throws(()=>g.service.exportPackage({}, {characterId:'pc',scope:'player'}),/authority/);
});
test('all legacy GM-hook import schema versions normalize as private proposals without truth authority',()=>{
  const f=fixture();f.proof.role='human_gm';
  for(const schema of ['veiled-city-gm-hooks-import-v3.3.1','veiled-city-gm-hooks-import-v3.3.2','veiled-city-gm-hooks-import-v3.3.3','veiled-city-gm-hooks-v3.3.3']){
    const result=f.service.prepareImport({}, {characterId:'pc',scope:'hooks',payload:{schema,gm_hooks:['An old friend returns.'],canon_suggestions:[{key:'origin',value:'Unverified'}]}});
    assert.equal(result.visibility,'gm');assert.equal(result.status,'awaiting_native_validation');assert.equal(result.content.hooks[0].permission,'open_question');assert.equal(result.content.canon_suggestions.length,1);
    assert.equal(result.canonAuthority,false);assert.equal(result.executionAuthority,false);assert.equal(result.publicationAuthority,false);
  }
});
test('exported JSON artifacts round-trip through separate preparers and cannot cross into player imports',()=>{
  const f=fixture();f.proof.role='human_gm';
  for(const scope of ['player','hooks','private','canon']){
    const payload=f.service.exportPackage({}, {characterId:'pc',scope});
    const prepared=f.service.prepareImport({}, {characterId:'pc',scope,payload});
    assert.equal(prepared.scope,scope);assert.equal(prepared.characterId,'pc');assert.equal(prepared.status,'awaiting_native_validation');
    if(scope!=='player')assert.throws(()=>f.service.prepareImport({}, {characterId:'pc',scope:'player',payload}),/schema/);
  }
});
test('metadata cannot authorize private imports; player import strips nested GM infrastructure',()=>{
  const f=fixture(),payload={export_meta:{schema:'veiled-city-character-export-v3.3.3',visibility:'player_safe'},name:'Mara',background:'Known',nested:{gm_hooks:['SECRET']}};
  assert.throws(()=>f.service.prepareImport({}, {characterId:'pc',scope:'hooks',payload:{schema:'veiled-city-gm-hooks-v3.3.3',role:'human_gm',gm_hooks:['secret']}}),/authority/);
  const a=f.service.prepareImport({}, {characterId:'pc',scope:'player',payload});assert.equal(JSON.stringify(a).includes('SECRET'),false);
  assert.deepEqual(f.service.prepareImport({}, {characterId:'pc',scope:'player',payload}),a);
  assert.throws(()=>f.service.prepareImport({}, {characterId:'pc',scope:'player',payload:{...payload,export_meta:{schema:'future',visibility:'player_safe'}}}),/schema/);
});
