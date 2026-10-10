/** H04 input/output evidence separation, surface isolation and native consequence regression. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-h04-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="h04";db.ensureCampaign(guild);const session=db.startSession(guild,"Claims");
  db.upsertPlayer(guild,"owner","Owner");const pc=db.createCharacter(guild,"owner","Jaxon",{location:"diner"});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  const input="I enter the diner.";
  const source=captureWorldInput(db,guild,"owner",pc.id,"claim-source",input);
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  const base={actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"street",proposed:"diner",
    visibility:"party",source_ref:source.event_key,mutation_index:-1,certainty:"intent"};
  const output="Jaxon intends to enter the diner; the result remains unresolved.";
  const separated={...base,authored_source_span:input,output_claim_span:output};
  assert.equal(validateNarrativeClaims(db,guild,{narration:output,private_messages:[],narrative_claims:[separated]},scope).ok,true);

  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:output,private_messages:[],narrative_claims:[
    {...separated,authored_source_span:"I already entered the diner."}
  ]},scope),error=>error.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?.category==="authored_source_span");

  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:output,
    private_messages:[{discord_user_id:"owner",content:output}],narrative_claims:[separated]},scope),
  error=>error.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?.category==="output_claim_surface");

  const legacy={...base,source_span:input};
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:output,private_messages:[],narrative_claims:[legacy]},scope),
    error=>error.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?.category==="source_span",
    "Legacy source_span remains output evidence and is never reinterpreted as authored input");

  const completed="Jaxon arrives at the diner.";
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:completed,private_messages:[],narrative_claims:[
    {...base,certainty:"committed",authored_source_span:input,output_claim_span:completed}
  ]},scope),error=>error.code==="NARRATIVE_INTEGRITY"&&error.diagnostic?.category==="uncommitted_movement",
  "A saved location value without an arrival/travel receipt cannot support completed movement prose");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}

console.log("H04 narrative claim evidence PASS: authored/output spans are distinct; one scoped surface and native movement receipts are required.");
