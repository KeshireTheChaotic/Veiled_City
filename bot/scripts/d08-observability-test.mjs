/** D08: traceable failures without retaining private text in diagnostic summaries. */
import assert from "node:assert/strict";
import { failureTrace } from "../src/failure-trace.js";
const error=Object.assign(new Error("private clue 3141"),{code:"NARRATIVE_INTEGRITY",
  diagnostic:{category:"source_span",source_span:"secret dialogue",source_ref:"authored-turn:fixture"}});
const trace=failureTrace(error,{turn_id:"turn:fixture",discord_message_id:"message-fixture",model_attempts:2,
  committed:"no",stage:"generating"});
assert.equal(trace.turn_id,"turn:fixture");assert.equal(trace.source_event,"authored-turn:fixture");
assert.equal(trace.category,"source_span");assert.equal(trace.model_attempts,2);
assert.equal(trace.recovery,"retry_saved_source");
assert(!JSON.stringify(trace).includes("3141"));assert(!JSON.stringify(trace).includes("secret dialogue"));
assert.equal(failureTrace(error,{committed:"yes"}).recovery,"resync_committed_output");
assert.equal(failureTrace(error,{committed:"unknown"}).recovery,"inspect_commit_receipt");
assert.equal(failureTrace(Object.assign(error,{diagnostic:{category:"private clue 3141"}}),{}).category,"unclassified");
console.log("D08 observability PASS: source/attempt correlation, recovery and private-text exclusion.");
