/** W5 construction acceptance only. Native v4 declarations and owner choices; no tests run before phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {candidate} from './narrative-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {currentScene,recordScenePresence,recordCharacterArrival} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {setCampaignPvpMode,setPvpSafetyStop,pvpSafetyStatus} from '../src/pvp-campaign-policy.js';
import {prepareCampaignPvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack,validatePvpAttackRoll} from '../src/pvp-attacks.js';
import {rollPvpDamage,reviewPvpDamage,resolvePvpDamage,validatePvpDamageApplication} from '../src/pvp-damage.js';
import {reviewBrawlOpportunity,passBrawlOpportunity,pvpWindowDamageSources} from '../src/pvp-brawl.js';
const list=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});
const rollCount=f=>f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n;
function dice(faces){let n=0;const rng=sides=>{assert.ok(n<faces.length,'Unexpected native dice');const value=faces[n++];assert.ok(value>=1&&value<=sides);return value;};rng.count=()=>n;return rng;}
function setup(f){
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_authority:true,playable_narration:true,
    narrative_camera:true,scene_continuity:true,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party'});
  const scene=currentScene(f.db,f.guild);
  for(const pc of f.pcs){
    f.db.updateCharacterData(pc.id,d=>{d.level=1;d.proficiency=2;d.evasion=12;d.thresholds={major:7,severe:14};d.inventory=[];});
    const source=indexWorldEvent(f.db,f.guild,{key:`multiplayer-arrival:${pc.id}`,kind:'arrival',title:'Owner-established current placement',
      source_id:`player:${pc.owner_user_id}`,session_id:scene.session_id,scene:scene.key,location_key:'terminal',visibility:'party',
      details:{entity_type:'character',entity_key:pc.id,owner_user_id:pc.owner_user_id}},pc.owner_user_id);
    recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:source.event_key,location_key:'terminal',
      zone:'interior',range:'Melee',visibility:'party',accepted_by:pc.owner_user_id},'fixture-native');
  }
  setCampaignPvpMode(f.db,f.guild,'fixture-gm',{enabled:true},{gm:true,interactionId:'multiplayer-campaign-mode'});
}
function declare(f,actorIndex,targetIndex,id){
  const actor=f.pcs[actorIndex],target=f.pcs[targetIndex],text=`I punch ${target.name}.`,
    scope={mode:'party',actorUserId:actor.owner_user_id,actorCharacterId:actor.id};
  captureWorldInput(f.db,f.guild,actor.owner_user_id,actor.id,id,text);
  const result=candidate(text);result.narration='';result.gm_world_parts=[];
  result.player_intents=[{type:'interact',source_span:text,target_name:target.name,target_key:target.id,destination:'unspecified',
    operation:'unarmed_attack',utterance:'',excluded_targets:[],framing:'immediate',resolution:'roll_required',reason:'Exact current owner-authored strike.',
    native_adjudication:{trait:'Finesse',kind:'attack',difficulty:12,risk:'The strike can miss.',stakes:'Native receipts alone determine any hit or damage.',
      explanation:'SRD unarmed attack using actual target Evasion.',saved_ruling_key:'',override_refs:[],raw_refs:['srd:attack-rolls'],
      house_refs:[],homebrew_refs:[],modifier_keys:[],attack_source:'unarmed'}}];
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:actor.name,
    label:'Native multiplayer PvP declaration',meta:{messageId:id,triggerText:text}}),staged=mutation.pvpAttempts[0],
    preparation=mutation.campaignPvpPreparations[0],request=preparation?.request&&f.db.getCityRecord(f.guild,'pvp_attack_request',preparation.request);
  return {actor,target,mutation,staged,preparation,request};
}
function authorize(f,x){
  assert.ok(x.request,'A real native request is required.');
  reviewPvpAttack(f.db,f.guild,x.actor.owner_user_id,x.request.record_key);
  authorizePvpAttack(f.db,f.guild,x.actor.owner_user_id,{attack:x.request.record_key,expected_revision:x.request.data.offer_hash},
    {interactionId:`owner-authorize:${x.request.record_key}`});
}
function roll(f,x,faces){const rng=dice(faces),input={attack:x.request.record_key,expected_revision:x.request.data.offer_hash},
  receipt=rollPvpAttack(f.db,f.guild,x.actor.owner_user_id,input,{rng});assert.equal(rng.count(),2);return {input,receipt};}
function assertNative(f,x){
  assert.equal(x.staged.data.version,4);assert.equal(x.request.data.offer.authority,'native_campaign');
  assert.equal(x.request.data.offer.native_rule_basis.kind,'RAW');
  assert.deepEqual(x.request.data.offer.native_rule_basis.refs,['srd:attack-rolls']);
  const contract=f.db.getCityRecord(f.guild,'pvp_encounter_contract',x.request.data.offer.contract);
  assert.equal(contract.data.version,4);assert.deepEqual(contract.data.approvals,[]);
  for(const kind of ['pvp_agreement','pvp_consent','pvp_damage_consent'])assert.equal(list(f,kind).length,0);
}
function windowFor(f,x){const opportunity=f.db.getCityRecord(f.guild,'pvp_spotlight_opportunity',`${x.request.record_key}:opportunity`);
  return {opportunity,window:f.db.getCityRecord(f.guild,'scene_action_window',opportunity.data.window)};}

test('real native arrival producer pins campaign scene/session without rewriting its original source on retry',()=>nativeFixture(f=>{
  setup(f);const scene=currentScene(f.db,f.guild);
  for(const pc of f.pcs.slice(0,2)){
    const presence=recordCharacterArrival(f.db,f.guild,f.db.getCharacter(pc.id),pc.owner_user_id,`campaign-native-arrival:${pc.id}`),
      source=f.db.getWorldEvent(f.guild,presence.source_event);
    assert.equal(source.scene,scene.key);assert.equal(source.session_id,scene.session_id);
    assert.equal(source.source_id,`player:${pc.owner_user_id}`);assert.equal(source.kind,'arrival');
    recordCharacterArrival(f.db,f.guild,f.db.getCharacter(pc.id),pc.owner_user_id,`campaign-native-arrival:${pc.id}`);
    assert.deepEqual(f.db.getWorldEvent(f.guild,source.event_key),source);
  }
  const attack=declare(f,0,1,'native-arrivals-campaign-attack');assertNative(f,attack);
}));

test('three actual campaign participants share one source-bound target window; first native dice exclude late fourth attacker',()=>nativeFixture(f=>{
  setup(f);const initialResources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),a=declare(f,0,1,'multiplayer-A-B'),
    c=declare(f,2,1,'multiplayer-C-B');assertNative(f,a);assertNative(f,c);
  assert.notEqual(a.request.data.offer.contract,c.request.data.offer.contract);
  assert.equal(a.request.data.offer.brawl.group_ref,c.request.data.offer.brawl.group_ref);
  assert.equal(a.request.data.offer.brawl.group_hash,c.request.data.offer.brawl.group_hash);
  const wa=windowFor(f,a),wc=windowFor(f,c);assert.equal(wa.window.record_key,wc.window.record_key);
  assert.deepEqual(wa.window.data.pvp_brawl.requests,[a.request.record_key,c.request.record_key]);
  assert.equal(wa.opportunity.data.ordinal,0);assert.equal(wc.opportunity.data.ordinal,1);
  for(const x of [a,c]){
    const opp=windowFor(f,x).opportunity,event=f.db.getWorldEvent(f.guild,opp.source_event),m=f.db.getMutation(f.guild,event.source_id);
    assert.equal(event.source_kind,'mutation');assert.equal(m.mutation_type,'campaign_spotlight_reservation');
    assert.equal(m.actor_id,'campaign_pvp');assert.equal(m.visibility,'gm');authorize(f,x);
  }
  const first=roll(f,a,[2,1]);assert.equal(first.receipt.data.result.hit,false);
  assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',wa.window.record_key).status,'locked');
  const count=rollCount(f),late=declare(f,3,1,'multiplayer-late-D-B');
  assert.equal(late.preparation.status,'needs_review');assert.equal(late.request,undefined);
  assert.match(f.db.getCityRecord(f.guild,'pvp_campaign_review',late.staged.record_key).data.reason,/late|locked|target/i);
  assert.equal(rollCount(f),count);
  assert.deepEqual(f.db.getCityRecord(f.guild,'scene_action_window',wa.window.record_key).data.pvp_brawl.requests,
    [a.request.record_key,c.request.record_key]);
  const second=roll(f,c,[2,1]);assert.equal(second.receipt.data.result.hit,false);
  assert.equal(f.db.getCityRecord(f.guild,'scene_action_window',wa.window.record_key).status,'closed');
  assert.ok(list(f,'pvp_target_lock').some(lock=>lock.data.target===f.pcs[1].id&&lock.status==='released'));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),initialResources);
  f.restart();const noDice=()=>assert.fail('Saved native multiplayer roll rerolled');
  for(const [x,saved] of [[a,first],[c,second]])assert.deepEqual(rollPvpAttack(f.db,f.guild,x.actor.owner_user_id,saved.input,{rng:noDice}),saved.receipt);
}));

test('native campaign fairness counts actual owners across distinct contracts; only rightful owner may pass current opportunity',()=>nativeFixture(f=>{
  setup(f);const a=declare(f,0,1,'fair-A-B'),c=declare(f,2,1,'fair-C-B');authorize(f,a);authorize(f,c);
  roll(f,a,[2,1]);roll(f,c,[2,1]);
  const next=declare(f,0,2,'fair-second-A-C');assert.equal(next.preparation.status,'needs_review');assert.equal(next.request,undefined);
  assert.match(f.db.getCityRecord(f.guild,'pvp_campaign_review',next.staged.record_key).data.reason,/fair|peers|opportunity/i);
  const contract=a.request.data.offer.contract,owner=f.pcs[1],view=reviewBrawlOpportunity(f.db,f.guild,owner.owner_user_id,contract);
  assert.equal(view.character,owner.id);assert.equal(view.opportunities,0);assert.deepEqual(view.pending,[]);
  const input={contract,expected_revision:view.revision};
  assert.throws(()=>passBrawlOpportunity(f.db,f.guild,f.pcs[3].owner_user_id,input,{interactionId:'outsider-cannot-pass'}),/owner|affected|multiplayer/i);
  assert.throws(()=>passBrawlOpportunity(f.db,f.guild,f.pcs[0].owner_user_id,input,{interactionId:'attacker-cannot-pass-for-target'}),/review|revision|opportunity/i);
  const passed=passBrawlOpportunity(f.db,f.guild,owner.owner_user_id,input,{interactionId:'target-privately-passes'});
  assert.equal(passed.subject_key,owner.id);assert.equal(passed.visibility,'character');
  const prepared=prepareCampaignPvpAttack(f.db,f.guild,next.staged);assert.ok(prepared);
  assert.equal(prepared.data.offer.actor,f.pcs[0].id);assert.equal(prepared.data.offer.brawl.group_ref,a.request.data.offer.brawl.group_ref);
  assert.equal(rollCount(f),2);assert.equal(list(f,'pvp_spotlight_pass').length,1);
  for(const pc of f.pcs){assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);}
}));

test('two native hits against one target group actual damage once and offer one affected-owner Armor decision',()=>nativeFixture(f=>{
  setup(f);const a=declare(f,0,1,'damage-A-B'),c=declare(f,2,1,'damage-C-B');authorize(f,a);authorize(f,c);
  const ra=roll(f,a,[5,4]),rc=roll(f,c,[5,4]);assert.equal(ra.receipt.data.result.hit,true);assert.equal(rc.receipt.data.result.hit,true);
  const da=rollPvpDamage(f.db,f.guild,a.actor.owner_user_id,{attack_receipt:ra.receipt.record_key},{rng:dice([3,3])});
  assert.equal(list(f,'pvp_damage_offer').length,0,'One sibling damage roll cannot bypass the incomplete shared target window.');
  assert.throws(()=>pvpWindowDamageSources(f.db,f.guild,f.db.getCityRecord(f.guild,'pvp_attack_request',a.request.record_key)),/pending/i);
  const dc=rollPvpDamage(f.db,f.guild,c.actor.owner_user_id,{attack_receipt:rc.receipt.record_key},{rng:dice([3,3])}),
    offers=list(f,'pvp_damage_offer');assert.equal(offers.length,1);const offer=offers[0];
  assert.deepEqual(new Set(offer.data.binding.sources.map(s=>s.key)),new Set([da.record_key,dc.record_key]));
  assert.equal(offer.data.binding.native_authority,'native_campaign');assert.equal(list(f,'pvp_damage_publication').length,1);
  const target=f.pcs[1],before=f.db.getCharacter(target.id).data.resources;
  assert.equal(before.hp.current,0);assert.equal(before.armor.current,0);
  assert.throws(()=>reviewPvpDamage(f.db,f.guild,a.actor.owner_user_id,offer.record_key),/owner/i);
  const review=reviewPvpDamage(f.db,f.guild,target.owner_user_id,offer.record_key),input={damage:offer.record_key,expected_revision:review.revision,armor:true},
    effect=resolvePvpDamage(f.db,f.guild,target.owner_user_id,input,{interactionId:'single-shared-window-armor-choice'});
  assert.equal(effect.data.damage_after_resistance,12);assert.equal(effect.data.severity,2);assert.equal(effect.data.hp_marks,1);
  assert.equal(f.db.getCharacter(target.id).data.resources.armor.current,1);assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,1);
  assert.equal(list(f,'pc_effect_receipt').filter(e=>e.data.cause_type==='verified_pvp_damage').length,1);
  f.restart();const noDice=()=>assert.fail('Grouped committed damage rerolled');
  assert.deepEqual(rollPvpDamage(f.db,f.guild,a.actor.owner_user_id,{attack_receipt:ra.receipt.record_key},{rng:noDice}),da);
  assert.deepEqual(rollPvpDamage(f.db,f.guild,c.actor.owner_user_id,{attack_receipt:rc.receipt.record_key},{rng:noDice}),dc);
  assert.deepEqual(resolvePvpDamage(f.db,f.guild,target.owner_user_id,input,{interactionId:'grouped-armor-replay'}),effect);
  assert.deepEqual(validatePvpDamageApplication(f.db,f.guild,effect.record_key),effect);
  assert.equal(f.db.getCharacter(target.id).data.resources.armor.current,1);
}));

test('current target-owner safety stop cancels unfinished grouped permission without erasing a saved hit or permitting sibling dice',()=>nativeFixture(f=>{
  setup(f);const a=declare(f,0,1,'stop-A-B'),c=declare(f,2,1,'stop-C-B');authorize(f,a);authorize(f,c);
  const hit=roll(f,a,[5,4]);assert.equal(hit.receipt.data.result.hit,true);
  const target=f.pcs[1],saved=setPvpSafetyStop(f.db,f.guild,target.owner_user_id,{character_id:target.id},{interactionId:'target-stops-shared-window'});
  assert.equal(pvpSafetyStatus(f.db,f.guild,target.owner_user_id,{character_id:target.id}).stopped,true);
  for(const x of [a,c]){
    const current=f.db.getCityRecord(f.guild,'pvp_attack_request',x.request.record_key),stop=f.db.getCityRecord(f.guild,'pvp_brawl_stop_receipt',`${x.request.record_key}:stop`);
    assert.equal(current.status,'cancelled');assert.equal(stop.data.reason,'owner_safety_stop');assert.equal(stop.source_event,saved.source_event);
    assert.equal(stop.data.native_roll,x===a?hit.receipt.record_key:null);
  }
  assert.equal(list(f,'pvp_damage_offer').length,0);assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,0);
  f.restart();const noDice=dice([]);
  assert.deepEqual(validatePvpAttackRoll(f.db,f.guild,hit.receipt.record_key).receipt,hit.receipt);
  assert.deepEqual(rollPvpAttack(f.db,f.guild,a.actor.owner_user_id,hit.input,{rng:noDice}),hit.receipt);
  assert.throws(()=>rollPvpAttack(f.db,f.guild,c.actor.owner_user_id,{attack:c.request.record_key,expected_revision:c.request.data.offer_hash},{rng:noDice}),/safety|stop|cancel|eligible/i);
  assert.throws(()=>rollPvpDamage(f.db,f.guild,a.actor.owner_user_id,{attack_receipt:hit.receipt.record_key},{rng:noDice}),/safety|stop|cancel/i);
  assert.equal(noDice.count(),0);assert.equal(f.db.getCharacter(target.id).data.resources.armor.current,0);
  assert.equal(list(f,'pvp_damage_consent').length,0);assert.equal(list(f,'pvp_agreement').length,0);
}));

test('new native campaign policy revision cannot merge into an older target lock or erase the saved old-policy roll',()=>nativeFixture(f=>{
  setup(f);const a=declare(f,0,1,'revision-A-B'),c=declare(f,2,1,'revision-C-B');authorize(f,a);authorize(f,c);
  const saved=roll(f,a,[2,1]),oldWindow=windowFor(f,a).window;
  setCampaignPvpMode(f.db,f.guild,'fixture-gm',{enabled:true},{gm:true,interactionId:'explicit-policy-revision'});
  const count=rollCount(f),later=declare(f,3,1,'revision-D-B');
  assert.equal(later.preparation.status,'needs_review');assert.equal(later.request,undefined);
  assert.match(f.db.getCityRecord(f.guild,'pvp_campaign_review',later.staged.record_key).data.reason,/lock|source|sheet|review/i);
  assert.deepEqual(f.db.getCityRecord(f.guild,'scene_action_window',oldWindow.record_key).data.pvp_brawl.requests,
    [a.request.record_key,c.request.record_key]);
  f.restart();const noDice=dice([]);
  assert.deepEqual(rollPvpAttack(f.db,f.guild,a.actor.owner_user_id,saved.input,{rng:noDice}),saved.receipt);
  assert.throws(()=>rollPvpAttack(f.db,f.guild,c.actor.owner_user_id,{attack:c.request.record_key,expected_revision:c.request.data.offer_hash},
    {rng:noDice}),/mode|revis|scope|policy/i);
  assert.equal(noDice.count(),0);assert.equal(rollCount(f),count);
}));
