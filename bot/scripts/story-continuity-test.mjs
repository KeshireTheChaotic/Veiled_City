/** Descriptive pacing and critical-clue reachability across failed saved rolls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { setPacingCues, pacingAdvice, validatePacing, configureMystery, mysteryView, recordMysteryAttempt } from "../src/story-continuity.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { GMService } from "../src/gm.js";
import { FakeResponses } from "./contract-fixtures.mjs";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-continuity-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="story";db.ensureCampaign(guild);db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Detective",{}),session=db.startSession(guild);
  const pcBefore=JSON.stringify(db.getCharacter(pc.id).data);
  indexWorldEvent(db,guild,{key:"source",title:"Established mystery",source_kind:"gm",source_id:"Human GM"});
  configureCityFlags(db,guild,{pacing:true});
  setPacingCues(db,guild,{source_event:"source",stakes:"Find the missing witness",dramatic_question:"Who saw the van?",objective:"Compare accounts",
    pressure:"A fictional deadline",unresolved_beats:"Witness mistrust",allow_transition:false,pause_background:true},"gm");
  assert.equal(pacingAdvice(db,guild,"OOC we discuss options").suggested_mode,"silence");
  assert.throws(()=>validatePacing(db,guild,{narration:"Next scene",state_review:{scene:{decision:"transition"}}}),/held open/);
  const fake=new FakeResponses([]),gm=new GMService({db,content:{},config:{},ai:fake});
  assert.equal(await gm.shouldRespond({guildId:guild,mode:"active",message:{content:"OOC we discuss options"}}),false);
  assert.equal((await gm.runWorldDirector({guildId:guild,layer:"round"})).act,false);assert.equal(fake.requests.length,0);
  assert.equal(db.getDirectorState(session.id).scene_number,1);
  db.proposeCanon(guild,{key:"mystery.culprit",value:"Established culprit",visibility:"gm"});
  const routes=["Interview","Records","Physical evidence"].map((method,i)=>({key:`route-${i}`,method,
    fact_id:db.addFact(guild,{content:`Independent clue ${i}`,visibility:"party"})}));
  const input={key:"case",source_event:"source",anchor_key:"mystery.culprit",question:"What happened?",routes,hypotheses:["An unverified alternative"]};
  configureMystery(db,guild,input,"gm");assert.equal(mysteryView(db,guild,"case").routes.length,3);
  assert(!JSON.stringify(mysteryView(db,guild,"case")).includes("Established culprit"));
  const roll=db.addRoll(guild,session.id,"owner",pc.id,"duality",{hope:1,fear:2,total:3,duality:"Fear"});
  const attempt={key:"try-1",source_event:"source",mystery:"case",route:"route-0",roll_id:roll,character_id:pc.id,difficulty:15};
  const result=recordMysteryAttempt(db,guild,attempt,"gm");assert.equal(result.data.success,false);assert.equal(result.data.viable_routes.length,3);
  assert.equal(recordMysteryAttempt(db,guild,attempt,"gm").record_key,result.record_key);
  assert.equal(db.currentCanon(guild,"mystery.culprit").value,"Established culprit");
  assert.throws(()=>recordMysteryAttempt(db,guild,{...attempt,key:"fake",roll_id:"model-rolled-20"},"gm"),/model dice/);
  assert.throws(()=>configureMystery(db,guild,{...input,routes:[routes[0],routes[0],routes[0]]},"gm"),/independent/);
  const privateId=db.addFact(guild,{content:"OTHER_CHARACTER_SECRET",visibility:"character",subjectCharacterId:pc.id});
  configureMystery(db,guild,{...input,routes:[...routes,{key:"private",method:"Private interview",fact_id:privateId}]},"gm");
  assert(!JSON.stringify(mysteryView(db,guild,"case",{characterId:"unrelated"})).includes("OTHER_CHARACTER_SECRET"));
  assert.equal(JSON.stringify(db.getCharacter(pc.id).data),pcBefore);
  console.log("Continuity PASS: player dialogue silence, held scene, three independent clues, failed-roll reachability and fixed canon.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
