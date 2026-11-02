import test from 'node:test';
import assert from 'node:assert/strict';
import {EncounterLibrary} from '../../src/frameworks/daggerheart/encounter-library.js';
import {createFeatureRollConditionRules,featureRollSource} from '../../src/frameworks/daggerheart/feature-roll-source-rules.js';
import {createRollRequestRules} from '../../src/frameworks/daggerheart/roll-request-rules.js';
import {createTypedRollProof} from '../../src/frameworks/daggerheart/typed-roll-proof.js';
import {dualityRoll} from '../../src/frameworks/daggerheart/dice.js';
import {nativeStore} from './af03-store.mjs';

function fixture({marked=true,advantage=false,kind='action',feature='domain:hex:jinx'}={}){
  const store=nativeStore(),{db,indexWorldEvent}=store,noop=()=>null,library=new EncounterLibrary('../content'),
    card=library.findDomainCard(feature),pc={id:'pc',owner_user_id:'owner',data:{level:card.card.level,class:'Witch',subclass:'Hedge',domains:[card.domain,'Sage'],
      domain_cards:[{name:card.card.name,active:true}],traits:{Knowledge:2},inventory:[{name:'Focus',equipped:true}],resources:{hope:2,stress:{current:0,max:6}}}};
  const condition=db.saveCityRecord('g',{kind:'pc_native_condition',key:'foam',status:'active',actor_key:'pc',visibility:'character',subject_key:'pc',
    data:{cause:{feature:'adversary:ritual-enforcement-team:null-foam',condition:'Restrained',expiry:'until_freed',spellcast_disadvantage:true}}});
  indexWorldEvent(db,'g',{key:'owner-source',kind:'authored_turn',source_id:'player:owner',session_id:'session',scene:'scene',visibility:'character',subject_key:'pc',
    details:{author:'owner',character_id:'pc',raw_text:'I cast Jinx.'}});
  db.saveCityRecord('g',{kind:'typed_intent',key:'intent',status:'accepted_for_adjudication',source_event:'owner-source',
    data:{actor:'pc',owner_user_id:'owner',session_id:'session',scene:'scene'}});
  indexWorldEvent(db,'g',{key:'difficulty',kind:'roll_adjudication',source_kind:'gm',source_id:'reviewer',visibility:'character',subject_key:'pc',session_id:'session',scene:'scene',
    details:{human_reviewed:true,roll_difficulty:{declaration:'owner-source',value:14,ruling_key:'ruling',
      ...(marked?{feature_roll_source:{feature:card.feature,slot:'base',source_hash:card.source_hash}}:{})}}});
  if(kind==='attack')indexWorldEvent(db,'g',{key:'attack',kind:'roll_adjudication',source_kind:'gm',source_id:'reviewer',visibility:'character',subject_key:'pc',session_id:'session',scene:'scene',
    details:{human_reviewed:true,roll_attack:{weapon:'Focus',trait:'Knowledge',active:true,damage:'1d8+3',damage_type:'magic',target_id:'npc-target',ruling_key:'ruling',
      feature_roll_source:{feature:card.feature,slot:'base',source_hash:card.source_hash}}}});
  db.getActiveSession=()=>({id:'session'});db.getCharacter=()=>pc;db.getRulesRuling=(_g,key)=>key==='ruling'?{ruling_key:key}:null;
  db.getCityCalendar=()=>({flags:{roll_requests:true}});db.ownerAuthoredSource=(_g,key,user)=>key==='owner-source'&&user==='owner';
  db.getCurrentEncounter=()=>({id:'encounter',status:'active'});db.listCombatants=()=>[{id:'npc-target',status:'active',difficulty:14}];
  db.rollModifierSources=()=>advantage?[db.getWorldEvent('g','advantage')]:[];db.getSavedRoll=(_g,key)=>db.getCityRecord('g','saved_roll',key);
  if(advantage)indexWorldEvent(db,'g',{key:'advantage',kind:'roll_adjudication',source_kind:'gm',source_id:'reviewer',visibility:'character',subject_key:'pc',session_id:'session',scene:'scene',
    details:{human_reviewed:true,roll_modifier:{name:'Scoped advantage',trait:'Knowledge',roll_kind:'action',kind:'advantage',amount:1,ruling_key:'ruling'}}});
  let failReceipt=false;
  const conditionRules=createFeatureRollConditionRules({resolveFeatureRollSource:(pc,input)=>featureRollSource(library,pc,input),
    activeNativeConditions:()=>{const row=db.getCityRecord('g','pc_native_condition','foam');return row?.status==='active'?[row]:[];},
    validateNativeCondition:(_db,_g,key)=>{const row=db.getCityRecord('g','pc_native_condition',key);if(!row)throw Error('missing native condition');return row;},
    indexWorldEvent:(db,g,event)=>{if(failReceipt)throw Error('injected source receipt failure');return indexWorldEvent(db,g,event);}});
  const mechanics=Object.fromEntries(['isPvpIntent','assertNonPvpCombatant','assertPcCanAct','blazeActionAuthorization','nativeDefenseAura','persistNativeDefenseAura',
    'nativeFormationDefense','persistNativeFormationDefense','nativeVeilExposureDefense','inspectNativeUnarmedAttack','inspectOrdinaryRollModifier',
    'inspectNativeEquippedAttack','captureAdvantageFeatureOpportunities'].map(name=>[name,noop]));
  Object.assign(mechanics,conditionRules);
  const rules=createRollRequestRules({traits:['Knowledge','Instinct'],mechanics,reserveRollAmendment:noop,sources:{
    personalCharacter:()=>pc,currentScene:()=>({key:'scene'}),requireCitySource:(_db,_g,key)=>{const e=db.getWorldEvent('g',key);assert.equal(e?.status,'active');return e;},
    cityAudit:noop,cityKey:s=>s,overlapsOwnerActionTerminal:()=>false}}),
    input={source_event:'owner-source',accepted_intent:'intent',character_id:'pc',trait:'Knowledge',kind,adjudication:'Existing scoped reviewed roll.',
      modifier_keys:advantage?['advantage']:[],difficulty_source:kind==='attack'?'':'difficulty',attack_source:kind==='attack'?'attack':''};
  function sealRoll(request){
    let i=0;const result=dualityRoll({modifier:request.data.breakdown.subtotal,advantage:request.data.breakdown.advantage,disadvantage:request.data.breakdown.disadvantage},()=>[8,5,4][i++]);
    db.saveCityRecord('g',{kind:'saved_roll',key:'roll',id:'roll',session_id:'session',character_id:'pc',discord_user_id:'owner',roll_type:request.data.kind,payload:{...result,request:request.record_key}});
    const resolved=db.saveCityRecord('g',{...request,key:request.record_key,status:'resolved',data:{...request.data,roll_id:'roll',result}});
    const a=db.getCityRecord('g','typed_intent','intent');db.saveCityRecord('g',{...a,key:a.record_key,status:'resolved'});return resolved;
  }
  const prove=createTypedRollProof({historicalActionSource:noop,inspectSavedRollConditionContext:conditionRules.inspectSavedRollConditionContext});
  return {...store,pc,input,condition,conditionRules,rules,prepare:()=>rules.prepareRollRequest(db,'g',input,'reviewer'),sealRoll,prove,failReceipt:()=>failReceipt=true};
}

test('source-qualified Spellcast preparation adds native disadvantage and preserves its actual saved failure proof',()=>{
  const f=fixture();try{
    const request=f.prepare(),b=request.data.breakdown;
    assert.equal(b.feature_roll_source.identity.classification,'spellcast');assert.equal(b.disadvantage,1);assert.equal(b.modifiers.length,0);
    assert.equal(b.native_condition_odds.conditions.length,1);
    const saved=f.sealRoll(request);assert.equal(saved.data.result.total,11);assert.equal(f.prove(f.db,'g',saved).outcome,'failure');
    assert.deepEqual(f.pc.data.resources,{hope:2,stress:{current:0,max:6}});
  }finally{f.close();}
});

test('an ordinary roll using the same trait is not changed into a Spellcast Roll',()=>{
  const f=fixture({marked:false});try{
    const b=f.prepare().data.breakdown;assert.equal(b.disadvantage,0);assert.equal(b.feature_roll_source,undefined);assert.equal(b.native_condition_odds,undefined);
  }finally{f.close();}
});

test('changed classification scope or subclass trait cannot prepare a native spell roll',()=>{
  for(const change of ['scope','trait','unreviewed']){
    const f=fixture();try{
      if(change==='trait')f.input.trait='Instinct';
      else{const e=f.db.getWorldEvent('g','difficulty');if(change==='scope')e.subject_key='other';else e.details.human_reviewed=false;f.indexWorldEvent(f.db,'g',{...e,key:e.event_key});}
      assert.throws(f.prepare);assert.equal(f.db.listCityRecords('g',{kind:'roll_request'}).length,0);
    }finally{f.close();}
  }
});

test('source receipt storage failure rolls back the pending request atomically',()=>{
  const f=fixture();try{f.failReceipt();assert.throws(f.prepare,/injected source receipt failure/);assert.equal(f.db.listCityRecords('g',{kind:'roll_request'}).length,0);}
  finally{f.close();}
});

test('historical proof survives a later legitimate release and changed active loadout',()=>{
  const f=fixture();try{
    const saved=f.sealRoll(f.prepare()),row=f.db.getCityRecord('g','pc_native_condition','foam');
    f.db.saveCityRecord('g',{...row,key:row.record_key,status:'cleared'});f.pc.data.domain_cards[0].active=false;
    assert.equal(f.prove(f.db,'g',saved).outcome,'failure');assert.throws(()=>f.rules.rollBreakdown(f.db,'g',f.input,f.pc));
  }finally{f.close();}
});

test('omitted native odds and missing preparation ancestry cannot validate saved dice',()=>{
  const f=fixture();try{
    const saved=f.sealRoll(f.prepare()),bad=structuredClone(saved);bad.data.breakdown.disadvantage=0;
    f.db.saveCityRecord('g',{...bad,key:bad.record_key});assert.throws(()=>f.prove(f.db,'g',bad));
    f.db.saveCityRecord('g',{...saved,key:saved.record_key});
    const receipt=f.conditionRules.inspectSavedRollConditionContext(f.db,'g',saved);f.db.sql.prepare('DELETE FROM events WHERE key=?').run(receipt.event_key);
    assert.throws(()=>f.prove(f.db,'g',saved));
  }finally{f.close();}
});

test('native Spellcast disadvantage cancels an existing sourced advantage without another die or expenditure',()=>{
  const f=fixture({advantage:true});try{
    const request=f.prepare();assert.equal(request.data.breakdown.advantage,1);assert.equal(request.data.breakdown.disadvantage,1);
    const saved=f.sealRoll(request);assert.equal(saved.data.result.total,15);assert.equal(f.prove(f.db,'g',saved).outcome,'success');
    assert.deepEqual(f.pc.data.resources,{hope:2,stress:{current:0,max:6}});
  }finally{f.close();}
});

test('a damaging Spellcast keeps its existing attack provenance while receiving source-bound disadvantage',()=>{
  const f=fixture({kind:'attack',feature:'domain:signal:static-arc'});try{
    const request=f.prepare();assert.equal(request.data.kind,'attack');assert.equal(request.data.breakdown.attack.target_id,'npc-target');
    assert.equal(request.data.breakdown.feature_roll_source.identity.feature,'domain:signal:static-arc');assert.equal(request.data.breakdown.disadvantage,1);
    const saved=f.sealRoll(request);assert.equal(f.prove(f.db,'g',saved).outcome,'failure');assert.equal(saved.data.damage_result,undefined);
  }finally{f.close();}
});
