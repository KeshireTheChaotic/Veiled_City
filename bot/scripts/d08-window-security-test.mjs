/** D08 release blocker: stale unrelated consent must never authorize a current PC conflict. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene } from "../src/scene-continuity.js";
import { openActionWindow, joinActionWindow } from "../src/scene-action-window.js";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d08-consent-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="d08-security";db.ensureCampaign(guild);
  const session=db.startSession(guild,"Current scene"),scene=currentScene(db,guild);
  const source=indexWorldEvent(db,guild,{key:"source:current",kind:"authored_turn",title:"Current attempt",
    source_id:"player:attacker",session_id:session.id,scene:scene.key,visibility:"party",details:{}},"attacker");
  const accepted=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:current",status:"accepted_for_adjudication",
    source_event:source.event_key,visibility:"party",data:{actor:"attacker-pc",scene:scene.key,session_id:session.id}});
  indexWorldEvent(db,guild,{key:"retracted-source",kind:"testimony",title:"Unrelated prior terms",status:"retracted",
    source_id:"player:different-owner",visibility:"party",details:{}},"different-owner");
  db.saveCityRecord(guild,{kind:"action_consent",key:"unrelated-old-consent",status:"accepted",source_event:"retracted-source",
    visibility:"character",subject_key:"target-pc",data:{decision:"accept",owner_user_id:"different-owner",
      session_id:"old-session",scene:"old-scene",accepted_intent:"unrelated-action",terms:"Share a cup of tea"}});
  const window=openActionWindow(db,guild,{key:"current-kick",source_event:source.event_key,reason:"direct_pc_conflict"});
  assert.throws(()=>joinActionWindow(db,guild,window.record_key,{accepted_intent:accepted.record_key,
    reads:["character:target-pc"],writes:["character:target-pc:body"],location_key:"diner",operation:"opposed",
    participation:"voluntary",required_participants:["target-pc"],consent_refs:["unrelated-old-consent"]}),
  /consent|owner|source|scene|principal/i,"stale unrelated consent must not authorize a new PC conflict");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
