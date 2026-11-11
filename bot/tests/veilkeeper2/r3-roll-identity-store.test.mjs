import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,copyFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openRollAdjudications} from '../../src/v2/rules/roll-adjudications.js';
import {createDomainCardCatalog} from '../../src/v2/rules/domain-card-catalog.js';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vk2-roll-identity-')),legacyFile=join(dir,'legacy.sqlite'),legacy=new DatabaseSync(legacyFile);
  legacy.exec('CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,name TEXT,status TEXT,character_json TEXT);CREATE TABLE campaigns(guild_id TEXT);');
  const data={class:'Witch',subclass:'Hedge',level:1,domains:['Hex'],domain_cards:[{name:'Jinx',active:true}],traits:{Knowledge:2},resources:{hp:{current:0,max:6},armor:{current:0,max:3},stress:{current:0,max:6},hope:4,hope_max:6},gm_private:'private-native-canary'};
  legacy.prepare('INSERT INTO characters VALUES(?,?,?,?,?,?)').run('pc','c','owner','PC','active',JSON.stringify(data));
  const repository=openLegacyReadOnlyRepository(legacyFile),scenes=openSceneStore(),actions=openActionStore();
  const records=[{kind:'session',data:{id:'session',campaignId:'c',status:'active'}},{kind:'scene',data:{id:'scene',campaignId:'c',sessionId:'session',status:'active',participants:[{userId:'owner',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'c',sceneId:'scene',kind:'pc',status:'active',ownerUserId:'owner',controllerUserId:'owner',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:'c',sceneId:'scene',kind:'private',ownerUserId:'owner',permissionsVerified:true,recipientIds:['owner'],writerIds:['owner']}},{kind:'message',data:{id:'message',campaignId:'c',channelId:'private',userId:'owner',deleted:false,text:'I cast Jinx.'}}];
  scenes.commitSnapshot({campaignId:'c',principal:'setup',sourceRef:'setup',records:records.map(r=>({...r,expectedRevision:null}))},{check(){}});
  actions.initializeHope({campaignId:'c',actorId:'pc',ownerUserId:'owner',hope:4,cap:6},{check(){}});actions.initializePcDefenses({campaignId:'c',actorId:'pc',ownerUserId:'owner',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:0,max:3}},{check(){}});actions.initializePcLife({campaignId:'c',actorId:'pc',ownerUserId:'owner',controlRevision:'1',sourceRef:'profile',sourceRevision:'1',level:1,stress:{current:0,max:6}},{check(){}});
  const canonical=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:repository}),authority=createSourceAuthority(canonical.readers),source=authority.authenticate({campaignId:'c',messageId:'message',userId:'owner',actorId:'pc'}),catalog=createDomainCardCatalog(new URL('../../../content/CARDS/domain_cards.json',import.meta.url));
  const options={catalog,readActorSnapshot:canonical.readActorSnapshot},filename=join(dir,'adjudications.sqlite');let store=openRollAdjudications(filename,options);
  const decision={id:'a',revision:'1',campaignId:'c',sceneId:'scene',actorId:'pc',sourceRef:source.id,sourceRevision:source.revision,status:'accepted',difficulty:14,stakes:'The mark resists.',trait:'Knowledge',modifierRefs:[]},locator={feature:'domain:hex:jinx',slot:'base',source_hash:catalog.findDomainCard('domain:hex:jinx').source_hash};
  const check=()=>{if(!authority.revalidate(source))throw new Error('Native source revoked');};
  t.after(()=>{store.close();actions.close();scenes.close();repository.close();legacy.close();rmSync(dir,{recursive:true,force:true});});
  return {dir,filename,source,decision,locator,options,check,scenes,actions,canonical,repository,get store(){return store;},reopen(config=options){store.close();store=openRollAdjudications(filename,config);return store;},updateCharacter(edit){const d=JSON.parse(legacy.prepare('SELECT character_json FROM characters').get().character_json);edit(d);legacy.prepare('UPDATE characters SET character_json=?').run(JSON.stringify(d));},revoke(){const old=scenes.readers.readMessage('c','message');const {revision,...record}=old;scenes.commitSnapshot({campaignId:'c',principal:'transport',sourceRef:'edited-source',records:[{kind:'message',expectedRevision:Number(revision),data:{...record,text:'Edited attempt.'}}]},{check(){}});}};
}
test('verified Spellcast identity persists atomically with accepted adjudication and survives cold reopen',t=>{
  const f=fixture(t),before=f.actions.readHope('c','pc');f.store.save(f.source,f.decision,{check:f.check,spellcast:f.locator});const expected={adjudicationHash:hash(f.decision),...f.locator};assert.deepEqual(f.store.readRollIdentity('c','a'),expected);f.reopen();assert.deepEqual(f.store.read('c','a'),f.decision);assert.deepEqual(f.store.readRollIdentity('c','a'),expected);assert.equal(f.store.readRollIdentity('foreign','a'),null);assert.deepEqual(f.actions.readHope('c','pc'),before);assert.equal(JSON.stringify(expected).includes('private-native-canary'),false);
});
test('identity and decision are immutable together; ordinary saved rolls cannot be reclassified in place',t=>{
  const f=fixture(t);f.store.save(f.source,f.decision,{check:f.check,spellcast:f.locator});assert.deepEqual(f.store.save(f.source,f.decision,{check:f.check,spellcast:f.locator}),f.decision);assert.throws(()=>f.store.save(f.source,f.decision,{check:f.check}),/Immutable/);assert.throws(()=>f.store.save(f.source,{...f.decision,revision:'2'},{check:f.check,spellcast:f.locator}),/Immutable/);
  const ordinary={...f.decision,id:'ordinary'};f.store.save(f.source,ordinary,{check:f.check});assert.equal(f.store.readRollIdentity('c','ordinary'),null);assert.throws(()=>f.store.save(f.source,ordinary,{check:f.check,spellcast:f.locator}),/Immutable/);assert.equal(f.store.readRollIdentity('c','ordinary'),null);
});
test('wrong source/card/trait, prose classifications and inactive cards never persist roll identity',t=>{
  for(const patch of [{feature:'domain:hex:invented'},{source_hash:'stale'},{slot:'invented'},{approved:true}]){const f=fixture(t);assert.throws(()=>f.store.save(f.source,f.decision,{check:f.check,spellcast:{...f.locator,...patch}}));assert.equal(f.store.read('c','a'),null);}
  const trait=fixture(t);assert.throws(()=>trait.store.save(trait.source,{...trait.decision,trait:'Agility'},{check:trait.check,spellcast:trait.locator}),/subclass trait/);
  const inactive=fixture(t);inactive.updateCharacter(d=>{d.domain_cards[0].active=false;});assert.throws(()=>inactive.store.save(inactive.source,inactive.decision,{check:inactive.check,spellcast:inactive.locator}));assert.equal(inactive.store.read('c','a'),null);
});
test('current native control/card/subclass changes revoke identity while trait-value changes do not reclassify',t=>{
  const f=fixture(t);f.store.save(f.source,f.decision,{check:f.check,spellcast:f.locator});const binding=f.store.readRollIdentity('c','a');f.updateCharacter(d=>{d.traits.Knowledge=3;});assert.deepEqual(f.store.readRollIdentity('c','a'),binding);f.updateCharacter(d=>{d.subclass='Moon';});assert.throws(()=>f.store.readRollIdentity('c','a'));
  const card=fixture(t);card.store.save(card.source,card.decision,{check:card.check,spellcast:card.locator});card.updateCharacter(d=>{d.domain_cards=[];});assert.throws(()=>card.store.readRollIdentity('c','a'));
  const control=fixture(t);control.store.save(control.source,control.decision,{check:control.check,spellcast:control.locator});const {revision,controlRevision,...actor}=control.scenes.readers.readActor('c','pc');control.scenes.commitSnapshot({campaignId:'c',principal:'native-control',sourceRef:'new-owner',records:[{kind:'actor',expectedRevision:Number(revision),data:{...actor,ownerUserId:'new-owner',controllerUserId:'new-owner'}}]},{check(){}});assert.throws(()=>control.store.readRollIdentity('c','a'));
});
test('real source revocation or native actor change during transaction rolls back both decision and identity',t=>{
  const f=fixture(t);let calls=0;assert.throws(()=>f.store.save(f.source,f.decision,{spellcast:f.locator,check(){if(++calls===2)f.revoke();f.check();}}),/revoked/);assert.equal(f.store.read('c','a'),null);assert.equal(f.store.readRollIdentity('c','a'),null);
  const changed=fixture(t);let actorCalls=0;assert.throws(()=>changed.store.save(changed.source,changed.decision,{spellcast:changed.locator,check(){changed.check();if(++actorCalls===2)changed.updateCharacter(d=>{d.domain_cards[0].active=false;});}}));assert.equal(changed.store.read('c','a'),null);assert.equal(changed.store.readRollIdentity('c','a'),null);
});
test('v1 copy migration preserves ordinary adjudications and untouched source, with explicit rollback to original file',t=>{
  const f=fixture(t),oldFile=join(f.dir,'v1.sqlite'),copyFile=join(f.dir,'v2-copy.sqlite'),old=openRollAdjudications(oldFile);old.save(f.source,f.decision,{check:f.check});old.close();const before=fileHash(oldFile);copyFileSync(oldFile,copyFile);
  const migrated=openRollAdjudications(copyFile,f.options);try{assert.deepEqual(migrated.read('c','a'),f.decision);assert.equal(migrated.readRollIdentity('c','a'),null);const newDecision={...f.decision,id:'new'};migrated.save(f.source,newDecision,{check:f.check,spellcast:f.locator});assert.equal(migrated.readRollIdentity('c','new').feature,'domain:hex:jinx');}finally{migrated.close();}
  assert.equal(fileHash(oldFile),before);const rollback=openRollAdjudications(oldFile);try{assert.deepEqual(rollback.read('c','a'),f.decision);assert.equal(rollback.read('c','new'),null);}finally{rollback.close();}assert.equal(fileHash(oldFile),before);
});
test('reopening identities without configured native sources holds rather than trusting persisted metadata',t=>{
  const f=fixture(t);f.store.save(f.source,f.decision,{check:f.check,spellcast:f.locator});f.reopen({});assert.deepEqual(f.store.read('c','a'),f.decision);assert.throws(()=>f.store.readRollIdentity('c','a'),/identity sources/);assert.throws(()=>f.store.save(f.source,f.decision,{check:f.check}),/Immutable/);
});
