/** Real native collaboration, resource costs, dice, owner selection and recovery; synthetic fixtures never call providers. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene, recordScenePresence } from "../src/scene-continuity.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest, rollRevision, formatRollRequest } from "../src/roll-requests.js";
import { contributeRoll, adjudicateRollSource } from "../src/roll-collaboration.js";
import { dualityRoll } from "../src/dice.js";
import { routeRollMessage } from "../src/roll-language.js";
import { configureDelegation, dispatchAiIntents, reviewAiIntent, stateRevision } from "../src/ai-intents.js";
import { validateNarrativeClaims, materialParaphrases } from "../src/narrative-integrity.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy2-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="collaboration";db.ensureCampaign(guild);const session=db.startSession(guild,"Lab");
  configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true,scene_continuity:true});
  db.upsertRulesRuling(guild,{key:"test",ruling:"Synthetic GM-adjudicated mundane task feasibility and plain weapon; no exceptional features.",createdBy:"gm"});
  db.setSimulationEntity(guild,"location","room",{});
  indexWorldEvent(db,guild,{key:"scene",kind:"arrival",source_id:"gm",title:"Lab",location_key:"room",visibility:"party"});
  const pcs={};for(const [user,bonus] of [["actor",2],["helper",1],["second",-1],["third",0]]){
    db.upsertPlayer(guild,user,user);const pc=db.createCharacter(guild,user,user,{traits:{Knowledge:bonus},resources:{hope:6},experiences:[{name:"Technician",modifier:2}],inventory:["Plain tool"]});
    pcs[user]=pc;db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");
    recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,location_key:"room",source_event:"scene",accepted_by:user,visibility:"party"},"gm");
  }
  let serial=0;
  const request=(user="actor",kind="action",extra={})=>{
    const source=captureDeclaration(db,guild,user,pcs[user].id,`declaration-${++serial}`,"I try examining the terminal.");
    return prepareRollRequest(db,guild,{source_event:source.event_key,character_id:pcs[user].id,trait:"Knowledge",kind,
      modifier_keys:[],difficulty_source:"",adjudication:"Consequential uncertain task",...extra},"gm");
  };
  const get=row=>db.getCityRecord(guild,"roll_request",row.record_key);
  const proof=(row,user,kind,description="I steady the terminal.",extra={})=>{
    const source=adjudicateRollSource(db,guild,{key:`proof-${++serial}`,character_id:pcs[user].id,kind:"participation",ruling_key:"test",
      data:{request:row.record_key,character_id:pcs[user].id,kind,description,...extra}},"gm");return {proof:source.event_key,description};
  };
  const operate=(row,user,op,extra={},values=[])=>contributeRoll(db,guild,user,{key:`operation-${++serial}`,request:row.record_key,
    expected_revision:rollRevision(get(row)),op,...extra},{rng:sides=>{const value=values.shift();assert(value!==undefined,`Unexpected d${sides}`);return value;}});
  const one=request();const helpInput={key:"help-once",request:one.record_key,expected_revision:rollRevision(one),op:"help",pay_hope:true,...proof(one,"helper","help")};
  const first=contributeRoll(db,guild,"helper",helpInput,{rng:()=>3});assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,5);
  contributeRoll(db,guild,"helper",helpInput,{rng:()=>assert.fail("Replay drew dice")});assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,5);
  assert(formatRollRequest(first,{user:"helper"}).includes("d6 3"));
  assert.throws(()=>contributeRoll(db,guild,"second",{...helpInput,key:"stale"}),/changed/);
  operate(one,"second","help",{pay_hope:true,...proof(one,"second","help")},[5]);
  const resolved=operate(one,"actor","roll",{},[10,4]);assert.equal(resolved.data.result.total,21,"highest helper die, never sum");
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,6);assert.equal(db.getCharacter(pcs.second.id).data.resources.hope,5);
  assert.throws(()=>operate(one,"third","help",{pay_hope:true,...proof(one,"third","help")},[6]),/closed/);
  const xp=request();operate(xp,"actor","experience",{experience:"Technician",pay_hope:true,...proof(xp,"actor","experience","I use my training.",{experience:"Technician"})});
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,5);assert(formatRollRequest(get(xp)).includes("Subtotal: +4"));
  assert.throws(()=>operate(xp,"helper","experience",{experience:"Technician",pay_hope:true}),/acting owner/);
  const reaction=request("third","reaction"),fearBefore=db.getCampaign(guild).fear;
  operate(reaction,"third","roll",{},[1,12]);assert.equal(db.getCampaign(guild).fear,fearBefore);
  const parent=request(),partner=request("helper");
  operate(parent,"actor","tag",{partner_request:partner.record_key,pay_hope:true,...proof(parent,"actor","tag")});
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,5,"proposal does not spend before actual other owner agrees");
  assert.throws(()=>operate(parent,"second","participate",proof(parent,"second","participate")),/changed/);
  operate(parent,"helper","participate",proof(parent,"helper","participate"));assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,2);
  assert.equal(get(partner).status,"superseded");
  operate(parent,"actor","roll",{},[3,11]);operate(parent,"helper","roll",{},[9,2]);
  assert.equal(db.getCampaign(guild).fear,fearBefore,"discarded Fear result causes no metacurrency effect");
  const chosen=get(parent).data.tag.participants.find(item=>item.user==="helper").roll_id;
  operate(parent,"actor","select",{roll_id:chosen});assert.equal(get(parent).status,"awaiting_selection");
  operate(parent,"helper","select",{roll_id:chosen});assert.equal(get(parent).status,"resolved");
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,3);assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,6);
  const repeat=request(),repeatPartner=request("third");assert.throws(()=>operate(repeat,"actor","tag",{
    partner_request:repeatPartner.record_key,pay_hope:true,...proof(repeat,"actor","tag")}),/already initiated/);
  // An earlier initiator can participate in somebody else's Tag Team.
  const secondParent=request("third");operate(secondParent,"third","tag",{partner_request:repeat.record_key,pay_hope:true,...proof(secondParent,"third","tag")});
  operate(secondParent,"actor","participate",proof(secondParent,"actor","participate"));
  operate(secondParent,"third","roll",{},[1,12]);operate(secondParent,"actor","roll",{},[12,1]);
  const selectedFear=get(secondParent).data.tag.participants[0].roll_id;
  operate(secondParent,"third","select",{roll_id:selectedFear});operate(secondParent,"actor","select",{roll_id:selectedFear});
  assert.equal(db.getCampaign(guild).fear,fearBefore+2);
  const ordinary=dualityRoll({advantage:3,disadvantage:1},()=>2);assert.equal(ordinary.adv_dice.length,1);
  const cancelled=dualityRoll({advantage:2,disadvantage:2},()=>2);assert.equal(cancelled.adv_dice.length,0);
  assert.throws(()=>dualityRoll({disadvantage:1,helperDice:[3]},()=>assert.fail()),/saved GM ruling/);
  const encounter=db.createEncounter(guild,session.id,{status:"active",tier:1,pc_count:4,base_bp:12,budget_bp:12});
  const target=db.initializeCombatants(encounter.id,[{base_name:"Training target",display_name:"Training target",role:"Standard",tier:1,
    difficulty:10,major_threshold:5,severe_threshold:10,hp_max:10}])[0];
  const attack=(user,type)=>{
    const source=adjudicateRollSource(db,guild,{key:`attack-${++serial}`,character_id:pcs[user].id,kind:"attack",ruling_key:"test",
      data:{trait:"Knowledge",active:true,weapon:"Plain tool",damage:"1d6+1",damage_type:type,target_id:target.id}},"gm");
    return request(user,"attack",{attack_source:source.event_key});
  };
  const a1=attack("helper","physical"),a2=attack("second","magic");
  operate(a1,"helper","tag",{partner_request:a2.record_key,pay_hope:true,...proof(a1,"helper","tag")});
  operate(a1,"second","participate",proof(a1,"second","participate"));
  operate(a1,"helper","roll",{},[12,3]);operate(a1,"second","roll",{},[2,11]);
  const attackChoice=get(a1).data.tag.participants[0].roll_id;
  operate(a1,"helper","select",{roll_id:attackChoice});operate(a1,"second","select",{roll_id:attackChoice});
  assert.equal(get(a1).status,"awaiting_damage");
  operate(a1,"helper","damage",{},[3]);operate(a1,"second","damage",{},[4]);
  assert.equal(get(a1).status,"awaiting_damage_type");assert.equal(db.listCombatants(encounter.id)[0].hp_current,10);
  operate(a1,"helper","damage-type",{damage_type:"magic"});operate(a1,"second","damage-type",{damage_type:"magic"});
  assert.equal(get(a1).data.damage_result.total,9);assert.equal(get(a1).data.damage_result.source_count,1);
  assert.equal(db.listCombatants(encounter.id)[0].hp_current,8,"combined native threshold check once, not one per attack");
  assert.equal(Object.values(db.getEncounter(encounter.id).combat_state.spotlight.counts).reduce((sum,n)=>sum+n,0),1);
  configureCityFlags(db,guild,{natural_language:true});
  const natural=request("helper"),outputs=[],message={guild:{id:guild},author:{id:"actor"},id:"natural-help",content:"I spend 1 Hope to help helper by steadying the terminal."};
  const beforeNatural=db.getCharacter(pcs.actor.id).data.resources.hope;
  assert.equal(await routeRollMessage({db,message,characterId:pcs.actor.id,deliver:async text=>outputs.push(text)}),false);
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,beforeNatural,"capture does not charge before feasibility review");
  const declaration=db.listWorldEvents(guild,{includeGM:true,limit:100}).find(row=>row.kind==="roll_contribution");assert(declaration);
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["roll.adjudicate"],max_operations:1,max_cost:0,expires_minute:100},"gm");
  const intent={version:1,feature:"roll",target_key:"",expected_revision:stateRevision(declaration),policy_revision:1,source_prerequisites:[],
    payload:{op:"adjudicate",source_event:declaration.event_key,ruling_key:"test",adjudication:"The recorded mundane steadying is feasible."}};
  const receipt=dispatchAiIntents(db,guild,[intent],{origin:"natural-help",sessionId:session.id,scope:{mode:"private",actorUserId:"actor",actorCharacterId:pcs.actor.id}})[0];
  assert.equal(receipt.status,"pending","AI delegation never bypasses required human feasibility review");
  reviewAiIntent(db,guild,{key:receipt.record_key,decision:"approve",expected_revision:stateRevision(receipt)},"gm");
  assert.equal(db.getCharacter(pcs.actor.id).data.resources.hope,beforeNatural-1);
  message.author.id="helper";message.id="natural-roll";message.content="I roll.";
  assert.equal(await routeRollMessage({db,message,characterId:pcs.helper.id,deliver:async text=>outputs.push(text)}),true);
  assert.equal(get(natural).status,"resolved");
  const negative=request("actor"),negativeProof=proof(negative,"third","help");
  const originalThird=db.getCharacter(pcs.third.id).data.resources.hope;
  db.updateCharacterData(pcs.third.id,data=>{data.resources.hope=0;});
  assert.throws(()=>operate(negative,"third","help",{pay_hope:true,...negativeProof},[6]),/Insufficient/);
  assert.equal(get(negative).data.helpers,undefined);
  db.updateCharacterData(pcs.third.id,data=>{data.resources.hope=originalThird;});
  db.setPresence(session.id,"third","absent");
  assert.throws(()=>operate(negative,"third","help",{pay_hope:true,...negativeProof},[6]),/attendance/);
  db.setPresence(session.id,"third","present");
  indexWorldEvent(db,guild,{key:negativeProof.proof,status:"retracted"});
  assert.throws(()=>operate(negative,"third","help",{pay_hope:true,...negativeProof},[6]),/active source/);
  assert.equal(db.getCharacter(pcs.third.id).data.resources.hope,originalThird);
  configureCityFlags(db,guild,{semantic_integrity:true});
  for(const narration of ["You arrive at the station.","You sustain an injury.","You pocket the dossier.","You are dead.","You now know the secret.","You are bound to serve."])
    assert.throws(()=>validateNarrativeClaims(db,guild,{narration,narrative_claims:[]}),/paraphrase/);
  for(const narration of ["The city dies in the rain.","You might arrive at the station.",'The witness says, "You are dead."',"You are dead to me.","You bleed money."])
    assert.equal(validateNarrativeClaims(db,guild,{narration,narrative_claims:[]}).ok,true);
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:"Rain falls.",private_messages:[{content:"You are dead."}],narrative_claims:[]}),/paraphrase/);
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:"Choose one of these: fight, flee.",narrative_claims:[]}),/predefined/);
  assert.deepEqual(materialParaphrases("A.da is dead. Axda is dead.",["A.da"]).map(hit=>hit.span),["A.da is dead"]);
  assert.equal(materialParaphrases('The witness says, "Leave", and you are dead.',[]).length,1,"Unrelated dialogue does not exempt an unquoted material assertion");
  const snapshot=db.snapshotCampaign(guild,{label:"Collaboration",createdBy:"gm"});db.close();db=new VeiledDB(file,schema);
  db.restoreSnapshot(guild,snapshot.id,{actorId:"gm"});assert.equal(get(parent).data.roll_id,chosen);
  assert(db.getCityRecord(guild,"tag_usage",`${session.id}:${pcs.actor.id}`));assert(db.getSavedRoll(guild,chosen));
  console.log("IHY2 PASS: native helpers/Experience/Tag Team costs/session usage/separate dice/owner-selected Hope-Fear; combined one-source attack damage/type choice/one spotlight; free-form capture/human intent review/native roll; scoped paraphrase/metaphor/private/no-menu negatives; replay/restore; zero paid requests.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
