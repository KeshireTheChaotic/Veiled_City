import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07Scenario,createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';
import {nativeTypedIntentSource,EncounterLibrary} from '../../src/frameworks/daggerheart/public.js';
import {captureWorldInput} from '../../src/frameworks/world/public.js';
import {adjudicateRollSource,contributeRoll} from '../../src/roll-collaboration.js';
import {prepareRollRequest,rollRevision} from '../../src/roll-requests.js';
import {inspectSavedRollConditionContext} from '../../src/native-roll-conditions.js';
import {typedRollProof} from '../../src/typed-roll-proof.js';

test('AF07 composed runtime prepares and proves a source-qualified Spellcast roll without granting card effects',async()=>{
  await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f})=>{
    const {db,guild,pc,scene}=f,owner=pc.owner_user_id,source=new EncounterLibrary('../content').findDomainCard('domain:hex:jinx');
    db.updateCharacterData(pc.id,data=>{Object.assign(data,{class:'Witch',subclass:'Hedge',level:source.card.level,
      domains:[source.domain,'Sage'],domain_cards:[{name:source.card.name,active:true}]});data.traits.Knowledge=2;});
    const text='I make my Jinx Spellcast Roll.',messageId='af07-spellcast',scope={mode:'private',actorUserId:owner,actorCharacterId:pc.id};
    captureWorldInput(db,guild,owner,pc.id,messageId,text,{privateScene:true});
    const [action]=nativeTypedIntentSource.persistPlayerIntents(db,guild,[{type:'roll',source_span:text,target_name:'',target_key:'',destination:'unspecified',
      operation:'request_roll',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'The owner requests their actual roll.'}],scope,{messageId});
    assert.ok(action);
    db.upsertRulesRuling(guild,{key:'af07-spellcast-source',question:'Which printed feature calls for this roll?',
      ruling:'This fixture reviews only the printed Jinx Spellcast identity and Difficulty; no card costs or effects are authorized.',createdBy:'fixture-gm'});
    const reviewed=adjudicateRollSource(db,guild,{key:'af07-spellcast-difficulty',character_id:pc.id,kind:'difficulty',ruling_key:'af07-spellcast-source',
      data:{declaration:action.source_event,value:14,feature_roll_source:{feature:source.feature,slot:'base',source_hash:source.source_hash}}},'fixture-gm');
    const resources=structuredClone(db.getCharacter(pc.id).data.resources),request=prepareRollRequest(db,guild,{
      source_event:action.source_event,accepted_intent:action.record_key,character_id:pc.id,trait:'Knowledge',kind:'action',
      adjudication:'Source-qualified Spellcast roll identity only.',modifier_keys:[],difficulty_source:reviewed.event_key,attack_source:''},'fixture-gm');
    const proof=inspectSavedRollConditionContext(db,guild,request);
    assert.equal(proof.visibility,'character');assert.equal(proof.subject_key,pc.id);assert.equal(proof.scene,scene.key);
    assert.equal(request.data.breakdown.feature_roll_source.identity.execution_authorized,false);
    assert.equal(request.data.breakdown.native_condition_odds.disadvantage,0);
    assert.deepEqual(db.getCharacter(pc.id).data.resources,resources);let dice=0;
    const result=contributeRoll(db,guild,owner,{op:'roll',request:request.record_key,expected_revision:rollRevision(request),key:'af07-spellcast-owner-roll'},
      {rng:()=>++dice%2?8:9});
    assert.equal(dice,2);assert.equal(result.data.result.total,19);assert.equal(typedRollProof(db,guild,result).outcome,'success');
    assert.equal(db.getCharacter(pc.id).data.resources.stress.current,resources.stress.current);
    assert.equal(db.listCityRecords(guild,{kind:'pc_native_condition',includeGM:true,limit:20}).length,0);
    assert.deepEqual(inspectSavedRollConditionContext(db,guild,result),proof);
  }});
});
