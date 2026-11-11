import test from 'node:test';
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {conditionFixture,attachOwnerClear} from './helpers/condition-history-fixture.mjs';
import {openSceneStore} from '../../src/v2/scene-store.js';
import {openActionStore} from '../../src/v2/rules/action-store.js';
import {createCanonicalActorReaders} from '../../src/v2/canonical-actor-readers.js';
import {createSourceAuthority} from '../../src/v2/source-authority.js';
import {createDomainCardCatalog} from '../../src/v2/rules/domain-card-catalog.js';
import {openRollAdjudications} from '../../src/v2/rules/roll-adjudications.js';
import {createLegacySpellcastConditionModifiers} from '../../src/v2/rules/spellcast-condition-modifiers.js';
import {createRollTermsReader} from '../../src/v2/rules/roll-terms.js';
import {createOrdinaryRollPreparation} from '../../src/v2/rules/ordinary-roll-preparation.js';
import {openRollStore} from '../../src/v2/rules/roll-store.js';
function fixture(t){
  let adjudications,actions,scenes,rolls;t.after(()=>{rolls?.close();adjudications?.close();actions?.close();scenes?.close();});
  const f=conditionFixture(t,{area:true,stress:0,conditionName:'Restrained'});
  f.db.exec('ALTER TABLE characters ADD COLUMN name TEXT;ALTER TABLE characters ADD COLUMN status TEXT;');
  const data={class:'Witch',subclass:'Hedge',level:1,domains:['Hex'],domain_cards:[{name:'Jinx',active:true}],traits:{Knowledge:2},resources:{hp:{current:0,max:6},armor:{current:0,max:3},stress:{current:0,max:6},hope:4,hope_max:6},conditions:f.readCondition().data.after,gm_private:'native-only-condition-canary'};
  f.db.prepare('INSERT INTO characters(id,guild_id,owner_user_id,character_json,name,status) VALUES(?,?,?,?,?,?)').run('pc','g','historical-owner',JSON.stringify(data),'PC','active');
  scenes=openSceneStore();actions=openActionStore();rolls=openRollStore();
  const records=[{kind:'session',data:{id:'now-session',campaignId:'g',status:'active'}},{kind:'scene',data:{id:'now',campaignId:'g',sessionId:'now-session',status:'active',participants:[{userId:'historical-owner',actorId:'pc',presence:'present'}]}},{kind:'actor',data:{id:'pc',campaignId:'g',sceneId:'now',kind:'pc',status:'active',ownerUserId:'historical-owner',controllerUserId:'historical-owner',controlRole:'owner'}},{kind:'channel',data:{id:'private',campaignId:'g',sceneId:'now',kind:'private',ownerUserId:'historical-owner',permissionsVerified:true,recipientIds:['historical-owner'],writerIds:['historical-owner']}},{kind:'message',data:{id:'new-attempt',campaignId:'g',channelId:'private',userId:'historical-owner',deleted:false,text:'I cast Jinx.'}}];
  scenes.commitSnapshot({campaignId:'g',principal:'native-setup',sourceRef:'new-scene',records:records.map(r=>({...r,expectedRevision:null}))},{check(){}});
  actions.initializeHope({campaignId:'g',actorId:'pc',ownerUserId:'historical-owner',hope:4,cap:6},{check(){}});actions.initializePcDefenses({campaignId:'g',actorId:'pc',ownerUserId:'historical-owner',controlRevision:'1',hp:{current:0,max:6},armorSlots:{current:0,max:3}},{check(){}});actions.initializePcLife({campaignId:'g',actorId:'pc',ownerUserId:'historical-owner',controlRevision:'1',sourceRef:'native-profile',sourceRevision:'1',level:1,stress:{current:0,max:6}},{check(){}});
  const canonical=createCanonicalActorReaders({sceneStore:scenes,actionStore:actions,characterRepository:f.repo}),authority=createSourceAuthority(canonical.readers),source=authority.authenticate({campaignId:'g',messageId:'new-attempt',userId:'historical-owner',actorId:'pc'}),catalog=createDomainCardCatalog(new URL('../../../content/CARDS/domain_cards.json',import.meta.url)),file=join(dirname(f.file),'adjudications.sqlite');
  const options={catalog,readActorSnapshot:canonical.readActorSnapshot};adjudications=openRollAdjudications(file,options);
  const locator={feature:'domain:hex:jinx',slot:'base',source_hash:catalog.findDomainCard('domain:hex:jinx').source_hash},decision={id:'spellcast',revision:'1',campaignId:'g',sceneId:'now',actorId:'pc',sourceRef:source.id,sourceRevision:source.revision,status:'accepted',difficulty:14,stakes:'The target resists.',trait:'Knowledge',modifierRefs:[]};
  const makeModifiers=()=>createLegacySpellcastConditionModifiers({repository:f.repo,catalog,adjudications,sourceAuthority:authority,readActorSnapshot:canonical.readActorSnapshot});let modifiers=makeModifiers();
  const check=()=>{if(!authority.revalidate(source))throw new Error('Native source changed');};
  const makeTerms=()=>createRollTermsReader({readActorSnapshot:canonical.readActorSnapshot,...modifiers});
  return {...f,source,decision,locator,canonical,scenes,actions,rolls,check,get adjudications(){return adjudications;},get modifiers(){return modifiers;},get terms(){return makeTerms();},reopen(){adjudications.close();adjudications=openRollAdjudications(file,options);modifiers=makeModifiers();},prepare(){return createOrdinaryRollPreparation({sourceAuthority:authority,readAdjudication:adjudications.read,readActor:canonical.readActor,rollStore:rolls,termReader:makeTerms()});}};
}
test('real condition window and durable identity supply compulsory nonstacking Spellcast disadvantage after cold reopen',t=>{
  const f=fixture(t),before=f.actions.readHope('g','pc');f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);assert.equal(f.decision.modifierRefs.length,1);assert.equal(f.adjudications.read('g','spellcast'),null);assert.throws(()=>f.terms.inspect(f.source,f.decision),/reviewed native Spellcast/);
  f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});f.reopen();const terms=f.terms.inspect(f.source,f.adjudications.read('g','spellcast'));assert.equal(terms.modifier,2);assert.equal(terms.disadvantage,1);assert.equal(terms.termProof.modifiers.length,1);assert.equal(JSON.stringify(terms).includes('native-only-condition-canary'),false);
  const request=f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'});assert.equal(request.disadvantage,1);assert.equal(request.sourceRef,f.source.id);assert.equal(f.rolls.readResultForRequest('g',request.id),null);assert.deepEqual(f.actions.readHope('g','pc'),before);
});
test('persisted identity cannot omit actual compulsory condition reference from accepted roll terms',t=>{const f=fixture(t);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});assert.throws(()=>f.prepare().commitRequest(f.source,'pc',{adjudication_ref:'spellcast'}),/modifier references/);assert.equal(f.rolls.readResultForRequest('g','spellcast'),null);});
test('exact native owner clear ends current odds; saved stale modifier references cannot survive it',t=>{
  const f=fixture(t);f.decision.modifierRefs=f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator);f.adjudications.save(f.source,f.decision,{check:f.check,spellcast:f.locator});assert.equal(f.terms.inspect(f.source,f.decision).disadvantage,1);attachOwnerClear(f);assert.throws(()=>f.terms.inspect(f.source,f.decision),/modifier reference/);
  const fresh={...f.decision,id:'after-clear',modifierRefs:[]};assert.deepEqual(f.modifiers.previewMandatoryRefs(f.source,fresh,f.locator),[]);f.adjudications.save(f.source,fresh,{check:f.check,spellcast:f.locator});assert.equal(f.terms.inspect(f.source,fresh).disadvantage,0);
});
test('unproven termination, broken original ancestry and misindexed discovery hold instead of granting zero disadvantage',t=>{
  for(const sql of ["UPDATE city_records SET status='cleared' WHERE kind='pc_native_condition'","UPDATE world_events SET status='revoked' WHERE event_key='request:source'","UPDATE city_records SET actor_key='another-pc' WHERE kind='pc_native_condition'"]){const f=fixture(t);f.db.exec(sql);assert.throws(()=>f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator));assert.equal(f.adjudications.read('g','spellcast'),null);}
});
test('native source revocation and caller-supplied forged actor snapshots cannot enter modifier qualification',t=>{
  const f=fixture(t),actor=f.canonical.readActorSnapshot('g','pc');assert.throws(()=>f.modifiers.readMandatoryRefs(f.source,f.decision,{...actor,data:{...actor.data,domain_cards:[{name:'invented',active:true}]}}),/current native roll actor/);
  const old=f.scenes.readers.readMessage('g','new-attempt'),{revision,...data}=old;f.scenes.commitSnapshot({campaignId:'g',principal:'transport',sourceRef:'message-revoked',records:[{kind:'message',expectedRevision:Number(revision),data:{...data,deleted:true}}]},{check(){}});assert.throws(()=>f.modifiers.previewMandatoryRefs(f.source,f.decision,f.locator),/source required/);
});
