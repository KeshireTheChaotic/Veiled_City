/** ROLL01–04: ordinary discretionary attempts retain private terms and native owner-controlled results. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {actionFixture} from "./v96-action-fixture.mjs";
import {openRollMenu} from "../src/roll-menu.js";
import {publishRollRequests} from "../src/roll-requests.js";
import {contributeRoll,adjudicateRollSource} from "../src/roll-collaboration.js";
import {rollRevision,queueRollAmendment} from "../src/roll-requests.js";
import {handleRollMenuInteraction} from "../src/roll-menu.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {deliverTurnOutbox} from "../src/publication-outbox.js";

const request=f=>f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true})[0];
const details=p=>p.files[0].attachment.toString();

test("ROLL01 actual owner-private menu discloses verified stakes and derivation before any dice",()=>nativeFixture(f=>{
  const x=actionFixture(f);x.run();const q=request(f),before=f.db.getCharacter(x.pc.id).data.resources;
  const payload=openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key),text=details(payload);
  assert.match(text,/Difficulty: 15/);assert(text.includes(x.ruling.stakes));
  assert(text.includes(x.ruling.risk));assert(text.includes(x.ruling.difficulty_reason));
  assert.match(text,/Finesse/);assert.equal(payload.ephemeral,true);assert(payload.content.length<=2000);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(request(f).data.roll_id,undefined);
  assert.throws(()=>openRollMenu(f.db,f.guild,f.pcs[1].owner_user_id,q.record_key),/owned|owner/);
}));

test("ROLL01 production post-turn sender includes the GM ruling request exactly once, owner only",()=>nativeFixture(async f=>{
  const x=actionFixture(f),mutation=x.run(),sent=[];
  const send=async(user,text)=>{sent.push({user,text});return {messageId:"native-request",channelId:"owner-dm"};};
  await publishRollRequests(f.db,f.guild,mutation,send);
  assert(sent.length>0);assert(sent.every(s=>s.user===x.pc.owner_user_id));
  assert(sent.map(s=>s.text).join("\n").includes(x.ruling.stakes));
  const count=sent.length;f.restart();await publishRollRequests(f.db,f.guild,mutation,send);assert.equal(sent.length,count);
}));

const controls=p=>p.components.flatMap(row=>row.toJSON().components);
const interaction=(f,x,id,values)=>({guildId:f.guild,user:{id:x.pc.owner_user_id},customId:id,values,
  update:async()=>{}});
const roll=(f,q,key,rng)=>contributeRoll(f.db,f.guild,q.data.owner_user_id,{op:"roll",request:q.record_key,
  expected_revision:rollRevision(q),key},{rng});

test("ROLL01/02 reviewed private Experience is previewed, explicitly paid once, then one saved Critical",()=>nativeFixture(async f=>{
  const x=actionFixture(f);
  f.db.updateCharacterData(x.pc.id,d=>{d.experiences=[{name:"Private Dockworker",modifier:2,
    applies_to:{operations:["improvise_diversion"],traits:["Finesse"],roll_kinds:["action"]}}];});
  x.run();let q=request(f);
  f.db.upsertRulesRuling(f.guild,{key:"cart-experience",question:"Dockworker applicability",
    ruling:"Dock work applies to this cart attempt.",createdBy:"fixture-gm"});
  adjudicateRollSource(f.db,f.guild,{key:"native-xp-review",character_id:x.pc.id,kind:"participation",ruling_key:"cart-experience",
    data:{request:q.record_key,character_id:x.pc.id,kind:"experience",experience:"Private Dockworker",
      description:"Dock work applies to the cart."}},"fixture-gm");
  const payload=openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key);
  assert.match(details(payload),/Private Dockworker.*1 Hope/);
  const select=controls(payload).find(c=>c.type===3);
  await handleRollMenuInteraction(f.db,interaction(f,x,select.custom_id,["o0"]));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  const confirm=controls(payload).find(c=>c.label==="Confirm");
  await handleRollMenuInteraction(f.db,interaction(f,x,confirm.custom_id));
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,1);assert.equal(request(f).data.roll_id,undefined);
  await assert.rejects(()=>handleRollMenuInteraction(f.db,interaction(f,x,confirm.custom_id)),/used|closed/);
  q=request(f);const menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key),button=controls(menu).find(c=>c.label==="Roll now");
  let calls=0;await handleRollMenuInteraction(f.db,interaction(f,x,button.custom_id),{rng:()=>{calls++;return 12;}});
  q=request(f);assert.equal(calls,2);assert.equal(q.data.result.duality,"Critical");assert.equal(q.data.result.total,29);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,1,"ordinary action Critical retains SRD Stress clear");
  const receipt=f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true})[0];
  assert.equal(receipt.visibility,"character");assert.equal(receipt.subject_key,x.pc.id);assert.deepEqual(receipt.data.state_mutations,[]);
  const saved=structuredClone(q),resources=f.db.getCharacter(x.pc.id).data.resources;f.restart();
  assert.deepEqual(roll(f,saved,`menu-${button.custom_id.split(":")[1]}-roll`,()=>assert.fail("replay RNG")),saved);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
}));

test("ROLL02/03 high ordinary Fear total authorizes no access, custody, HP, NPC response or new ability",()=>nativeFixture(f=>{
  const x=actionFixture(f);x.run();const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data),fear=f.db.getCampaign(f.guild).fear;
  const faces=[11,12];const q=roll(f,request(f),"native-fear",()=>faces.shift());
  assert.equal(q.data.result.duality,"Fear");assert(q.data.result.total>=15);
  assert.equal(f.db.getCampaign(f.guild).fear,fear+1,"ordinary action Fear remains ordinary campaign Fear");
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);
  const receipt=f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true})[0];
  assert.deepEqual(receipt.data.state_mutations,[]);assert.deepEqual(receipt.data.native_roll_refs,[q.data.roll_id]);
  assert.equal(receipt.data.outcome,"success");
}));

test("ROLL03 unsupported Shadow Tell and damage cannot invoke even natural 12+12",()=>nativeFixture(f=>{
  const x=actionFixture(f,"I send my shadow through the locked door and scout.");
  Object.assign(x.ruling,{capability:{kind:"special",ref:"Shadow Tell"},effect_class:"special"});x.run();
  assert.equal(request(f),undefined);const before=f.db.getCharacter(x.pc.id).data;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:"missing-native-request",
    expected_revision:"forged",key:"natural-critical"},{rng:()=>assert.fail("unsupported RNG")}),/request|owned/i);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,0);
}));

test("ROLL01 revoked grounding holds deferred private delivery after restart without mechanics",()=>nativeFixture(async f=>{
  const x=actionFixture(f,"I attempt a private diversion.",{privateScene:true});x.run();const q=request(f);
  const notice=queueRollAmendment(f.db,f.guild,q)[0],before=f.db.getCharacter(x.pc.id).data;
  indexWorldEvent(f.db,f.guild,{key:x.evidence.event_key,status:"retracted"},"fixture-gm");f.restart();
  let sends=0;
  await deliverTurnOutbox(f.db,f.guild,notice.data.turn_id,async()=>{sends++;return {messageId:"unsafe",channelId:"dm"};});
  assert.equal(sends,0);assert(f.db.listTurnPublications(f.guild,notice.data.turn_id).every(p=>p.status!=="delivered"));
  assert.throws(()=>openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key),/context|evidence/);
  assert.throws(()=>roll(f,q,"stale-roll",()=>assert.fail("stale RNG")),/context|evidence/);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
}));

test("ROLL01 alternate trait remains owner-selected and requires an actual native reviewed proof",()=>nativeFixture(f=>{
  const x=actionFixture(f);x.run();let q=request(f);
  const operation=proof=>({op:"alternate-trait",request:q.record_key,expected_revision:rollRevision(q),key:"alternate",
    trait:"Instinct",proof});
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,operation("model-approved")),/source|adjudicat/);
  f.db.upsertRulesRuling(f.guild,{key:"cart-instinct",question:"Read cart by instinct",
    ruling:"This attempt permits Instinct as a costless alternative.",createdBy:"fixture-gm"});
  const proof=adjudicateRollSource(f.db,f.guild,{key:"native-alternate",character_id:x.pc.id,kind:"alternate_trait",ruling_key:"cart-instinct",
    data:{request:q.record_key,from_trait:"Finesse",to_trait:"Instinct",reason:"Read the cart by feel."}},"fixture-gm");
  const menu=openRollMenu(f.db,f.guild,x.pc.owner_user_id,q.record_key);assert.match(details(menu),/Instinct.*no resource cost/);
  assert.equal(request(f).data.breakdown.trait,"Finesse","candidate is not a selection");
  q=contributeRoll(f.db,f.guild,x.pc.owner_user_id,operation(proof.event_key));
  assert.equal(q.data.breakdown.trait,"Instinct");assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  const faces=[8,7];q=roll(f,q,"alternate-roll",()=>faces.shift());assert.equal(q.data.result.total,16);
  assert.equal(q.data.result.duality,"Hope");assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,3);
}));
