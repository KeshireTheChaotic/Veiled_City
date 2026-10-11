/** V9-00 known-red inventory. Not a green release gate until each owning phase repairs its defect. */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene } from "../src/scene-continuity.js";
import { openActionWindow, joinActionWindow, lockActionWindow, resolveActionWindow } from "../src/scene-action-window.js";
import { finalizeTypedRollAction } from "../src/typed-roll-outcomes.js";
import { pendingRollRequests, publishRollAmendment } from "../src/roll-requests.js";
import { publishRollPartyDisclosure, formatSharedRoll } from "../src/roll-sharing.js";

async function fixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-v9-baseline-"));
  const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql")),guild="v9-baseline";
  try{
    db.ensureCampaign(guild);const session=db.startSession(guild,"V9 baseline"),scene=currentScene(db,guild);
    db.upsertPlayer(guild,"owner","Owner");
    const pc=db.createCharacter(guild,"owner","Billy",{location:"terminal"});
    db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
    const source=indexWorldEvent(db,guild,{key:"source",kind:"authored_turn",title:"Attempt",source_id:"player:owner",
      session_id:session.id,scene:scene.key,visibility:"character",subject_key:pc.id,details:{author:"owner"}},"owner");
    return await run({db,guild,session,scene,pc,source});
  }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
}
test("G04/C05 terminal native outcome persists a durable continuation",()=>fixture(({db,guild,source})=>{
  const a=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:a",status:"accepted_for_adjudication",
    source_event:source.event_key,visibility:"party",data:{actor:"pc",proposal_id:"a",sequence_index:0,dependencies:[],resolution:"roll_required"}});
  db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:b",status:"accepted_for_adjudication",source_event:source.event_key,
    visibility:"party",data:{actor:"pc",proposal_id:"b",sequence_index:1,dependencies:["a"],resolution:"auto"}});
  const row=db.saveCityRecord(guild,{kind:"roll_request",key:"roll:a",status:"resolved",source_event:source.event_key,
    data:{input:{accepted_intent:a.record_key},result:{total:18,duality:"Hope"},breakdown:{difficulty:14},roll_id:"native-a"}});
  finalizeTypedRollAction(db,guild,row);
  assert(db.listCityRecords(guild,{kind:"action_continuation",includeGM:true,limit:10}).length,"ready is not durable execution/review scheduling");
}));
test("G05/R01 missing Difficulty is not native success",()=>fixture(({db,guild,source})=>{
  const a=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:a",status:"accepted_for_adjudication",
    source_event:source.event_key,data:{actor:"pc"}});
  const row=db.saveCityRecord(guild,{kind:"roll_request",key:"roll:a",status:"resolved",source_event:source.event_key,
    data:{input:{accepted_intent:a.record_key},result:{total:18,duality:"Hope"},breakdown:{difficulty:null},roll_id:"native-a"}});
  assert.notEqual(finalizeTypedRollAction(db,guild,row)?.outcome,"success");
}));
test("G06/P02 mark private notification delivering before external I/O",()=>fixture(async({db,guild,pc,session,source})=>{
  const row=db.saveCityRecord(guild,{kind:"roll_request",key:"roll:a",status:"pending",source_event:source.event_key,
    subject_key:pc.id,data:{character_name:"Billy",owner_user_id:"owner",session_id:session.id,revision:1,kind:"action",attempt:"Inspect",
      breakdown:{trait:"Knowledge",trait_bonus:1,subtotal:1,advantage:0,disadvantage:0,difficulty:14,modifiers:[],unresolved:[]}}});
  await publishRollAmendment(db,guild,row,async()=>{
    assert.equal(db.listCityRecords(guild,{kind:"roll_publication",includeGM:true,limit:10})[0].status,"delivering");return true;
  });
}));
test("G07/U02 sharing only the exact approved span",()=>{
  const row={status:"resolved",data:{character_name:"Billy",attempt:"I inspect the terminal. SECRET: my contact is X.",
    party_disclosure:{approved_span:"I inspect the terminal."},result:{total:18,duality:"Hope"}}};
  assert(!formatSharedRoll(row).includes("SECRET"));
});
test("G08/W04 closed beat permits a genuinely new occurrence",()=>fixture(({db,guild,scene,session,source})=>{
  const window=openActionWindow(db,guild,{key:"parcel",source_event:source.event_key,reason:"contested_resource"});
  const accepted=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:a",status:"accepted_for_adjudication",
    source_event:source.event_key,data:{actor:"pc",session_id:session.id,scene:scene.key}});
  const p=joinActionWindow(db,guild,window.record_key,{accepted_intent:accepted.record_key,reads:[],writes:["item:parcel:custody"],
    location_key:"terminal",operation:"claim",participation:"voluntary"});
  const locked=lockActionWindow(db,guild,window.record_key,{expected_revision:p.data.window_revision});
  const receipt=db.saveCityRecord(guild,{kind:"action_outcome_receipt",key:"receipt",status:"resolved",data:{}});
  resolveActionWindow(db,guild,window.record_key,{expected_revision:locked.data.revision,
    outcomes:[{participant:p.record_key,status:"resolved",receipt:{kind:receipt.kind,key:receipt.record_key}}]});
  const next=indexWorldEvent(db,guild,{key:"next-source",kind:"authored_turn",title:"New attempt",session_id:session.id,
    scene:scene.key,source_id:"player:owner",details:{}},"owner");
  assert.notEqual(openActionWindow(db,guild,{key:"parcel",source_event:next.event_key,reason:"contested_resource"}).record_key,window.record_key);
}));
test("G10/D01 no-session pending query is read-only and empty",()=>fixture(({db,guild})=>{
  db.endSession(guild,"Done");assert.deepEqual(pendingRollRequests(db,guild,"owner"),[]);
}));
test("G14/P03 party disclosure has a delivering receipt before send",()=>fixture(async({db,guild,source})=>{
  const disclosure=indexWorldEvent(db,guild,{key:"share",kind:"roll_disclosure",title:"Share",visibility:"party",
    source_id:"player:owner",details:{request:"roll:a",author:"owner"}},"owner");
  const row={record_key:"roll:a",status:"resolved",source_event:source.event_key,data:{owner_user_id:"owner",character_name:"Billy",
    party_disclosure:{source_event:disclosure.event_key},attempt:"Inspect",result:{total:18,duality:"Hope"}}};
  await publishRollPartyDisclosure(db,guild,row,async()=>{
    assert.equal(db.listCityRecords(guild,{kind:"roll_party_publication",includeGM:true,limit:10})[0].status,"delivering");return true;
  });
}));
// Adapter regressions are source-audited here, not misreported as behavioral proof; owning phases add actual Discord doubles.
for(const [id,file,unsafe] of [
  ["G03/P01","commands.js",/\(await postPlayMessage\(\{db,guild:interaction.guild,content,sessionId\}\)\)\.ok/],
  ["G09/U01","roll-menu.js",/await interaction\.update\(\{content:formatRollRequest\(row/],
  ["G11/D02","index.js",/await message\.author\.send\(value\)/]
])test(`${id} unsafe adapter remains absent`,()=>assert(!unsafe.test(fs.readFileSync(new URL(`../src/${file}`,import.meta.url),"utf8"))));
