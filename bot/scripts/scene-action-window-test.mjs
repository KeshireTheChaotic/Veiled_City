/** T04.1: shared-scene windows, native conflicts, consent, CAS and exactly-once close. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene } from "../src/scene-continuity.js";
import { openActionWindow, joinActionWindow, lockActionWindow, resolveActionWindow, classifyResourceOverlap } from "../src/scene-action-window.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t041-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t041-fixture";
function accepted(id,actor,visibility="party",subject=null){
  const source=indexWorldEvent(db,guild,{key:`source:${id}`,kind:"authored_turn",title:id,source_id:`player:${actor}`,
    session_id:session.id,scene:scene.key,visibility,subject_key:subject||"",details:{author:actor}},actor);
  return db.saveCityRecord(guild,{kind:"typed_intent",key:`accepted:${id}`,status:"accepted_for_adjudication",
    source_event:source.event_key,visibility,subject_key:subject,data:{actor,session_id:session.id,scene:scene.key}});
}
function receipt(key){return db.saveCityRecord(guild,{kind:"action_outcome_receipt",key,status:"resolved",source_event:"window-source",visibility:"party",data:{}});}
let session,scene,pcA,pcB;
try{
  db.ensureCampaign(guild);session=db.startSession(guild,"Shared beat");scene=currentScene(db,guild);
  db.upsertPlayer(guild,"owner-a","A");db.upsertPlayer(guild,"owner-b","B");
  pcA=db.createCharacter(guild,"owner-a","A",{});pcB=db.createCharacter(guild,"owner-b","B",{});
  const source=indexWorldEvent(db,guild,{key:"window-source",kind:"gm_beat",title:"Contested ledger",source_id:"human_gm",
    session_id:session.id,scene:scene.key,visibility:"party",details:{}},"gm");
  const window=openActionWindow(db,guild,{key:"ledger",source_event:source.event_key,reason:"contested_resource"});
  const a=joinActionWindow(db,guild,window.record_key,{accepted_intent:accepted("grab-a","pc-a").record_key,
    reads:[],writes:["item:ledger:custody"],location_key:"archive",operation:"claim",participation:"voluntary"});
  const b=joinActionWindow(db,guild,window.record_key,{accepted_intent:accepted("grab-b","pc-b").record_key,
    reads:[],writes:["item:ledger:custody"],location_key:"archive",operation:"claim",participation:"voluntary"});
  assert.equal(b.data.classification,"same_scarce_resource");
  assert.throws(()=>lockActionWindow(db,guild,window.record_key,{expected_revision:a.data.window_revision}),/stale/i);
  const locked=lockActionWindow(db,guild,window.record_key,{expected_revision:b.data.window_revision});
  const ra=receipt("ledger-a"),rb=receipt("ledger-b");
  assert.throws(()=>resolveActionWindow(db,guild,window.record_key,{expected_revision:locked.data.revision,outcomes:[
    {participant:a.record_key,status:"resolved",receipt:{kind:ra.kind,key:ra.record_key}},
    {participant:b.record_key,status:"resolved",receipt:{kind:rb.kind,key:rb.record_key}}]}),/exclusive|consistent/i);
  const closed=resolveActionWindow(db,guild,window.record_key,{expected_revision:locked.data.revision,outcomes:[
    {participant:a.record_key,status:"resolved",receipt:{kind:ra.kind,key:ra.record_key}},
    {participant:b.record_key,status:"blocked",receipt:{kind:rb.kind,key:rb.record_key}}]});
  assert.equal(closed.status,"closed");
  assert.equal(resolveActionWindow(db,guild,window.record_key,{expected_revision:locked.data.revision,outcomes:[
    {participant:a.record_key,status:"resolved",receipt:{kind:ra.kind,key:ra.record_key}},
    {participant:b.record_key,status:"blocked",receipt:{kind:rb.kind,key:rb.record_key}}]}).record_key,closed.record_key);
  assert.throws(()=>joinActionWindow(db,guild,window.record_key,{accepted_intent:accepted("late","pc-c").record_key,
    reads:[],writes:["item:ledger:custody"],location_key:"archive",operation:"claim",participation:"voluntary"}),/closed|open/i);

  const pvp=openActionWindow(db,guild,{key:"pvp",source_event:source.event_key,reason:"direct_pc_conflict"});
  assert.throws(()=>joinActionWindow(db,guild,pvp.record_key,{accepted_intent:accepted("shove","pc-a").record_key,
    reads:["character:pc-b"],writes:["character:pc-b:position"],location_key:"archive",operation:"opposed",
    participation:"voluntary",required_participants:["pc-b"],consent_refs:[]}),/consent/i);

  const door=openActionWindow(db,guild,{key:"door",source_event:source.event_key,reason:"contested_resource"});
  joinActionWindow(db,guild,door.record_key,{accepted_intent:accepted("open-door","pc-a").record_key,reads:["door:north"],
    writes:["door:north:state"],location_key:"archive",operation:"open",participation:"voluntary"});
  assert.equal(joinActionWindow(db,guild,door.record_key,{accepted_intent:accepted("hold-door","pc-b").record_key,reads:["door:north"],
    writes:["door:north:state"],location_key:"archive",operation:"opposed",participation:"voluntary"}).data.classification,"opposed_action");
  const reaction=openActionWindow(db,guild,{key:"rescue",source_event:source.event_key,reason:"reaction_opportunity"});
  assert.equal(reaction.data.reaction_open,true);
  joinActionWindow(db,guild,reaction.record_key,{accepted_intent:accepted("rescue","pc-a").record_key,reads:["encounter:attack"],
    writes:["character:pc-b:position"],location_key:"archive",operation:"reaction",participation:"voluntary"});
  assert.equal(classifyResourceOverlap({reads:[],writes:["item:key:hidden"],operation:"hide"},
    {reads:["item:key:hidden"],writes:[],operation:"testimony"}),"contradictory_testimony");

  const consentA=db.saveCityRecord(guild,{kind:"action_consent",key:"group-a",status:"accepted",source_event:source.event_key,
    visibility:"character",subject_key:pcA.id,data:{decision:"accept"}});
  const consentB=db.saveCityRecord(guild,{kind:"action_consent",key:"group-b",status:"accepted",source_event:source.event_key,
    visibility:"character",subject_key:pcB.id,data:{decision:"accept"}});
  const group=openActionWindow(db,guild,{key:"group",source_event:source.event_key,reason:"cooperative_operation"});
  joinActionWindow(db,guild,group.record_key,{accepted_intent:accepted("group-a-intent",pcA.id).record_key,reads:["task:lift"],
    writes:["task:lift:progress"],location_key:"archive",operation:"group_action",participation:"voluntary",
    required_participants:[pcA.id,pcB.id],consent_refs:[consentA.record_key,consentB.record_key]});

  const privateWindow=openActionWindow(db,guild,{key:"private",source_event:source.event_key,reason:"contested_resource"});
  joinActionWindow(db,guild,privateWindow.record_key,{accepted_intent:accepted("private-a","pc-a","character",pcA.id).record_key,
    reads:[],writes:["item:key:custody"],location_key:"room-a",operation:"claim",participation:"voluntary"});
  assert.throws(()=>joinActionWindow(db,guild,privateWindow.record_key,{accepted_intent:accepted("private-b","pc-b","character",pcB.id).record_key,
    reads:[],writes:["item:key:custody"],location_key:"room-b",operation:"claim",participation:"voluntary"}),/audience|location/i);

  const independent=openActionWindow(db,guild,{key:"independent",source_event:source.event_key,reason:"cooperative_operation"});
  const ia=joinActionWindow(db,guild,independent.record_key,{accepted_intent:accepted("search-a","pc-a").record_key,
    reads:["zone:east"],writes:["clue:east"],location_key:"archive",operation:"search",participation:"voluntary"});
  const ib=joinActionWindow(db,guild,independent.record_key,{accepted_intent:accepted("search-b","pc-b").record_key,
    reads:["zone:west"],writes:["clue:west"],location_key:"archive",operation:"search",participation:"voluntary"});
  assert.equal(ib.data.classification,"independent");
  const il=lockActionWindow(db,guild,independent.record_key,{expected_revision:ib.data.window_revision});
  const ira=receipt("independent-a"),irb=receipt("independent-b");
  assert.equal(resolveActionWindow(db,guild,independent.record_key,{expected_revision:il.data.revision,outcomes:[
    {participant:ia.record_key,status:"resolved",receipt:{kind:ira.kind,key:ira.record_key}},
    {participant:ib.record_key,status:"resolved",receipt:{kind:irb.kind,key:irb.record_key}}]}).status,"closed");
  console.log("T04.1 scene windows PASS: scarce conflict, CAS, consent, privacy, independent commits, replay and late refusal.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
