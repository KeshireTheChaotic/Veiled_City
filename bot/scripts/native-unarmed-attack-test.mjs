/** Test-first UA14: native ordinary PC-to-NPC unarmed attack remains owner-rolled. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision,queueRollAmendment,publishRollAmendment} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {nativeGmNotice} from '../src/gm-arbitration-output.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';

function fixture(f,{targetKey='guard',template='Aster Vale Contractor',privateScene=false}={}){
  const x=setup(f,{text:'I punch the guard.',privateScene}),scene=currentScene(f.db,f.guild),npc='guard';
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,
    narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc',npc,{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'unarmed-guard-source',kind:'observation',source_id:'gm',title:'Guard is present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:npc,source_event:source.event_key,location_key:'terminal',zone:'interior',
    range:'Melee',visibility:'party',accepted_by:'gm'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,
    base_bp:14,budget_bp:14,composition:[{name:template,quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,
      buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:npc,id:combatant.id}]}});
  const intent=persistPlayerIntents(f.db,f.guild,[{type:'interact',source_span:x.text,target_name:targetKey==='guard'?'guard':x.pc.name,target_key:targetKey,
    destination:'unspecified',operation:'unarmed_attack',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',
    reason:'Attempt an ordinary unarmed strike.'}],x.scope,{messageId:x.messageId})[0];
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[intent],[]);
  return {...x,intent,origin,board,library,combatant,encounter,targetSource:source.event_key};
}

function prepare(f,x,overrides={}){
  const entry=x.board.data.entries[0],decision={intent_ref:entry.intent_ref,disposition:'request_pc_action_roll',
    rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Strength',stakes_kind:'native_attack',
    stakes:'The punch may miss; no damage or target change is assumed.',reason:'A source-backed ordinary unarmed attack.',
    difficulty_reason:'Use the active NPC combatant Difficulty.',feature_ref:'unarmed_attack',experience_ref:'',advantage:false,disadvantage:false,...overrides};
  const [saved]=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[decision],{library:x.library});
  return saved;
}

test('native unarmed attack prepares an owner-private NPC-target roll without resolving the attack',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x);
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const request=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(request.status,'pending');
  assert.equal(request.subject_key,x.pc.id);
  assert.equal(request.data.owner_user_id,x.pc.owner_user_id);
  assert.equal(request.visibility,'character');assert.equal(request.data.input.private_result,true);
  assert.deepEqual(request.data.breakdown.attack,{weapon:'unarmed',damage:`${x.pc.data.proficiency}d4`,damage_type:'physical',
    target_id:x.combatant.id,encounter_id:x.encounter.id,difficulty:x.combatant.difficulty});
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  assert.equal(f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current,x.combatant.hp_current);
}));

test('owner rolls and damages through native saved receipts; replay and restart preserve one result',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x);assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  let faces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'unarmed-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>[12,7][faces++]});
  assert.equal(faces,2);assert.equal(rolled.status,'awaiting_damage');
  assert.equal(rolled.data.owner_user_id,x.pc.owner_user_id);assert.equal(rolled.data.breakdown.attack.target_id,x.combatant.id);
  let damageFaces=0;const damaged=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'unarmed-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{damageFaces++;return 4;}});
  assert.equal(damageFaces,x.pc.data.proficiency);assert.equal(damaged.status,'resolved');
  assert.equal(damaged.data.damage_result.target_id,x.combatant.id);
  const savedDice=f.db.getSavedRoll(f.guild,damaged.data.roll_id);
  assert.equal(savedDice.character_id,x.pc.id);assert.equal(savedDice.discord_user_id,x.pc.owner_user_id);
  const proof=typedRollProof(f.db,f.guild,damaged);assert.equal(proof.outcome,'success');
  const hp=f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current;
  assert(hp<x.combatant.hp_current);assert.equal(damaged.data.damage_result.after,hp);
  const count=faces+damageFaces;f.restart();
  const replay=f.db.getCityRecord(f.guild,'roll_request',q.record_key);
  assert.deepEqual(typedRollProof(f.db,f.guild,replay),proof);
  let rerollCalls=0;const replayed=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'unarmed-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>{rerollCalls++;return 1;}});
  assert.equal(rerollCalls,0);assert.equal(f.db.getCityRecord(f.guild,'roll_request',q.record_key).data.roll_id,damaged.data.roll_id);
  assert.equal(f.db.listCombatants(x.encounter.id).find(c=>c.id===x.combatant.id).hp_current,hp);assert.equal(count,2+x.pc.data.proficiency);
}));

test('unarmed attack rejects PC target masquerade, proxy control, non-Melee target, unsupported trait, and invalid Proficiency before dice',async()=>{
  const cases=[
    ['PC target masquerading as NPC',{targetKey:'pc'}],
    ['proxied NPC target',{mutate:(f)=>f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'})}],
    ['non-Melee separation',{mutate:(f,x)=>{
      const source=indexWorldEvent(f.db,f.guild,{key:'unarmed-target-far',kind:'observation',source_id:'gm',title:'Guard moved out of reach',
        session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
      recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',
        zone:'exterior',range:'Far',visibility:'party',accepted_by:'gm'});
    }}],
    ['unsupported trait',{decision:{trait:'Agility'}}],
    ['invalid Proficiency',{mutate:(f,x)=>f.db.updateCharacterData(x.pc.id,data=>{data.proficiency=0;})}]
  ];
  for(const [label,options] of cases)await nativeFixture(f=>{
    const targetKey=options.targetKey==='pc'?f.pcs[1].id:'guard',x=fixture(f,{targetKey});options.mutate?.(f,x);
    let saved=null,thrown=null;try{saved=prepare(f,x,options.decision||{});}catch(error){thrown=error;}
    assert(thrown||saved?.status==='needs_rules_review',`${label} unexpectedly prepared: ${saved?.status}`);
    assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0,label);
    assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM rolls WHERE guild_id=?').get(f.guild).n,0,label);
  });
});

test('owner and current native source remain required before RNG, and stale deferred private notice is denied',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x),q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const scope={mode:'private',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id};
  const notice=nativeGmNotice(f.db,f.guild,saved.record_key,scope);assert(notice.text.length>0);
  const wrongOwner=f.pcs[1].owner_user_id;assert.notEqual(wrongOwner,x.pc.owner_user_id);
  let calls=0;assert.throws(()=>contributeRoll(f.db,f.guild,wrongOwner,{op:'roll',key:'wrong-owner',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>{calls++;return 10;}}));assert.equal(calls,0);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?")
    .run(f.guild,q.data.input.attack_source);
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,scope));
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'stale-source',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>{calls++;return 10;}}));
  assert.equal(calls,0);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
}));

test('fabricated native attack payload cannot authorize owner RNG',()=>nativeFixture(f=>{
  const x=fixture(f),saved=prepare(f,x),q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref),
    event=f.db.getWorldEvent(f.guild,q.data.input.attack_source),binding=event.details.binding,
    forged={...binding,target:{...binding.target,damage:'99d100'}};
  const details={...event.details,binding:forged,payload_hash:hash(forged)};
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?')
    .run(JSON.stringify(details),f.guild,event.event_key);
  let calls=0;assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'forged-proof',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>{calls++;return 10;}}));
  assert.equal(calls,0);assert.equal(f.db.db.prepare('SELECT count(*) AS n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
}));

test('pending private roll outbox delivers only to the owner and stale deferred delivery sends nothing',async()=>{
  await nativeFixture(async f=>{
    const x=fixture(f),saved=prepare(f,x),q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
    queueRollAmendment(f.db,f.guild,q);f.restart();let sent=[];
    await publishRollAmendment(f.db,f.guild,q,(user,content,session,character)=>{sent.push({user,content,session,character});return{messageId:'private-fixture',channelId:'offline-dm'};});
    assert.equal(sent.length,1);assert.equal(sent[0].user,x.pc.owner_user_id);assert.equal(sent[0].character,x.pc.id);
    assert(sent[0].content.includes(x.text));
    await publishRollAmendment(f.db,f.guild,q,()=>{assert.fail('delivered private notice must not resend after restart');});
  });
  await nativeFixture(async f=>{
    const x=fixture(f),saved=prepare(f,x),q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
    queueRollAmendment(f.db,f.guild,q);f.restart();
    f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?")
      .run(f.guild,q.data.input.attack_source);
    let sends=0;await assert.rejects(()=>publishRollAmendment(f.db,f.guild,q,()=>{sends++;return{messageId:'forbidden'};}));
    assert.equal(sends,0);
  });
  await nativeFixture(async f=>{
    const x=fixture(f),saved=prepare(f,x),q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
    queueRollAmendment(f.db,f.guild,q);f.restart();
    f.db.assignCharacter(f.session.id,x.pc.owner_user_id,x.pc.id);
    let sends=0;await assert.rejects(()=>publishRollAmendment(f.db,f.guild,q,()=>{sends++;return{messageId:'wrong-owner',channelId:'offline-dm'};}));
    assert.equal(sends,0);
  });
});

test('unarmed attack resolves the current Veil Anchor Sentinel passive Difficulty against actual NPC target',()=>nativeFixture(f=>{
  const x=fixture(f,{template:'Veil Anchor Sentinel'});f.db.changeVeilExposure(f.guild,2);
  const saved=prepare(f,x);assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref),attack=q.data.breakdown.attack;
  assert.equal(attack.target_id,x.combatant.id);assert.equal(attack.encounter_id,x.encounter.id);
  assert.equal(attack.base_difficulty,x.combatant.difficulty);assert.equal(attack.difficulty,x.combatant.difficulty+1);
  assert(attack.defense_passive?.fingerprint);
  let faces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'veil-unarmed-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>[12,8][faces++]});
  assert.equal(faces,2);assert.equal(rolled.status,'awaiting_damage');
  const damaged=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'veil-unarmed-damage',request:q.record_key,
    expected_revision:rollRevision(rolled)},{rng:()=>4});
  assert.equal(damaged.status,'resolved');
  assert.equal(typedRollProof(f.db,f.guild,damaged).difficulty,attack.difficulty);
}));

test('a character-private unarmed declaration remains private at native preparation and publication',async()=>nativeFixture(async f=>{
  const x=fixture(f,{privateScene:true}),saved=prepare(f,x);assert.equal(saved.status,'pending_pc_roll',saved.data.reason);
  const q=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  assert.equal(x.intent.visibility,'character');assert.equal(q.visibility,'character');assert.equal(q.subject_key,x.pc.id);
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,{mode:'party',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id}));
  assert.throws(()=>nativeGmNotice(f.db,f.guild,saved.record_key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  const sent=[];await publishRollAmendment(f.db,f.guild,q,(user,text,session,character)=>{
    sent.push({user,text,character});return{messageId:'private-attempt',channelId:'offline-private'};
  });
  assert.equal(sent.length,1);assert.equal(sent[0].user,x.pc.owner_user_id);assert.equal(sent[0].character,x.pc.id);
  assert(sent[0].text.includes(x.text));assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_party_publication',includeGM:true}).length,0);
}));
