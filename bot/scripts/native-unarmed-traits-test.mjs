/** Native unarmed optional owner choice stays within its exact Strength/Finesse rule. */
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
import {openRollMenu,handleRollMenuInteraction} from '../src/roll-menu.js';
import {rollRevision} from '../src/roll-requests.js';
import {discoverRollOptions} from '../src/roll-options.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {typedRollProof} from '../src/typed-roll-proof.js';

function fixture(f,{trait='Strength'}={}){
  const x=setup(f,{text:'I punch the guard.'}),scene=currentScene(f.db,f.guild),npc='guard';
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true,
    narrative_encounters:true}});
  f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:'Guard'});
  f.db.setSimulationEntity(f.guild,'npc',npc,{name:'Guard',location_key:'terminal',visibility:'party'});
  const source=indexWorldEvent(f.db,f.guild,{key:'unarmed-trait-guard-source',kind:'observation',source_id:'gm',title:'Guard is present',
    session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:npc,source_event:source.event_key,location_key:'terminal',zone:'interior',
    range:'Melee',visibility:'party',accepted_by:'gm'},'gm');
  const library=new EncounterLibrary('../content'),encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,
    base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),combatant=f.db.initializeCombatants(encounter.id,
      buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,
    data:{combatants:[{actor:npc,id:combatant.id}]}});
  const intent=persistPlayerIntents(f.db,f.guild,[{type:'interact',source_span:x.text,target_name:'guard',target_key:npc,destination:'unspecified',
    operation:'unarmed_attack',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:'Attempt an ordinary unarmed strike.'}],
    x.scope,{messageId:x.messageId})[0];
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[intent],[]);
  const entry=board.data.entries[0],decision={intent_ref:entry.intent_ref,disposition:'request_pc_action_roll',rule_basis_refs:['srd:attack-rolls'],
    difficulty:null,trait,stakes_kind:'native_attack',stakes:'The punch may miss; no damage or target change is assumed.',
    reason:'A source-backed ordinary unarmed attack.',difficulty_reason:'Use the active NPC combatant Difficulty.',feature_ref:'unarmed_attack',
    experience_ref:'',advantage:false,disadvantage:false};
  const [saved]=adjudicateSceneBoard(f.db,f.guild,origin,board,[decision],{library}),request=f.db.getCityRecord(f.guild,'roll_request',saved.data.native.roll_request_ref);
  return {...x,intent,origin,board,library,combatant,encounter,saved,request};
}

function menuInteraction(guild,user,customId,{values=[]}={}){
  return {guildId:guild,user:{id:user},customId,values,isButton:()=>customId.includes(':b:'),isStringSelectMenu:()=>customId.includes(':s:'),
    isChatInputCommand:()=>false,updated:null,update(payload){this.updated=payload;return Promise.resolve(payload);}};
}
const controls=payload=>payload.components.map(row=>row.toJSON()).flatMap(row=>row.components);

test('native private unarmed roll menu offers the other fixed trait as an owner choice without a GM ruling',()=>nativeFixture(f=>{
  const x=fixture(f),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.request.record_key),registry=discoverRollOptions(f.db,f.guild,x.pc.owner_user_id,x.request.record_key);
  assert(menu.content.includes('Private Daggerheart roll menu'));
  const alternate=registry.options.find(item=>item.type==='alternate_trait'&&item.effect?.trait==='Finesse');
  assert(alternate,'native unarmed eligibility should expose the fixed alternate trait without a human roll ruling');
  assert.equal(alternate.state,'requires_owner_choice');assert.equal(alternate.effect.amount,x.pc.data.traits.Finesse);
  assert.equal(alternate.source.kind,'native_unarmed_attack');assert.equal(alternate.source.event,x.request.data.input.attack_source);
  assert.equal(alternate.source.ruling_key,undefined,'native eligibility is not a fabricated GM ruling');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
  assert.equal(x.request.status,'pending');assert.equal(x.request.data.breakdown.trait,'Strength');
  assert.equal(rollRevision(x.request),rollRevision(f.db.getCityRecord(f.guild,'roll_request',x.request.record_key)));
}));

test('Finesse-prepared unarmed attack offers only its exact Strength alternative',()=>nativeFixture(f=>{
  const x=fixture(f,{trait:'Finesse'}),alternate=discoverRollOptions(f.db,f.guild,x.pc.owner_user_id,x.request.record_key)
    .options.find(item=>item.type==='alternate_trait');
  assert.equal(x.request.data.breakdown.trait,'Finesse');assert.equal(alternate?.effect?.trait,'Strength');
  assert.equal(alternate?.effect?.amount,x.pc.data.traits.Strength);assert.equal(alternate?.source?.event,x.request.data.input.attack_source);
  let calls=0;assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'alternate-trait',key:'arbitrary-trait',request:x.request.record_key,
    expected_revision:rollRevision(x.request),trait:'Agility',proof:alternate.source.event},{rng:()=>{calls++;return 12;}}));
  assert.equal(calls,0);assert.equal(f.db.getCityRecord(f.guild,'roll_request',x.request.record_key).data.breakdown.trait,'Finesse');
}));

test('owner explicitly switches to Finesse, then rolls, damages, and replays native proof once',()=>nativeFixture(f=>{
  const x=fixture(f),originalSource=x.request.data.input.attack_source,sourceBefore=f.db.getWorldEvent(f.guild,originalSource),
    mutationBefore=f.db.getMutation(f.guild,sourceBefore.source_id),hope=x.pc.data.resources.hope,
    opened=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.request.record_key),select=controls(opened).find(item=>item.type===3),
    altValue=select.options.find(item=>item.label==='Finesse')?.value;
  assert(altValue,'the fixed alternate is privately selectable');
  const selected=menuInteraction(f.guild,x.pc.owner_user_id,select.custom_id,{values:[altValue]});
  return handleRollMenuInteraction(f.db,selected).then(async()=>{
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,hope,'selection preview spends nothing');
    const confirm=controls(selected.updated).find(item=>item.label==='Confirm');assert(confirm&&!confirm.disabled);
    let selectionRng=0;await handleRollMenuInteraction(f.db,menuInteraction(f.guild,x.pc.owner_user_id,confirm.custom_id),
      {rng:()=>{selectionRng++;return 1;}});
    assert.equal(selectionRng,0,'trait choice never draws dice');
    const q=f.db.getCityRecord(f.guild,'roll_request',x.request.record_key);
    assert.deepEqual(f.db.getWorldEvent(f.guild,originalSource),sourceBefore,'owner trait choice must not rewrite the v1 native attack event');
    assert.deepEqual(f.db.getMutation(f.guild,sourceBefore.source_id),mutationBefore,'owner trait choice must not rewrite its native mutation');
    assert.equal(q.data.input.trait,'Finesse');assert.equal(q.data.breakdown.trait,'Finesse');
    assert.equal(q.data.breakdown.trait_bonus,x.pc.data.traits.Finesse);assert.equal(q.data.input.attack_source,originalSource);
    assert.equal(q.data.breakdown.attack.target_id,x.combatant.id);assert.equal(q.data.breakdown.attack.damage,`${x.pc.data.proficiency}d4`);
    assert.equal(q.data.alternate_trait.to_trait,'Finesse');assert.equal(q.data.alternate_trait.operation_key,q.data.input.native_unarmed_trait_operation);
    assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,hope);
    assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
    const receipt=f.db.getCityRecord(f.guild,'roll_operation',q.data.alternate_trait.operation_key);
    assert.equal(receipt.data.op,'alternate-trait');assert.equal(receipt.data.authorization.trait,'Finesse');
    assert.equal(receipt.data.authorization.proof,originalSource);assert.equal(receipt.data.user,x.pc.owner_user_id);
    const ownerDelta=receipt.data.resource_deltas.find(delta=>delta.character===x.pc.id);
    assert.equal(ownerDelta.hope.delta,0);assert.equal(ownerDelta.stress.delta,0);
    f.restart();
    const pending=f.db.getCityRecord(f.guild,'roll_request',q.record_key),afterRestart=discoverRollOptions(f.db,f.guild,x.pc.owner_user_id,q.record_key);
    assert(!afterRestart.options.some(item=>item.type==='alternate_trait'),'only one trait switch is permitted');
    let rollFaces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'trait-choice-roll',request:q.record_key,
      expected_revision:rollRevision(pending)},{rng:()=>[12,12][rollFaces++]});
    assert.equal(rollFaces,2);assert.equal(rolled.status,'awaiting_damage');
    let damageFaces=0;const damaged=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'trait-choice-damage',request:q.record_key,
      expected_revision:rollRevision(rolled)},{rng:()=>{damageFaces++;return 4;}});
    assert.equal(damageFaces,x.pc.data.proficiency);assert.equal(damaged.status,'resolved');
    const proof=typedRollProof(f.db,f.guild,damaged);assert.equal(proof.outcome,'success');
    assert.equal(proof.request.data.input.attack_source,originalSource);assert.equal(proof.request.data.input.trait,'Finesse');
    const hp=f.db.listCombatants(x.encounter.id).find(item=>item.id===x.combatant.id).hp_current;
    assert(hp<x.combatant.hp_current);assert.equal(damaged.data.damage_result.after,hp);
    f.restart();assert.deepEqual(typedRollProof(f.db,f.guild,f.db.getCityRecord(f.guild,'roll_request',q.record_key)),proof);
    let replayCalls=0;contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'damage',key:'trait-choice-damage',request:q.record_key,
      expected_revision:rollRevision(rolled)},{rng:()=>{replayCalls++;return 1;}});
    assert.equal(replayCalls,0);assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,2);
    assert.equal(f.db.listCombatants(x.encounter.id).find(item=>item.id===x.combatant.id).hp_current,hp);
  });
}));

test('wrong owner cannot use the native trait option or reach RNG',()=>nativeFixture(f=>{
  const x=fixture(f),alt=discoverRollOptions(f.db,f.guild,x.pc.owner_user_id,x.request.record_key).options.find(item=>item.type==='alternate_trait');
  assert(alt);let calls=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,f.pcs[1].owner_user_id,{op:'alternate-trait',key:'wrong-owner-trait',request:x.request.record_key,
    expected_revision:rollRevision(x.request),trait:alt.effect.trait,proof:alt.source.event},{rng:()=>{calls++;return 12;}}));
  assert.equal(calls,0);assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
  assert.equal(f.db.getCityRecord(f.guild,'roll_request',x.request.record_key).data.breakdown.trait,'Strength');
}));

test('stale owner principal blocks a previously selected private menu before dice',async()=>nativeFixture(async f=>{
  const x=fixture(f),opened=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.request.record_key),select=controls(opened).find(item=>item.type===3),
    value=select.options.find(item=>item.label==='Finesse').value,selected=menuInteraction(f.guild,x.pc.owner_user_id,select.custom_id,{values:[value]});
  await handleRollMenuInteraction(f.db,selected);const confirm=controls(selected.updated).find(item=>item.label==='Confirm');
  f.db.assignCharacter(f.session.id,x.pc.owner_user_id,f.pcs[1].id);
  let calls=0;await assert.rejects(()=>handleRollMenuInteraction(f.db,menuInteraction(f.guild,x.pc.owner_user_id,confirm.custom_id),
    {rng:()=>{calls++;return 12;}}));
  assert.equal(calls,0);assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
}));

test('target leaving Melee after owner choice blocks the actual roll before RNG',async()=>nativeFixture(async f=>{
  const x=fixture(f),opened=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.request.record_key),select=controls(opened).find(item=>item.type===3),
    value=select.options.find(item=>item.label==='Finesse').value,selected=menuInteraction(f.guild,x.pc.owner_user_id,select.custom_id,{values:[value]});
  await handleRollMenuInteraction(f.db,selected);const confirm=controls(selected.updated).find(item=>item.label==='Confirm');
  await handleRollMenuInteraction(f.db,menuInteraction(f.guild,x.pc.owner_user_id,confirm.custom_id));
  const source=indexWorldEvent(f.db,f.guild,{key:'moved-guard-after-trait-choice',kind:'observation',source_id:'gm',title:'Guard left the interior',
    session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'far',range:'Far',
    visibility:'party',accepted_by:'gm'});
  const q=f.db.getCityRecord(f.guild,'roll_request',x.request.record_key);let calls=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'out-of-range-trait-roll',request:q.record_key,
    expected_revision:rollRevision(q)},{rng:()=>{calls++;return 12;}}));
  assert.equal(calls,0);assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
}));

test('revoked source, stale revision, changed range, and tampered option cannot authorize a trait switch',async()=>{
  for(const mode of ['source','revision','range','tamper'])await nativeFixture(async f=>{
    const x=fixture(f),alt=discoverRollOptions(f.db,f.guild,x.pc.owner_user_id,x.request.record_key).options.find(item=>item.type==='alternate_trait');
    assert(alt,mode);let calls=0;
    if(mode==='tamper'){
      const menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,x.request.record_key),select=controls(menu).find(item=>item.type===3),value=select.options.find(item=>item.label===alt.effect.trait).value,
        registry=f.db.getCityRecord(f.guild,'roll_option_registry',x.request.record_key);
      f.db.saveCityRecord(f.guild,{...registry,key:registry.record_key,data:{...registry.data,options:registry.data.options.map(item=>item.key===alt.key?{...item,effect:{...item.effect,trait:'Agility'}}:item)}});
      await assert.rejects(()=>handleRollMenuInteraction(f.db,menuInteraction(f.guild,x.pc.owner_user_id,select.custom_id,{values:[value]})),/registry|changed/i);
      assert.equal(f.db.getCityRecord(f.guild,'roll_request',x.request.record_key).data.breakdown.trait,'Strength');return;
    }
    if(mode==='source')f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,alt.source.event);
    if(mode==='revision')f.db.saveCityRecord(f.guild,{...x.request,key:x.request.record_key,data:{...x.request.data,revision:x.request.data.revision+1}});
    if(mode==='range'){
      const source=indexWorldEvent(f.db,f.guild,{key:`${mode}-guard-source`,kind:'observation',source_id:'gm',title:'Guard is now out of reach',
        session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
      recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'far',range:'Far',
        visibility:'party',accepted_by:'gm'});
    }
    const current=f.db.getCityRecord(f.guild,'roll_request',x.request.record_key);
    assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'alternate-trait',key:`invalid-${mode}`,request:x.request.record_key,
      expected_revision:mode==='revision'?rollRevision(x.request):rollRevision(current),trait:alt.effect.trait,proof:alt.source.event},{rng:()=>{calls++;return 12;}}),undefined,mode);
    assert.equal(calls,0,mode);assert.equal(f.db.db.prepare('SELECT count(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0,mode);
  });
});
