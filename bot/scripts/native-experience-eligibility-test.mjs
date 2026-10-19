/** UA14: native exact structured Experience eligibility; owner retains selection and Hope spend. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFixture} from './v9-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {arbitrateRollOptions} from '../src/roll-options.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {openRollMenu,handleRollMenuInteraction} from '../src/roll-menu.js';

const request=f=>f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0];
const experiences=[{name:'Dockworker',modifier:2,applies_to:{operations:['improvise_diversion'],traits:['Finesse'],roll_kinds:['action']}}];
function eligibleRequest(f){
  const x=actionFixture(f);f.db.updateCharacterData(x.pc.id,d=>{d.experiences=structuredClone(experiences);});
  x.run();return {x,row:request(f)};
}
function options(f,row,proposed=['experience:Dockworker']){
  return arbitrateRollOptions(f.db,f.guild,row.data.owner_user_id,{request:row.record_key,proposed_keys:proposed});
}
function use(f,row,proof,key='choose-experience',extra={}){
  return contributeRoll(f.db,f.guild,row.data.owner_user_id,{op:'experience',request:row.record_key,expected_revision:rollRevision(row),
    key,experience:'Dockworker',pay_hope:true,proof,...extra});
}
const controls=payload=>payload.components.flatMap(row=>row.toJSON().components);
function component(f,user,customId,{values=[],button=false}={}){
  return {guildId:f.guild,user:{id:user},customId,values,isButton:()=>button,isStringSelectMenu:()=>!button,
    update:async payload=>{component.updated=payload;}};
}

test('UA14 exact owner Experience match receives native eligibility, but not selection, payment or a roll',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),before=f.db.getCharacter(x.pc.id).data.resources.hope,result=options(f,row),option=result.options.find(item=>item.key==='experience:Dockworker');
  assert.equal(option.state,'requires_owner_choice');assert.equal(option.source.kind,'native_experience_eligibility');assert(option.source.proof);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);assert.equal(request(f).data.experiences?.length||0,0);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,query:'Native structured Experience eligibility'}).length,1);
}));

test('UA14 real private menu selector and Confirm keep eligibility, owner choice and Hope charge separated',()=>nativeFixture(async f=>{
  const {x,row}=eligibleRequest(f),menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,row.record_key),select=controls(menu).find(control=>control.type===3);
  const option=options(f,row).options.find(item=>item.key==='experience:Dockworker');assert(option.source.proof);
  const choose=component(f,x.pc.owner_user_id,select.custom_id,{values:[select.options[0].value]});
  await handleRollMenuInteraction(f.db,choose);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  const selected=component.updated,confirm=controls(selected).find(control=>control.label==='Confirm');
  await handleRollMenuInteraction(f.db,component(f,x.pc.owner_user_id,confirm.custom_id,{button:true}));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);assert.equal(request(f).data.experiences[0].hope_spent,1);
  assert.equal(request(f).data.roll_id,undefined,'confirmation cannot perform the acting roll');
}));

test('UA14 exact proof is owner-selected/paid once; restart and saved native roll reader preserve receipt ancestry',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker');
  let amended=use(f,row,option.source.proof);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);
  assert.equal(amended.data.experiences[0].bonus,2);assert.equal(amended.data.experiences[0].hope_spent,1);
  assert.equal(use(f,row,option.source.proof).data.revision,amended.data.revision,'same owner operation is idempotent');
  assert.throws(()=>use(f,amended,option.source.proof,'second-charge'),/already invoked|request changed|closed/i);
  f.restart();amended=f.db.getCityRecord(f.guild,'roll_request',row.record_key);
  amended=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:row.record_key,expected_revision:rollRevision(amended),key:'paid-xp-roll'},
    {rng:(()=>{const faces=[8,7];return()=>faces.shift();})()});
  const proof=typedRollProof(f.db,f.guild,amended);assert.notEqual(proof.outcome,'needs_review');
  const receipt=f.db.getCityRecord(f.guild,'roll_operation',amended.data.experiences[0].operation_key);
  f.db.saveCityRecord(f.guild,{...receipt,key:receipt.record_key,data:{...receipt.data,authorization:{...receipt.data.authorization,pay_hope:false}}});
  assert.throws(()=>typedRollProof(f.db,f.guild,amended),/saved native request|result proof/i,'saved outcome reader rechecks owner authorization receipt');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2,'ordinary Hope result remains separate from the one explicit Experience charge');
}));

test('UA14 eligibility requires a complete exact operation/trait/kind mapping; unknown/free-prose applicability stays held',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f);f.db.updateCharacterData(x.pc.id,d=>{d.experiences=[
    ...experiences,{name:'Wrong trait',modifier:2,applies_to:{operations:['improvise_diversion'],traits:['Knowledge'],roll_kinds:['action']}},
      {name:'Loose',modifier:2,applies_to:{operations:['improvise_diversion'],reason:'it feels right'}},
      {name:'Missing trait',modifier:2,applies_to:{operations:['improvise_diversion'],roll_kinds:['action']}}];});
  const result=options(f,row,['experience:Dockworker','experience:Wrong trait','experience:Loose','experience:Missing trait']),byKey=new Map(result.options.map(item=>[item.key,item]));
  assert.equal(byKey.get('experience:Dockworker').state,'requires_owner_choice');
  assert(!byKey.has('experience:Wrong trait'),'a complete but mismatched trait is not eligible');
  assert.equal(byKey.get('experience:Loose').state,'requires_additional_authorization');
  assert.equal(byKey.get('experience:Missing trait').state,'requires_additional_authorization');
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,query:'Native structured Experience eligibility'}).length,1);
}));

test('UA14 changed Experience record, retracted source, wrong owner and forged label cannot pay Hope',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker');
  const before=f.db.getCharacter(x.pc.id).data.resources.hope;
  f.db.updateCharacterData(x.pc.id,d=>{d.experiences[0].modifier=3;});
  assert.throws(()=>use(f,row,option.source.proof,'changed-sheet'),/eligib|source|current/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
  f.db.updateCharacterData(x.pc.id,d=>{d.experiences=structuredClone(experiences);});
  indexWorldEvent(f.db,f.guild,{key:option.source.proof,status:'retracted'},'fixture-revoke');
  assert.throws(()=>use(f,row,option.source.proof,'retracted-proof'),/eligib|source|current/i);
  assert.throws(()=>arbitrateRollOptions(f.db,f.guild,f.pcs[1].owner_user_id,{request:row.record_key,proposed_keys:[]}),/owner|acting|owned character/i);
  assert.throws(()=>use(f,row,'owner-approved','forged-label'),/source|eligib|adjudicat/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
}));

test('UA14 changed current owner/control holds old native eligibility before Hope is spent',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),before=f.db.getCharacter(x.pc.id).data.resources.hope;
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,x.pc.id);
  assert.throws(()=>use(f,row,option.source.proof,'changed-owner'),/owner|character|eligib|source/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
}));

test('UA14 scene advance invalidates old eligibility before Hope is spent',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),before=f.db.getCharacter(x.pc.id).data.resources.hope;
  const state=f.db.getDirectorState(f.session.id);f.db.setDirectorState(f.session.id,{...state,scene_number:state.scene_number+1});
  assert.throws(()=>use(f,row,option.source.proof,'stale-scene'),/scene|source|eligib|current/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
}));

test('UA14 altered native receipt metadata is not accepted as eligibility proof',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),before=f.db.getCharacter(x.pc.id).data.resources.hope;
  const event=f.db.getWorldEvent(f.guild,option.source.proof),details={...event.details,payload_hash:'forged'};
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?')
    .run(JSON.stringify(details),f.guild,event.event_key);
  assert.throws(()=>use(f,row,option.source.proof,'tampered-receipt'),/eligib|source/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
}));

test('UA14 a player-authored copy of native eligibility metadata is not a native receipt',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),native=f.db.getWorldEvent(f.guild,option.source.proof),before=f.db.getCharacter(x.pc.id).data.resources.hope;
  const forged=indexWorldEvent(f.db,f.guild,{key:'owner-copied-experience-proof',kind:'native_experience_eligibility',title:'Copied eligibility',
    source_kind:'event',source_id:row.source_event,session_id:row.data.session_id,scene:row.data.scene,visibility:'character',subject_key:x.pc.id,
    details:native.details},x.pc.owner_user_id);
  assert.throws(()=>use(f,row,forged.event_key,'owner-copied-proof'),/eligib|source|adjudicat/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before);
}));

test('UA14 owner refusal and insufficient Hope reject a valid native proof without charging',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),before=f.db.getCharacter(x.pc.id).data.resources.hope;
  assert.throws(()=>use(f,row,option.source.proof,'declined-choice',{pay_hope:false}),/explicit|Hope|authorization/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,before,'declining the explicit charge leaves Hope untouched');
  f.db.updateCharacterData(x.pc.id,d=>{d.resources.hope=0;});
  assert.throws(()=>use(f,row,option.source.proof,'no-hope'),/Hope|resource/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,0,'an unaffordable explicit choice cannot charge or go negative');
  assert.equal(request(f).data.experiences?.length||0,0,'failed choices leave no Experience contribution');
}));

test('UA14 pre-RNG rechecks the exact Experience sheet after an owner already paid',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f),option=options(f,row).options.find(item=>item.key==='experience:Dockworker'),amended=use(f,row,option.source.proof);
  f.db.updateCharacterData(x.pc.id,d=>{d.experiences[0].modifier=3;});
  let rngCalls=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:row.record_key,
    expected_revision:rollRevision(amended),key:'stale-experience-roll'},{rng:()=>{rngCalls++;return 6;}}),/Experience|eligib|source/i);
  assert.equal(rngCalls,0,'stale eligibility is rejected before any die is generated');
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1,'a later stale-sheet hold does not invent a refund');
  assert.equal(f.db.db.prepare('SELECT COUNT(*) AS count FROM rolls WHERE guild_id=?').get(f.guild).count,0,
    'no saved native roll exists when pre-RNG validation rejects');
}));

test('UA14 source retraction before option discovery produces no native eligibility receipt',()=>nativeFixture(f=>{
  const {x,row}=eligibleRequest(f);indexWorldEvent(f.db,f.guild,{key:row.source_event,status:'retracted'},'fixture-revoke');
  assert.throws(()=>options(f,row),/source|consent|owner|stale/i);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,query:'Native structured Experience eligibility'}).length,0);
}));
