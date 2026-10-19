import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFixture} from './v9-fixtures.mjs';
import {attackFixture} from './v94-pvp-attack-fixtures.mjs';
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack,validatePvpAttackRoll} from '../src/pvp-attacks.js';
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage,validatePvpDamageApplication} from '../src/pvp-damage.js';
import {setCampaignPvpMode,campaignPvpPolicy,setPvpSafetyStop,assertPvpSafety} from '../src/pvp-campaign-policy.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp} from '../src/narrative-pvp.js';
import {pvpTerms} from './v9-fixtures.mjs';

async function ready(f){
  const x=await attackFixture(f),row=preparePvpAttack(f.db,f.guild,'gm',x.input,{gm:true,interactionId:'safety-attack'});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,row.record_key);
    authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{interactionId:`safety:${pc.id}`});}
  return {...x,row};
}
const deterministic=()=>{let i=0;return()=>[5,4][i++];};
async function damageOffer(f){
  const x=await ready(f),attack=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,
    {attack:x.row.record_key,expected_revision:x.row.data.offer_hash},{rng:deterministic()});
  const damage=rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:attack.record_key},{rng:()=>1});
  f.db.upsertRulesRuling(f.guild,{key:'pc-damage',createdBy:'gm',ruling:'SRD native threshold and Armor review.'});
  const offer=preparePvpDamage(f.db,f.guild,'gm',{damage_receipts:[damage.record_key],ruling:'pc-damage',
    defenses:{source:'base',resistance:'none',armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:'safety-damage'});
  reviewPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,offer.record_key);
  return {x,attack,damage,offer};
}
test('campaign PvP mode is disabled by default and only a native authenticated GM command changes it',()=>nativeFixture(async f=>{
  assert.deepEqual(campaignPvpPolicy(f.db,f.guild),{enabled:false,revision:0});
  assert.throws(()=>setCampaignPvpMode(f.db,f.guild,'gm',{enabled:true},{interactionId:'model',gm:false}),/GM|authenticated/i);
  assert.equal(campaignPvpPolicy(f.db,f.guild).enabled,false);
  setCampaignPvpMode(f.db,f.guild,'gm',{enabled:true},{interactionId:'gm-enable',gm:true});
  assert.deepEqual(campaignPvpPolicy(f.db,f.guild),{enabled:true,revision:1});
  assert.equal(f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign').record_key,'campaign');
  const x=await attackFixture(f),attack=preparePvpAttack(f.db,f.guild,'gm',x.input,{gm:true,interactionId:'mode-not-consent'});
  assert.equal(attack.status,'awaiting_players');
  setCampaignPvpMode(f.db,f.guild,'gm',{enabled:true},{interactionId:'gm-enable',gm:true});
  assert.equal(campaignPvpPolicy(f.db,f.guild).revision,1);
  const policy=f.db.getCityRecord(f.guild,'pvp_campaign_policy','campaign');
  indexWorldEvent(f.db,f.guild,{key:policy.source_event,status:'retracted'},'gm');
  assert.throws(()=>campaignPvpPolicy(f.db,f.guild),/policy|source|invalid/i);
}));
test('owner safety stop after ready attack blocks dice before RNG; absent owner can stop, proxy and wrong owner cannot',()=>nativeFixture(async f=>{
  const {row}=await ready(f),target=f.pcs[1];f.db.setPresence(f.session.id,target.owner_user_id,'absent');
  assert.throws(()=>setPvpSafetyStop(f.db,f.guild,'proxy',{character_id:target.id},{interactionId:'proxy-stop'}),/owner|actual/i);
  assert.throws(()=>setPvpSafetyStop(f.db,f.guild,f.pcs[0].owner_user_id,{character_id:target.id},{interactionId:'wrong-owner-stop'}),/owner|actual/i);
  const stop=setPvpSafetyStop(f.db,f.guild,target.owner_user_id,{character_id:target.id},{interactionId:'owner-stop'});
  assert.equal(stop.record_key,target.id);assert.equal(stop.status,'stopped');
  f.db.setPresence(f.session.id,target.owner_user_id,'present');
  f.restart();assert.doesNotThrow(()=>setPvpSafetyStop(f.db,f.guild,target.owner_user_id,{character_id:target.id},{interactionId:'stop-replay'}));
  assert.throws(()=>rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},
    {rng:()=>assert.fail('safety stop must block before RNG')}),/safety stop/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_attack_roll_receipt',includeGM:true}).length,0);
}));
test('safety stop after hit blocks new damage dice; saved attack receipt remains historically readable',()=>nativeFixture(async f=>{
  const x=await ready(f),attack=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,
    {attack:x.row.record_key,expected_revision:x.row.data.offer_hash},{rng:deterministic()});
  setPvpSafetyStop(f.db,f.guild,f.pcs[1].owner_user_id,{character_id:f.pcs[1].id},{interactionId:'stop-after-hit'});
  assert.equal(validatePvpAttackRoll(f.db,f.guild,attack.record_key).receipt.record_key,attack.record_key);
  assert.throws(()=>rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:attack.record_key},
    {rng:()=>assert.fail('stop must block continuation dice')}),/safety stop/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_damage_roll_receipt',includeGM:true}).length,0);
}));
test('safety stop after damage dice blocks HP/Armor commit; same-owner replay does not spend or mutate',()=>nativeFixture(async f=>{
  const {offer}=await damageOffer(f),pc=f.pcs[1],input={damage:offer.record_key,expected_revision:offer.data.digest,armor:true};
  const before=f.db.getCharacter(pc.id).data.resources;
  setPvpSafetyStop(f.db,f.guild,pc.owner_user_id,{character_id:pc.id},{interactionId:'stop-before-hp'});
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,pc.owner_user_id,input,{interactionId:'blocked-hp'}),/safety stop/i);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
}));
test('a stop never rolls back an already committed HP effect or invalidates its history reader/replay',()=>nativeFixture(async f=>{
  const {offer}=await damageOffer(f),pc=f.pcs[1],input={damage:offer.record_key,expected_revision:offer.data.digest,armor:false};
  const effect=resolvePvpDamage(f.db,f.guild,pc.owner_user_id,input,{interactionId:'commit-before-stop'});
  setPvpSafetyStop(f.db,f.guild,pc.owner_user_id,{character_id:pc.id},{interactionId:'stop-after-commit'});
  assert.equal(validatePvpDamageApplication(f.db,f.guild,effect.record_key).record_key,effect.record_key);
  assert.deepEqual(resolvePvpDamage(f.db,f.guild,pc.owner_user_id,input,{interactionId:'historical-replay'}),effect);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,effect.data.after.hp.current);
}));
test('duel safety stop blocks paired-strike dice after owner choices are sealed',()=>nativeFixture(f=>{
  const proposal=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  for(const pc of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,pc.owner_user_id,proposal.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:proposal.record_key,expected_revision:proposal.data.terms_hash,
      decision:'accept',interaction_id:`safety-${pc.id}`});}
  const inputFor=i=>{const view=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,proposal.record_key);
    return {proposal:proposal.record_key,expected_revision:proposal.data.terms_hash,round:view.round,
      expected_window_revision:view.window_revision,interaction_id:`safety-round-${i}`,trait:'Agility',attempt:'I try my own harmless feint.'};};
  choosePvp(f.db,f.guild,f.pcs[0].owner_user_id,inputFor(0));choosePvp(f.db,f.guild,f.pcs[1].owner_user_id,inputFor(1));
  setPvpSafetyStop(f.db,f.guild,f.pcs[0].owner_user_id,{character_id:f.pcs[0].id},{interactionId:'stop-round-before-roll'});
  const {trait,attempt,...rollInput}=inputFor(1);
  assert.throws(()=>rollPvp(f.db,f.guild,f.pcs[1].owner_user_id,rollInput,{rng:()=>assert.fail('no duel dice after stop')}),/safety stop/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_round_receipt',includeGM:true}).length,0);
}));
