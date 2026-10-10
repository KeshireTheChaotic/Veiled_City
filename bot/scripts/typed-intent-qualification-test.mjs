/** T08: aggregate release-blocking metrics and phase-suite registration. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { qualifyTypedIntentRelease } from "../src/typed-intent-qualification.js";

const required=["typed-intent-lifecycle-test","typed-routing-authority-test","rules-adjudication-test","compound-action-test",
  "scene-action-window-test","memory-audience-isolation-test","memory-lifecycle-test","consequence-reconciliation-test",
  "legacy-authority-migration-test"];
const validator=fs.readFileSync(new URL("./validate-offline.mjs",import.meta.url),"utf8");
for(const id of required)assert(validator.includes(`"${id}"`),`${id} must be in the default offline gate`);
const zero={semantic_omissions:0,semantic_overreach:0,false_success:0,false_refusal:0,mis_scoped_npc_knowledge:0,
  unnecessary_rolls:0,missing_rolls:0,duplicate_receipts:0,invalid_cross_player_conflicts:0,secret_leaks:0,
  unauthorized_effects:0,skipped_security_suites:0};
const qualified=qualifyTypedIntentRelease(zero,{required_suites:required,passed_suites:required});
assert.equal(qualified.ready,true);assert.equal(qualified.billable_tokens,0);assert.equal(qualified.live_requests,0);
for(const metric of ["false_success","missing_rolls","duplicate_receipts","invalid_cross_player_conflicts","secret_leaks","unauthorized_effects"])
  assert.equal(qualifyTypedIntentRelease({...zero,[metric]:1},{required_suites:required,passed_suites:required}).ready,false,metric);
assert.equal(qualifyTypedIntentRelease(zero,{required_suites:required,passed_suites:required.slice(1)}).ready,false);
assert(validator.includes("offline-guard.mjs"));assert(validator.includes('OPENAI_API_KEY:"offline-dummy"'));
console.log("T08 qualification PASS: all phase gates registered; release blockers and offline guard enforced.");
