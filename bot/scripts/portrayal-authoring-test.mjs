/** Fake-TTS direction/privacy and reviewable six-kind world drafts; no model/audio billing. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { VoiceNarrator } from "../src/voice.js";
import { configurePortrayal, portrayalPacket } from "../src/portrayal.js";
import { authorWorldDraft, reviewWorldDraft } from "../src/world-authoring.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-author-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql")),content=new ContentIndex(path.resolve("../content"));
try{
  const guildId="author";db.ensureCampaign(guildId);db.ensureCampaign("other");
  indexWorldEvent(db,guildId,{key:"source",title:"Explicit GM authoring session",source_kind:"gm",source_id:"Human GM"});
  const proposal={key:"new-clerk",kind:"npc",source_event:"source",data:{name:"Synthetic New Clerk",occupation:"Clerk",public_identity:"Station clerk",portrayal:"Measured and patient"}};
  assert.throws(()=>authorWorldDraft(db,content,guildId,proposal,"gm"),/opt-in/);
  configureCityFlags(db,guildId,{authoring:true,voice_direction:true});
  const originalLedger=db.listMutationLedger(guildId,{limit:100}).length;
  const draft=authorWorldDraft(db,content,guildId,proposal,"gm");assert.equal(draft.status,"draft");assert.equal(db.getNpcProfile(guildId,proposal.key),null);
  assert.equal(db.listMutationLedger(guildId,{limit:100}).length,originalLedger+1,"validation savepoint leaves no extra audit writes");
  assert.throws(()=>authorWorldDraft(db,content,guildId,{...proposal,key:"another-clerk"},"gm"),/Duplicate/);
  const promoted=reviewWorldDraft(db,content,guildId,{key:proposal.key,decision:"approve"},"gm");assert.equal(promoted.status,"approved");
  reviewWorldDraft(db,content,guildId,{key:proposal.key,decision:"approve"},"gm");
  assert.equal(db.getNpcProfile(guildId,proposal.key).display_name,proposal.data.name);assert.equal(db.listNpcKnowledge(guildId,proposal.key).length,0);
  assert.throws(()=>authorWorldDraft(db,content,guildId,{...proposal,key:"canonical-copy",data:{...proposal.data,name:"Mara Voss"}},"gm"),/identity already exists/);
  assert.throws(()=>authorWorldDraft(db,content,guildId,{...proposal,key:"bad-skills",data:{...proposal.data,name:"Another",skills:["invented PC stat"]}},"gm"),/unsupported fields/);
  for(const kind of ["faction","location"]){
    authorWorldDraft(db,content,guildId,{key:`new-${kind}`,kind,source_event:"source",data:{name:`Synthetic ${kind}`,description:"Reviewable premise"}},"gm");
    assert.equal(db.getSimulationEntity(guildId,kind,`new-${kind}`),null);
    reviewWorldDraft(db,content,guildId,{key:`new-${kind}`,decision:"approve"},"gm");assert(db.getSimulationEntity(guildId,kind,`new-${kind}`));
  }
  authorWorldDraft(db,content,guildId,{key:"new-office",kind:"institution",source_event:"source",data:{name:"Synthetic Office",mandate:"Records",
    capacity:2,procedures:["document_request"],jurisdictions:["new-location"]}},"gm");
  reviewWorldDraft(db,content,guildId,{key:"new-office",decision:"approve"},"gm");assert(db.getCityRecord(guildId,"institution","new-office"));
  db.proposeCanon(guildId,{key:"fixed.solution",value:"Existing answer",visibility:"gm"});
  authorWorldDraft(db,content,guildId,{key:"new-mystery",kind:"mystery",source_event:"source",data:{anchor_key:"fixed.solution",question:"Which source?",
    routes:["Interview","Record","Trace"].map((method,i)=>({key:`clue-${i}`,method,fact_id:db.addFact(guildId,{content:`Existing clue ${i}`,visibility:"party"})}))}},"gm");
  reviewWorldDraft(db,content,guildId,{key:"new-mystery",decision:"approve"},"gm");assert.equal(db.currentCanon(guildId,"fixed.solution").value,"Existing answer");
  authorWorldDraft(db,content,guildId,{key:"new-contact",kind:"relationship",source_event:"source",data:{fromType:"npc",fromKey:"new-clerk",toType:"faction",toKey:"new-faction",relationshipType:"contact",score:1}},"gm");
  reviewWorldDraft(db,content,guildId,{key:"new-contact",decision:"approve"},"gm");
  configurePortrayal(db,guildId,{npc:"new-clerk",source_event:"source",direction:{address:"PRIVATE_SYNTHETIC_STYLE"}},"gm");
  assert.equal(portrayalPacket(db,guildId,"new-clerk",{publicVoice:true}),null);
  let calls=0,lastOptions;
  const voice=new VoiceNarrator({voiceEnabled:true,voiceMode:"narrative",voiceName:"cedar",voiceSpeed:1,voiceMaxQueue:4,voiceMaxCharsPerTurn:2000},
    {db,getConnection:()=>({}),synthesize:async(text,options)=>{calls++;lastOptions=options;return Buffer.from("FAKE_AUDIO");}});
  voice.ffmpegAvailable=true;voice._enqueueReserved=()=>{};
  const guild={id:guildId};
  assert.equal((await voice.narrate(guild,"Hidden discovery",{visibility:"character",npcKey:"new-clerk"})).reason,"private_scope");assert.equal(calls,0);
  await voice.narrate(guild,"Welcome",{npcKey:"new-clerk"});assert(!lastOptions.instructions?.includes("PRIVATE_SYNTHETIC_STYLE"));
  configurePortrayal(db,guildId,{npc:"new-clerk",source_event:"source",direction:{address:"Visitor",pronunciation:"Clear syllables"},public_voice_approved:true},"gm");
  await voice.narrate(guild,"Welcome",{npcKey:"new-clerk"});assert(lastOptions.instructions.includes("Clear syllables"));assert.equal(lastOptions.voice,"cedar");
  assert.equal(db.getNpcProfile("other","new-clerk"),null);
  const backup=db.createBackup(guildId);db.restoreBackup(guildId,backup.id);assert.equal(db.getCityRecord(guildId,"world_draft","new-clerk").status,"approved");
  console.log("Portrayal/authoring PASS: six typed drafts, human review, canon/duplicate refusal, private voice blocked, fake TTS only.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
