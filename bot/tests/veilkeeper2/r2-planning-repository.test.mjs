import test from 'node:test';
import assert from 'node:assert/strict';
import {openPrivateHookStore} from '../../src/v2/private-hook-store.js';
import {createCharacterPackageService} from '../../src/v2/character-package-service.js';
import {createPrivatePlanningRepository} from '../../src/v2/private-planning-repository.js';
import {createPrivatePlanner} from '../../src/v2/private-planner.js';
import {createContextAuthority} from '../../src/v2/context-authority.js';
function fixture(t){
  const store=openPrivateHookStore();t.after(()=>store.close());
  const command={principal:'gm',campaign:'c',role:'human_gm',sourceRef:'import',revision:'1'};
  const service=createCharacterPackageService({authenticate:()=>({...command}),readCharacter:()=>({id:'pc',guild_id:'c',owner_user_id:'p',name:'Mara',data:{}}),readRevision:()=>'1',repository:store,hookStore:store,
    resolveRelationshipTarget:()=>({id:'clerk',label:'Clerk',type:'npc',campaignId:'c',status:'active',revision:'1'})});
  const payload={schema:'veiled-city-gm-hooks-v3.3.3',hooks:[{key:'seed',premise:'A secret guild contact returns.',targets:[{type:'npc',key:'clerk'}]}],canon_suggestions:[{key:'guild.origin',value:'SECRET origin',visibility:'party'}]};
  const run=()=>service.importHooks({}, {characterId:'pc',payload});run();
  const source={id:'m',revision:'1',principal:'p',campaign:'c',scene:'s',recipients:['p'],text:'Interesting.'};
  const records=createPrivatePlanningRepository(store),requests=[],refs=[store.listCharacterGmHooks('c','pc')[0].id];
  const planner=createPrivatePlanner({records,sourceAuthority:{revalidate:()=>true},authorize:()=>({sourceRef:'m',sourceRevision:'1',principal:'p',campaignId:'c',sceneId:'s',revision:'1',purpose:'secret_dependent',recordRefs:refs}),provider:{generate:async r=>{requests.push(r);return {text:'Private proposed development'};}}});
  return {store,command,service,payload,run,source,records,requests,refs,planner};
}
test('stored hooks feed private planning as optional seeds, without raw imported payload or pending canon',async t=>{
  const f=fixture(t);await f.planner.plan(f.source);const row=f.requests[0].context.records[0],body=JSON.parse(row.text);
  assert.equal(row.kind,'hook');assert.equal(body.authority,'optional_private_seed');assert.equal(body.execution_authority,false);
  assert.equal(Object.hasOwn(body,'targets'),false);assert.equal(JSON.stringify(f.requests).includes('SECRET origin'),false);
  const pending=f.store.proposals('c','pc')[0];assert.equal(f.records.metadata('c',pending.id),null);assert.equal(f.records.metadata('other',f.refs[0]),null);
});
test('human-reviewed canon and native connections retain kind but never become audience-entitled via this adapter',async t=>{
  const f=fixture(t),proposal=f.store.proposals('c','pc')[0];f.command.sourceRef='review';
  const review=f.service.reviewCanon({}, {characterId:'pc',proposalId:proposal.id,resolution:'accept',visibility:'party',expectedRevision:null});
  const relation=f.store.listRelationships('c',{includeGM:true})[0];f.refs.push(review.entry.id,relation.id);await f.planner.plan(f.source);
  assert.deepEqual(f.requests[0].context.records.map(r=>r.kind),['hook','canon','relationship']);
  const audience=createContextAuthority({sourceAuthority:{revalidate:()=>true},records:f.records,readActor:()=>null});
  assert.deepEqual(audience.inspect(audience.issue(f.source,f.refs)).records,[]);
  assert.equal(f.records.metadata('c',review.entry.id).visibility,'gm');assert.equal(f.records.metadata('c',relation.id).knownBy.length,0);
});
test('changed or resolved stored hook invalidates a previously generated private plan',async t=>{
  const f=fixture(t),handle=await f.planner.plan(f.source),id=f.refs[0];f.command.sourceRef='update';f.payload.hooks[0].premise='Changed private premise';f.run();
  assert.equal(f.records.readText('c',id,'1'),null);assert.throws(()=>f.planner.inspect(handle),/source_changed/);
  f.command.sourceRef='resolve';f.payload.hooks[0].status='resolved';f.run();assert.equal(f.records.metadata('c',id),null);
  await assert.rejects(f.planner.plan(f.source),/source_unavailable/);
});
test('superseded canon cannot be read as current private planning evidence',t=>{
  const f=fixture(t),p=f.store.proposals('c','pc')[0];f.command.sourceRef='review-1';
  const first=f.service.reviewCanon({}, {characterId:'pc',proposalId:p.id,resolution:'accept',visibility:'gm',expectedRevision:null});
  f.command.sourceRef='import-2';f.payload.canon_suggestions[0].value='Corrected origin';f.run();const next=f.store.proposals('c','pc').find(p=>p.proposed_value==='Corrected origin');
  f.command.sourceRef='review-2';const second=f.service.reviewCanon({}, {characterId:'pc',proposalId:next.id,resolution:'accept',visibility:'gm',expectedRevision:1,replaceExisting:true});
  assert.equal(f.records.metadata('c',first.entry.id),null);assert.equal(f.records.metadata('c',second.entry.id).kind,'canon');
});
