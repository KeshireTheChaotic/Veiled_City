/** D00 red-first Session 2 semantic recovery reproductions. Not in the default gate until owning phases turn it green. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";
import { validatePostTurnStateReview } from "../src/director.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";

const fixture=JSON.parse(fs.readFileSync(new URL("./fixtures/session2-sanitized.json",import.meta.url),"utf8"));
const failures=[];
function check(id,fn){try{fn();console.log(`${id} PASS`);}catch(error){failures.push({id,error:error.message,code:error.code||""});}}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-s2-red-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="session2-sanitized";
try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"Sanitized Session 2");
  db.upsertPlayer(guild,"owner-jaxon","Owner J");
  const pc=db.createCharacter(guild,"owner-jaxon","Jaxon",{});
  db.assignCharacter(session.id,"owner-jaxon",pc.id);
  db.setPresence(session.id,"owner-jaxon","present");
  const scope={mode:"party",actorUserId:"owner-jaxon",actorCharacterId:pc.id};
  const text=fixture.messages.find(row=>row.id==="s2-jaxon-conflict").text;
  const envelope=captureAuthoredTurnEnvelope(db,guild,"owner-jaxon",pc.id,"s2-jaxon-conflict",text);
  const approach="I walk over to Choso",kick="kick him in the shin";
  const base={version:2,proposal_id:"",source_event:envelope.source_event,actor_character_id:pc.id,
    dependencies:[],framing:"immediate",destination_scope:"none",desired_outcome:null,authored_outcome_claim:null,
    temporal_relation:"sequential"};
  check("S2-06-independent-valid-clause-survives-unmatched-secondary",()=>{
    const rows=proposeIntents(db,guild,[
      {...base,start:0,end:approach.length,source_span:approach,sequence_index:0,type:"move",operation:"approach",
        target:{kind:"character",key:"pc-choso",phrase:"Choso",grounding:"known"},attempted_action:approach},
      {...base,start:text.length-4,end:text.length+20,source_span:"kick Choso hard",sequence_index:1,type:"interact",operation:"kick",
        target:{kind:"character",key:"pc-choso",phrase:"Choso",grounding:"known"},attempted_action:kick}
    ],scope,{messageId:"s2-jaxon-conflict"});
    assert.equal(rows.filter(row=>row.status==="proposed").length,1);
    assert.equal(rows.filter(row=>row.status==="unmatched_source_span").length,1);
  });
  check("S2-17-ambiguity-becomes-persisted-clarification",()=>{
    const start=text.indexOf(approach);
    const row=proposeIntents(db,guild,[{...base,start,end:start+approach.length,source_span:approach,sequence_index:2,
      type:"move",operation:"approach",target:{kind:"location",key:null,phrase:"the store",grounding:"ambiguous"},
      attempted_action:approach}],scope,{messageId:"s2-jaxon-conflict"})[0];
    const accepted=acceptIntentForAdjudication(db,guild,row,scope,{targetCandidates:["store-a","store-b"]});
    assert.equal(accepted.status,"awaiting_referent");
  });
  check("S2-21-post-review-normalizes-derived-reference-state",()=>{
    const review={references:{decision:"changed",confidence:90,reason:"Model metadata only."}};
    const normalized=validatePostTurnStateReview({events:[],relationships:[],handouts:[],state_review:review});
    assert.equal(normalized.review.references.decision,"no_change");
    assert.equal(normalized.normalized,true);
  });
  check("S2-24-input-span-is-not-output-claim-evidence",()=>{
    const result={narration:"Jaxon reaches for the handle; entry remains unresolved.",private_messages:[],narrative_claims:[{
      actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"outside",proposed:"inside",visibility:"party",
      source_ref:envelope.source_event,source_span:"I enter the store.",mutation_index:-1,certainty:"committed"
    }]};
    assert.throws(()=>validateNarrativeClaims(db,guild,result,scope),error=>error.code==="NARRATIVE_INTEGRITY"
      &&error.diagnostic?.category==="source_span");
  });
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
if(failures.length){console.error(`SESSION2_RED ${JSON.stringify(failures)}`);process.exit(1);}
console.log("Session 2 semantic replay PASS.");
