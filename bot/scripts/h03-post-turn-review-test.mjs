/** H03 deterministic review normalization and private audit regression. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { POST_TURN_REVIEW_CATEGORIES, validatePostTurnStateReview } from "../src/director.js";
import { applyAuthoritativeMutation, previewAuthoritativeMutation } from "../src/state.js";
import { captureWorldInput } from "../src/autonomous-world.js";

const review=()=>Object.fromEntries([
  ...POST_TURN_REVIEW_CATEGORIES.map(category=>[category,{decision:"no_change",reason:`Model review for ${category}.`,confidence:80}]),
  ["scene",{decision:"continue",label:"",reason:"The scene continues."}]
]);

const result={events:[],relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],state_review:review()};
result.state_review.references.decision="changed";
const normalized=validatePostTurnStateReview(result);
assert.equal(normalized.normalized,true);
assert.equal(normalized.review.references.decision,"no_change");
assert.deepEqual(normalized.corrections,[{category:"references",from:"changed",to:"no_change"}]);
assert.equal(result.state_review.references.decision,"no_change","Downstream scene orchestration sees native-derived review state");
assert.equal(result.state_review_normalization.normalized,true);

const withMutation={...result,state_review:review(),events:[{type:"fact"}]};
withMutation.state_review.facts_clues.decision="no_change";
assert.equal(validatePostTurnStateReview(withMutation).review.facts_clues.decision,"changed");

const invalid={...result,state_review:review()};
invalid.state_review.references.reason="";
assert.throws(()=>validatePostTurnStateReview(invalid),error=>error.code==="POST_TURN_REVIEW"&&error.diagnostic?.reason==="incomplete");

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-h03-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="h03";db.ensureCampaign(guild);const session=db.startSession(guild,"Review");
  db.upsertPlayer(guild,"owner","Owner");const pc=db.createCharacter(guild,"owner","Reviewer",{});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  captureWorldInput(db,guild,"owner",pc.id,"review-1","Review the scene.");
  const narrative={...result,player_intents:[],player_intent_diagnostics:[],scene_actions:[],world_additions:[],world_conflicts:[],
    narrative_interpretation:null,context_memories:[],authored_candidates:null,narrative_claims:[],private_messages:[],ai_intents:[]};
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  previewAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,narrative,scope,provenance:{messageId:"review-1"}});
  assert.equal(db.getCityRecord(guild,"post_turn_review_audit","review:review-1"),null,"Preview audit rolls back");
  applyAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,narrative,scope,provenance:{messageId:"review-1"}});
  const audit=db.getCityRecord(guild,"post_turn_review_audit","review:review-1");
  assert.equal(audit.visibility,"gm");
  assert.equal(audit.data.corrections[0].category,"references");
  const replay=applyAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,narrative,scope,provenance:{messageId:"review-1"}});
  assert.equal(replay.reviewAudit.record_key,audit.record_key,"Replay reuses the private audit identity");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}

console.log("H03 post-turn review PASS: model flags normalized from staged outputs; private audit is rollback-safe and idempotent.");
