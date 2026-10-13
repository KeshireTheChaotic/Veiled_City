/** Native reconstructed scope-safe briefs and real authenticated read-only commands. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { sessionBrief } from "../src/session-briefs.js";
import { handleCommand } from "../src/commands.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
import {applyAuthoritativeMutation} from '../src/state.js';
import {queueDirectorPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy7-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);const old=db.startSession(guild,"Old");
  // V96-05R fixture migration: a historical brief needs a genuinely delivered native excerpt, not a raw recap bypass.
  db.upsertPlayer(guild,'historical-observer','Historical observer');
  const observer=db.createCharacter(guild,'historical-observer','Historical observer',{location:'quiet-room'});
  db.assignCharacter(old.id,'historical-observer',observer.id);db.setPresence(old.id,'historical-observer','present');
  db.setSimulationEntity(guild,'location','quiet-room',{name:'Quiet room'});
  const oldScope={mode:'party',actorUserId:null,actorCharacterId:null},oldOutput={narration:'Unverified recap candidate.',
    gm_world_parts:[{version:1,kind:'scene_atmosphere',entity_key:'quiet-room',tone:'plain',acts:['room_hum']}]};
  applyAuthoritativeMutation(db,{guildId:guild,sessionId:old.id,narrative:oldOutput,scope:oldScope});
  const oldTurn=queueDirectorPublications(db,{guild:{id:guild},session:old,result:oldOutput,scope:oldScope,key:'historical-brief-fixture'});
  const delivery=await deliverTurnOutbox(db,guild,oldTurn,async()=>({messageId:'history',channelId:'offline'}));
  assert(delivery.length&&delivery.every(item=>item.ok));
  db.endSession(guild,'Unverified recap candidate.');
  const session=db.startSession(guild,"Current"),pcs={};configureCityFlags(db,guild,{session_briefs:true,history_reconciliation:true});
  for(const user of ["one","two"]){db.upsertPlayer(guild,user,user);pcs[user]=db.createCharacter(guild,user,user,{});
    db.assignCharacter(session.id,user,pcs[user].id);db.setPresence(session.id,user,"present");
    db.addFact(guild,{key:user,content:`PRIVATE_${user}`,visibility:"character",subjectCharacterId:pcs[user].id});}
  db.addFact(guild,{key:"secret",content:"GM_SECRET",visibility:"gm"});db.addFact(guild,{key:"public",content:"Recorded public clue",category:"clue",visibility:"party"});
  indexWorldEvent(db,guild,{key:"private",source_id:"gm",title:"GM_SECRET_EVENT",visibility:"gm"});
  indexWorldEvent(db,guild,{key:"public",source_id:"gm",title:"Public visible event",visibility:"party",details:{internal:"GM_SECRET_DETAIL"}});
  db.saveCityRecord(guild,{kind:"ai_intent",key:"review",status:"pending",source_event:"private",data:{secret:"GM_SECRET"}});
  const writes=db.db.prepare("SELECT total_changes() n").get().n,clock=db.getSimulationClock(guild);
  const shared=sessionBrief(db,guild),one=sessionBrief(db,guild,{mode:"character",user:"one"}),two=sessionBrief(db,guild,{mode:"character",user:"two"});
  assert.equal(shared.saved_recap.session_id,old.id);assert(!JSON.stringify(shared).includes("PRIVATE_"));assert(!JSON.stringify(shared).includes("GM_SECRET"));
  assert(!shared.saved_recap.text.includes('Unverified recap candidate.'),'A saved raw recap never becomes a certified shared excerpt.');
  assert(JSON.stringify(one).includes("PRIVATE_one"));assert(!JSON.stringify(one).includes("PRIVATE_two"));assert(!JSON.stringify(two).includes("PRIVATE_one"));
  assert.throws(()=>sessionBrief(db,guild,{mode:"gm"}),/GM/);
  const prep=sessionBrief(db,guild,{mode:"gm",gm:true});assert(prep.reviews.some(row=>row.key==="review"));assert(JSON.stringify(prep).includes("GM_SECRET"));
  for(const [command,user,isGm] of [["vc-intel","one",false],["vc-story","gm",true],["vc-story","one",false]]){
    const interaction=fakeInteraction({gm:isGm,sub:"brief"});Object.assign(interaction,{commandName:command,isChatInputCommand:()=>true,id:`brief-${command}-${user}`,user:{id:user}});
    await handleCommand(interaction,{db,gm:{}});assert(interaction.deliveries.length);
    if(command==="vc-story"&&!isGm) assert(!interaction.deliveries.some(row=>row.files));
  }
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,writes);assert.deepEqual(db.getSimulationClock(guild),clock);
  db.close();db=new VeiledDB(file,schema);assert.deepEqual(sessionBrief(db,guild),shared);assert.deepEqual(sessionBrief(db,guild,{mode:"character",user:"one"}),one);
  console.log("IHY7 PASS: persisted shared/private/GM brief scopes, no raw secret details, real read-only command GM guard, zero writes/time/provider, restart reconstruction.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
