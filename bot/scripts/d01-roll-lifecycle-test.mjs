/** D01: per-occurrence roll identity, verified rules and typed native publication. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";
import { adjudicateAcceptedIntent, selectRuleBasis } from "../src/rules-arbitration.js";
import { formatRollRequest, publishRollRequests } from "../src/roll-requests.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d01-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d01-fixture";

try{
  db.ensureCampaign(guild);
  configureCityFlags(db,guild,{roll_requests:true},"gm");
  const session=db.startSession(guild,"D01 rolls");
  db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Jaxon",{traits:{Agility:2,Knowledge:1},resources:{hope:2,stress:{current:0,max:6}}});
  db.assignCharacter(session.id,"owner",pc.id);
  db.setPresence(session.id,"owner","present");
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  const raw="I slip past the guard. I inspect the locked case.";
  const envelope=captureAuthoredTurnEnvelope(db,guild,"owner",pc.id,"compound-roll",raw);
  const specs=[
    {span:"I slip past the guard.",type:"move",operation:"slip",trait:"Agility",difficulty:14},
    {span:"I inspect the locked case.",type:"search",operation:"inspect",trait:"Knowledge",difficulty:12}
  ];
  const proposals=specs.map((spec,index)=>{
    const start=raw.indexOf(spec.span);
    return {version:2,proposal_id:"",source_event:envelope.source_event,start,end:start+spec.span.length,source_span:spec.span,
      actor_character_id:pc.id,sequence_index:index,dependencies:[],type:spec.type,operation:spec.operation,
      target:{kind:"object",key:"fixture",phrase:"fixture",grounding:"known"},framing:"immediate",destination_scope:"none",
      attempted_action:spec.span,desired_outcome:null,authored_outcome_claim:null,temporal_relation:"sequential"};
  });
  const accepted=proposeIntents(db,guild,proposals,scope,{messageId:"compound-roll"})
    .map(row=>acceptIntentForAdjudication(db,guild,row,scope,{resolvedTargetKey:"fixture"}));

  assert.equal(selectRuleBasis(db,guild,{rawRefs:["srd:not-a-real-rule"]},{rollKind:"action"}).kind,"provisional",
    "a namespace prefix is not proof that a rule exists");
  assert.equal(selectRuleBasis(db,guild,{houseRefs:["house:not-a-real-rule"]},{rollKind:"action"}).kind,"provisional",
    "an unsaved extension reference is not authoritative");

  const adjudications=accepted.map((row,index)=>adjudicateAcceptedIntent(db,guild,{
    acceptedIntent:row.record_key,mode:"roll_required",risk:"Meaningful opposition",stakes:"The attempt may fail.",
    rawRefs:["srd:action-rolls"],trait:specs[index].trait,kind:"action",difficulty:specs[index].difficulty,
    modifierKeys:[],explanation:`Ground ${specs[index].operation} as an action roll.`
  },"ai_gm",{scope}));
  assert.notEqual(adjudications[0].roll_request_ref,adjudications[1].roll_request_ref,
    "two accepted occurrences in one message need independent native request identities");
  assert.equal(adjudicateAcceptedIntent(db,guild,{
    acceptedIntent:accepted[0].record_key,mode:"roll_required",risk:"Meaningful opposition",stakes:"The attempt may fail.",
    rawRefs:["srd:action-rolls"],trait:"Agility",kind:"action",difficulty:14,modifierKeys:[],
    explanation:"Ground slip as an action roll."
  },"ai_gm",{scope}).roll_request_ref,adjudications[0].roll_request_ref,"replay reuses the same request");

  const delivered=[];
  const mutation={nativeAdjudications:adjudications,intents:[]};
  await publishRollRequests(db,guild,mutation,async(user,text,sessionId,characterId)=>{
    delivered.push({user,text,sessionId,characterId}); return {ok:true,messageId:`private-${delivered.length}`,channelId:"dm"};
  });
  assert.equal(delivered.length,2,"each committed typed native adjudication is privately published");
  assert(delivered.every(row=>row.user==="owner"&&row.characterId===pc.id&&row.sessionId===session.id));
  assert.equal(new Set(delivered.map(row=>row.text.match(/roll:[^\]]+/)?.[0])).size,2,"deliveries remain isolated by request");
  await publishRollRequests(db,guild,mutation,async()=>assert.fail("delivered revisions must not publish twice"));

  const reviewRaw="I try to charm the guard.";
  const reviewEnvelope=captureAuthoredTurnEnvelope(db,guild,"owner",pc.id,"review-roll",reviewRaw);
  const reviewProposal=proposeIntents(db,guild,[{version:2,proposal_id:"",source_event:reviewEnvelope.source_event,
    start:0,end:reviewRaw.length,source_span:reviewRaw,actor_character_id:pc.id,sequence_index:0,dependencies:[],
    type:"interact",operation:"charm",target:{kind:"npc",key:"guard",phrase:"guard",grounding:"known"},
    framing:"immediate",destination_scope:"none",attempted_action:reviewRaw,desired_outcome:null,authored_outcome_claim:null,
    temporal_relation:"sequential"}],scope,{messageId:"review-roll"})[0];
  const reviewAccepted=acceptIntentForAdjudication(db,guild,reviewProposal,scope,{resolvedTargetKey:"guard"});
  const review=adjudicateAcceptedIntent(db,guild,{acceptedIntent:reviewAccepted.record_key,mode:"roll_required",risk:"Opposition",
    stakes:"The guard remains unconvinced.",rawRefs:["srd:action-rolls"],trait:"Presence",kind:"action",difficulty:13,
    modifierKeys:[],explanation:"Presence is not recorded on this fixture sheet."},"ai_gm",{scope});
  const reviewRequest=db.getCityRecord(guild,"roll_request",review.roll_request_ref);
  assert.equal(review.disposition,"needs_review","unresolved breakdowns are not actionable pending rolls");
  assert.equal(reviewRequest.status,"needs_review");
  assert.match(formatRollRequest(reviewRequest),/^\[Review required/);
  assert.match(formatRollRequest(reviewRequest),/Not actionable/);

  console.log("D01 roll lifecycle PASS: verified refs, per-occurrence IDs, replay and typed private publication.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
