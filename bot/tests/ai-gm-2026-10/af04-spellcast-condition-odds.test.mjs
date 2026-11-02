import test from 'node:test';
import assert from 'node:assert/strict';
import {EncounterLibrary} from '../../src/frameworks/daggerheart/encounter-library.js';
import {createFeatureRollConditionRules,featureRollSource} from '../../src/frameworks/daggerheart/feature-roll-source-rules.js';
import {createRollRequestRules,rollRevision} from '../../src/frameworks/daggerheart/roll-request-rules.js';
import {createRollCollaborationRules} from '../../src/frameworks/daggerheart/roll-collaboration-rules.js';
import {createTypedRollProof} from '../../src/frameworks/daggerheart/typed-roll-proof.js';
import {dualityRoll} from '../../src/frameworks/daggerheart/dice.js';
import {nativeStore} from './af03-store.mjs';

function fixture({marked=true,advantage=false,kind='action',feature='domain:hex:jinx'}={}){
  const store=nativeStore(),{db,indexWorldEvent}=store,noop=()=>null,library=new EncounterLibrary('../content'),
    card=library.findDomainCard(feature),pc={id:'pc',name:'Witch',owner_user_id:'owner',data:{level:card.card.level,class:'Witch',subclass:'Hedge',domains:[card.domain,'Sage'],
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

function collaboration(f){
  const {db,pc,rules}=f,noop=()=>null;let notices=0;
  const save=db.saveCityRecord;db.saveCityRecord=(guild,input)=>save(guild,{status:'active',...input});
  pc.guild_id='g';db.getCityCalendar=()=>({flags:{roll_requests:true,roll_collaboration:true}});
  db.updateCharacterData=(_id,fn)=>{fn(pc.data);return pc;};db.recordSpotlight=noop;
  db.savedRollsForResult=(_g,id)=>db.listCityRecords('g',{kind:'saved_roll'}).filter(r=>r.payload.id===id);
  db.addRoll=(_g,session,user,character,type,payload)=>{
    db.saveCityRecord('g',{kind:'saved_roll',key:payload.id,id:payload.id,session_id:session,discord_user_id:user,character_id:character,roll_type:type,payload});return payload.id;
  };
  const requireSource=(_db,_g,key)=>{const s=db.getWorldEvent('g',key);assert.equal(s?.status,'active');return s;},
    sources={personalCharacter:(_db,_g,user)=>{assert.equal(user,'owner');return pc;},currentScene:()=>({key:'scene'}),sceneAccess:()=>true,
      requireCitySource:requireSource,cityAudit:noop,cityKey:s=>s,cityObject:v=>v,indexWorldEvent:f.indexWorldEvent,
      validateRollSharePreview:noop,sourceConfirmedRollAttempt:noop},
    outcomes={recordObservedAttack:noop,finalizeTypedRollAction:noop,resumePendingGmActions:noop,reserveRollAmendment:()=>notices++,
      reserveRollPartyDisclosure:noop,captureAdvantageFeatureOpportunities:noop},
    mechanics=Object.fromEntries(['assertNonPvpCombatant','validatePvpAttackRoll','validatePvpDamageRoll','validatePcDeathOutcome',
      'blazeActionAuthorization','blazeCriticalResult','completeBlazeAction','validateBlazeSavedRoll','assertPcCanAct','consentAction','historicalActionSource',
      'assertGmRulingRequest','assertGmInvitationRequest','nativeAdversaryDamageDefense','validateNativeExperienceEligibility','inspectNativeUnarmedAttack',
      'assertPreRollFearRollAllowed','inspectNativeRollParticipation','typedRollProof'].map(name=>[name,noop]));
  Object.assign(mechanics,f.conditionRules,{rollRevision,rollBreakdown:rules.rollBreakdown,rollTraitBreakdown:rules.rollTraitBreakdown,
    hopeCap:()=>6,reconcileNativeFormationBreakdown:(_db,_g,_row,b)=>b,
    validateNativeExperienceEligibility:()=>{throw Object.assign(new Error('Reviewed source route.'),{code:'NATIVE_EXPERIENCE_ELIGIBILITY'});}});
  const native=createRollCollaborationRules({sources,outcomes,mechanics});
  return {native,notices:()=>notices,roll:(row,key,rng)=>native.contributeRoll(db,'g','owner',{
    op:'roll',request:row.record_key,expected_revision:rollRevision(row),key},{rng})};
}

test('pending Spellcast condition change amends existing controls without dice then requires a new owner Roll revision',()=>{
  const f=fixture();try{
    const c=collaboration(f),original=f.prepare(),resources=structuredClone(f.pc.data.resources),oldProof=f.conditionRules.inspectSavedRollConditionContext(f.db,'g',original);
    f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'cleared'});
    let dice=0;const amended=c.roll(original,'before-release',()=>{dice++;return 8;});
    assert.equal(amended.status,'pending');assert.equal(amended.data.breakdown.disadvantage,0);assert.equal(dice,0);
    assert.equal(amended.data.revision,original.data.revision+1);assert.equal(c.notices(),1);assert.deepEqual(f.pc.data.resources,resources);
    assert.deepEqual(f.conditionRules.inspectSavedRollConditionContext(f.db,'g',original),oldProof);
    assert.notEqual(f.conditionRules.inspectSavedRollConditionContext(f.db,'g',amended).event_key,oldProof.event_key);
    assert.deepEqual(c.roll(original,'before-release',()=>{throw Error('replay rolled');}),amended);
    assert.throws(()=>c.roll(original,'stale-new-attempt',()=>{throw Error('stale rolled');}));
    const resolved=c.roll(amended,'new-revision',()=>++dice===1?8:5);
    assert.equal(dice,2);assert.equal(resolved.status,'resolved');assert.equal(resolved.data.result.total,15);
    assert.equal(f.prove(f.db,'g',resolved).outcome,'success');assert.equal(f.pc.data.resources.hope,3);
    assert.equal(f.db.getCityRecord('g','roll_operation','before-release:pc').data.op,'condition-odds-amendment');
  }finally{f.close();}
});

test('new Restrained condition adds compulsory odds to an unrolled Spellcast request without consuming its Roll',()=>{
  const f=fixture();try{
    const c=collaboration(f);f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'cleared'});
    const original=f.prepare();f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'active'});
    const amended=c.roll(original,'condition-arrival',()=>{throw Error('old odds rolled');});
    assert.equal(amended.data.breakdown.disadvantage,1);let dice=0;
    const resolved=c.roll(amended,'accept-new-odds',()=>[8,5,4][dice++]);
    assert.equal(dice,3);assert.equal(resolved.data.result.total,11);assert.equal(f.prove(f.db,'g',resolved).outcome,'failure');
  }finally{f.close();}
});

test('condition amendment never waives a sheet change, different owner or partially rolled Tag Team',()=>{
  for(const change of ['trait','owner','tag']){
    const f=fixture();try{
      const c=collaboration(f);let original=f.prepare();f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'cleared'});
      if(change==='trait')f.pc.data.traits.Knowledge=3;
      if(change==='tag')original=f.db.saveCityRecord('g',{...original,key:original.record_key,data:{...original.data,tag:{participants:[]}}});
      if(change==='owner')assert.throws(()=>c.native.contributeRoll(f.db,'g','other',{op:'roll',request:original.record_key,key:'wrong',expected_revision:rollRevision(original)}));
      else assert.throws(()=>c.roll(original,'unrelated-change',()=>{throw Error('invalid rolled');}));
      assert.equal(c.notices(),0);assert.deepEqual(f.db.getCityRecord('g','roll_request',original.record_key),original);
    }finally{f.close();}
  }
});

test('condition amendment proof failure rolls back the request, revision, history and operation receipt',()=>{
  const f=fixture();try{
    const c=collaboration(f),original=f.prepare();f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'cleared'});f.failReceipt();
    assert.throws(()=>c.roll(original,'failed-refresh',()=>{throw Error('uncommitted rolled');}),/injected source receipt failure/);
    assert.deepEqual(f.db.getCityRecord('g','roll_request',original.record_key),original);
    assert.equal(f.db.listCityRecords('g',{kind:'roll_operation'}).length,0);assert.equal(c.notices(),0);
    assert.equal(f.db.listCityRecords('g',{kind:'saved_roll'}).length,0);
  }finally{f.close();}
});

test('an owner-paid Experience survives condition amendment and rolling without a second Hope charge',()=>{
  const f=fixture();try{
    const c=collaboration(f),original=f.prepare();f.pc.data.experiences=[{name:'Occult',modifier:2}];
    f.indexWorldEvent(f.db,'g',{key:'experience-source',kind:'roll_adjudication',source_kind:'gm',source_id:'reviewer',
      visibility:'character',subject_key:'pc',session_id:'session',scene:'scene',details:{human_reviewed:true,ruling_key:'ruling',
        roll_participation:{kind:'experience',request:original.record_key,character_id:'pc',experience:'Occult',description:'Relevant occult study.'}}});
    const paid=c.native.contributeRoll(f.db,'g','owner',{op:'experience',request:original.record_key,key:'pay-once',
      expected_revision:rollRevision(original),experience:'Occult',proof:'experience-source',description:'Relevant occult study.',pay_hope:true});
    assert.equal(f.pc.data.resources.hope,1);
    f.db.saveCityRecord('g',{...f.condition,key:f.condition.record_key,status:'cleared'});
    const amended=c.roll(paid,'paid-refresh',()=>{throw Error('refresh rolled');});
    assert.deepEqual(amended.data.experiences,paid.data.experiences);assert.equal(f.pc.data.resources.hope,1);
    let dice=0;const resolved=c.roll(amended,'paid-roll',()=>++dice===1?5:8);
    assert.equal(resolved.data.result.total,17);assert.equal(resolved.data.result.experience,2);assert.equal(f.pc.data.resources.hope,1);
    assert.equal(f.prove(f.db,'g',resolved).outcome,'success');assert.equal(dice,2);
  }finally{f.close();}
});

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
