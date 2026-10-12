/** D06: native completion resumes only authorized descendants and production reconciliation is strict. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {nativeFixture} from "./v9-fixtures.mjs";
import {captureWorldInput} from "../src/autonomous-world.js";
import {persistPlayerIntents} from "../src/typed-intents.js";
import {configureCityFlags} from "../src/city-core.js";
import {adjudicateAcceptedIntent} from "../src/rules-arbitration.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {rollRevision} from "../src/roll-requests.js";
import { buildActionPlan } from "../src/action-dependency.js";
import { finalizeTypedRollAction } from "../src/typed-roll-outcomes.js";
import { reconcileConsequences } from "../src/consequence-reconciliation.js";

await nativeFixture(f=>{
  const {db,guild}=f,pc=f.pcs[0],scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true},"gm");
  const spans=["I unlock the mechanism.","I examine it.","I say hello."],raw=spans.join(" ");
  captureWorldInput(db,guild,pc.owner_user_id,pc.id,"d06-compound",raw);
  const intents=spans.map((span,i)=>({type:i===2?"speak":"interact",source_span:span,operation:["unlock","examine","say"][i],
    target_name:"",target_key:"",destination:"unspecified",utterance:i===2?"hello":"",excluded_targets:[],framing:"immediate",
    resolution:i===0?"roll_required":i===1?"auto":"conversational",reason:"",...(i===1?{depends_on:[0]}:{})}));
  intents[0].native_adjudication={trait:"Knowledge",kind:"action",difficulty:14,risk:"Uncertain lock",stakes:"It stays locked on failure",
    explanation:"Current reviewed mechanism.",saved_ruling_key:"unlock",override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],modifier_keys:[],attack_source:""};
  const [unlock,enter,warn]=persistPlayerIntents(db,guild,intents,scope,{messageId:"d06-compound"});
  let plan=buildActionPlan(db,guild,[unlock,enter,warn]);
  assert.deepEqual(plan.map(row=>row.data.status),["pending","suspended","ready"]);
  db.upsertRulesRuling(guild,{key:"unlock",createdBy:"gm",ruling:"Unlock this uncertain mechanism with Knowledge, Difficulty 14."});
  const a=adjudicateAcceptedIntent(db,guild,{acceptedIntent:unlock.record_key,mode:"roll_required",risk:"Uncertain lock",
    stakes:"It stays locked on failure",savedRulingKey:"unlock",trait:"Knowledge",kind:"action",difficulty:14,modifierKeys:[],
    explanation:"Current reviewed mechanism."},pc.owner_user_id,{scope});
  const q=db.getCityRecord(guild,"roll_request",a.roll_request_ref);let n=0;
  const request=contributeRoll(db,guild,pc.owner_user_id,{op:"roll",request:q.record_key,expected_revision:rollRevision(q),key:"d06-roll"},{rng:()=>[10,6][n++]});
  const completed=finalizeTypedRollAction(db,guild,request);
  assert.equal(completed.outcome,"success");
  plan=[unlock,enter,warn].map(row=>db.listCityRecords(guild,{kind:"compound_action",includeGM:true,limit:20})
    .find(node=>node.data.action_id===row.record_key));
  assert.deepEqual(plan.map(row=>row.data.status),["resolved","pending","ready"],"nondeterministic descendant stays explicitly pending; independent speech survives");
  assert.equal(db.listCityRecords(guild,{kind:"action_continuation",includeGM:true})[0].status,"needs_adjudication");
  assert.equal(finalizeTypedRollAction(db,guild,request).receipt,completed.receipt,"completion replay is idempotent");
  assert.equal(db.getCityRecord(guild,"typed_intent",unlock.record_key).data.outcome_receipt,completed.receipt);
  assert.equal(reconcileConsequences(db,guild,{intents:[unlock],narration:"The lock opens.",scope:{mode:"party"},strict:true})
    .actions[0].receipt_refs[0],completed.receipt);
  const orchestration=fs.readFileSync(new URL("../src/turn-orchestration.js",import.meta.url),"utf8");
  assert(/reconcileConsequences\([^;]+strict:true/s.test(orchestration),"live orchestration must not use permissive reconciliation");
  console.log("D06 continuation PASS: receipt completion, selective resume, replay and strict live reconciliation.");
});
