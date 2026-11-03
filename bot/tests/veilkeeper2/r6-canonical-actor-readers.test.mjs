import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {openSourceRegistry} from '../../src/v2/source-registry.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture(t,{bootstrap=true,cap=6}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk3-canonical-actor-')),check=()=>{};let scenes,actions,registry,sheets,projection,authority;
  function open(){scenes=openSceneStore(join(dir,'scenes.sqlite'));actions=openActionStore(join(dir,'actions.sqlite'));registry=openSourceRegistry(join(dir,'sources.sqlite'));sheets=new DatabaseSync(join(dir,'characters.sqlite'));sheets.exec('CREATE TABLE IF NOT EXISTS characters(id TEXT PRIMARY KEY,guild_id TEXT,owner_user_id TEXT,status TEXT,character_json TEXT)');projection=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:{getCharacter(id){const row=sheets.prepare('SELECT * FROM characters WHERE id=?').get(id);return row?{...row,data:JSON.parse(row.character_json)}:null;}}});authority=createSourceAuthority({...projection.readers,sourceRegistry:registry});}
  function close(){sheets.close();registry.close();actions.close();scenes.close();}
  open();t.after(()=>{close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));rmSync(dir,{recursive:true,force:true});});
  const data={level:2,death_state:null,resources:{hp:{current:0,max:6},armor:{current:3,max:3},stress:{current:0,max:6},hope:6,hope_max:6,gold:7},features:['Native feature'],inventory:[{name:'Keepsake'}],location:'Old office',gm_private:'Hidden patron hook'};
  sheets.prepare('INSERT INTO characters VALUES(?,?,?,?,?)').run('pc','c','u','active',JSON.stringify(data));
  const records=[{kind:'session',data:{id:'session',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'s',campaignId:'c',sessionId:'session',status:'active',participants:[{actorId:'pc',userId:'u',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'s',kind:'pc',status:'active',ownerUserId:'u',controllerUserId:'u',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:'c',sceneId:'s',kind:'private',ownerUserId:'u',permissionsVerified:true,recipientIds:['u'],writerIds:['u']}}];for(const id of ['attempt','armor','review','choice'])records.push({kind:'message',data:{id,campaignId:'c',userId:'u',channelId:'private',deleted:false,text:`Native owner ${id} source`}});
  scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check});
  if(bootstrap){actions.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',hp:{current:5,max:6},armorSlots:{current:0,max:3}},{check});actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'u',hope:Math.min(3,cap),cap},{check});actions.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'u',controlRevision:'1',sourceRef:'reviewed-profile',sourceRevision:'1',level:2,stress:{current:3,max:6}},{check});}
  const event=id=>({campaignId:'c',messageId:id,userId:'u',actorId:'pc'});
  function editSheet(change){const row=sheets.prepare('SELECT * FROM characters WHERE id=?').get('pc'),value={...row,data:JSON.parse(row.character_json)};change(value);sheets.prepare('UPDATE characters SET guild_id=?,owner_user_id=?,status=?,character_json=? WHERE id=?').run(value.guild_id,value.owner_user_id,value.status,JSON.stringify(value.data),'pc');}
  function death(move='risk_it_all'){
    const sources=Object.fromEntries(['attempt','armor','review','choice'].map(id=>[id,authority.authenticate(event(id))])),attack={id:'attack',campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'saved-hit',resultHash:'native-hit',termsHash:'native-terms',sourceRef:sources.attempt.id,sourceRevision:sources.attempt.revision,damage:10,major:8,severe:16,defenses:{resistance:'none',armorReduction:1,armorAllowed:true}},armor={id:'armor',kind:'incoming_armor_choice',campaignId:'c',sceneId:'s',attackRef:'attack',actorId:'pc',ownerUserId:'u',controlRevision:'1',resultRef:'saved-hit',resultHash:'native-hit',termsHash:'native-terms',sourceRef:sources.armor.id,sourceRevision:sources.armor.revision,useArmor:false};
    actions.commitIncomingDamage({campaignId:'c',attackRef:'attack',expectedRevision:1},{check,readAttack:()=>attack,readArmorChoice:()=>armor});const eligible=actions.readIncomingDeath('c','attack'),base={campaignId:'c',sceneId:'s',actorId:'pc',ownerUserId:'u',controlRevision:'1',requestRef:eligible.id,eligibilityHash:hash(eligible),resourceRevision:2,actorSnapshotHash:hash(projection.readActorSnapshot('c','pc'))},review={...base,id:'review',kind:'incoming_death_review',sequence:1,sourceRef:sources.review.id,sourceRevision:sources.review.revision},choice={...base,id:'choice',kind:'incoming_death_choice',sequence:2,reviewRef:'review',move,sourceRef:sources.choice.id,sourceRevision:sources.choice.revision};actions.recordIncomingDeathReview('c','attack',{check,sourceAuthority:authority,readEvidence:()=>review});actions.recordIncomingDeathChoice('c','attack',{check,sourceAuthority:authority,readEvidence:()=>choice});return sources;
  }
  return {data,event,death,editSheet,get scenes(){return scenes;},get actions(){return actions;},get projection(){return projection;},get authority(){return authority;},get options(){return {check,sourceAuthority:authority,readActorSnapshot:projection.readActorSnapshot};},reopen(){close();open();}};
}
test('canonical projection overlays current resources while preserving native sheet fields without exposing them in source metadata',t=>{
  const f=fixture(t),snapshot=f.projection.readActorSnapshot('c','pc');assert.deepEqual(snapshot.data.resources.hp,{current:5,max:6});assert.deepEqual(snapshot.data.resources.armor,{current:0,max:3});assert.deepEqual(snapshot.data.resources.stress,{current:3,max:6});assert.equal(snapshot.data.resources.hope,3);assert.equal(snapshot.data.resources.gold,7);assert.equal(snapshot.data.gm_private,'Hidden patron hook');assert.equal(snapshot.data.location,'Old office');assert.deepEqual(snapshot.data.inventory,[{name:'Keepsake'}]);const metadata=f.projection.readActor('c','pc');assert.equal(metadata.data,undefined);assert.equal(JSON.stringify(metadata).includes('Hidden patron'),false);snapshot.data.inventory[0].name='Edited returned value';assert.equal(f.projection.readActorSnapshot('c','pc').data.inventory[0].name,'Keepsake');
});
test('canonical death overrides stale active character data and preserves receipt replay without live source grants',t=>{
  const f=fixture(t),sources=f.death(),faces=[1,12],outcome=f.actions.resolveIncomingDeath('c','attack',{...f.options,rng:()=>faces.shift()});assert.equal(outcome.result,'dead');f.reopen();assert.equal(f.projection.readActor('c','pc').status,'dead');assert.equal(f.projection.readActorSnapshot('c','pc').status,'dead');assert.equal(f.authority.revalidate(sources.choice),false);assert.throws(()=>f.authority.authenticate(f.event('choice')));assert.deepEqual(f.actions.resolveIncomingDeath('c','attack',{...f.options,rng(){throw new Error('No reroll');}}),outcome);
});
test('canonical Avoid Death keeps unconscious status and permanent Hope scar despite a stale healthy sheet',t=>{
  const f=fixture(t);f.death('avoid_death');const outcome=f.actions.resolveIncomingDeath('c','attack',{...f.options,rng:()=>2});f.reopen();const snapshot=f.projection.readActorSnapshot('c','pc');assert.equal(outcome.result,'unconscious');assert.equal(snapshot.data.death_state.status,'unconscious');assert.equal(snapshot.data.resources.hope_max,5);assert.equal(snapshot.data.resources.hp.current,6);assert.equal(snapshot.data.resources.stress.current,3);
});
test('missing native lifecycle and incomplete historical death migration cannot create healthy defaults',t=>{
  const missing=fixture(t,{bootstrap:false});assert.throws(()=>missing.projection.readActorSnapshot('c','pc'),/no healthy defaults/);assert.throws(()=>missing.authority.authenticate(missing.event('attempt')));
  for(const change of [c=>c.status='dead',c=>c.data.death_state={request:'old-native-death',status:'unconscious'},c=>c.data.level=3]){const f=fixture(t);f.editSheet(change);assert.throws(()=>f.projection.readActorSnapshot('c','pc'),/migration or identity review/);}
  const zero=fixture(t,{cap:0});assert.throws(()=>zero.projection.readActorSnapshot('c','pc'),/no healthy defaults/);
});
test('owner and campaign changes in the native repository revoke projected source authority',t=>{
  for(const change of [c=>c.owner_user_id='other',c=>c.guild_id='other']){const f=fixture(t),source=f.authority.authenticate(f.event('attempt'));f.editSheet(change);assert.equal(f.authority.revalidate(source),false);assert.throws(()=>f.projection.readActorSnapshot('c','pc'));}
});
test('closed native registration stays closed and cannot be revived by an active gameplay profile',t=>{
  const f=fixture(t),{revision,controlRevision,...actor}=f.scenes.readers.readActor('c','pc');f.scenes.commitSnapshot({campaignId:'c',principal:'admin',sourceRef:'close-control',records:[{kind:'actor',data:{...actor,status:'closed'},expectedRevision:Number(revision)}]},{check:()=>{}});assert.equal(f.projection.readActor('c','pc').status,'closed');assert.throws(()=>f.projection.readActorSnapshot('c','pc'));assert.equal(f.actions.readPcLife('c','pc').life.status,'active');
});
test('metadata projection cannot mix an earlier owner record with a later canonical owner snapshot',t=>{
  const f=fixture(t),control=f.scenes.readers.readActor('c','pc');let calls=0;const readers={...f.scenes.readers,readActor(c,id){return ++calls===1?{...control,ownerUserId:'other',controllerUserId:'other'}:f.scenes.readers.readActor(c,id);}},projection=createCanonicalActorReaders({sceneStore:{readers},actionStore:f.actions,characterRepository:{getCharacter:()=>({id:'pc',guild_id:'c',owner_user_id:'u',status:'active',data:f.data})}});assert.throws(()=>projection.readActor('c','pc'),/control changed during projection/);
});
