/** Required suites run in network-denied child processes with dummy credentials. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
const suites=["quality-check","format-check","check-source","validate-command-schema","i-heard-you-1-test","i-heard-you-2-test","i-heard-you-3-test","i-heard-you-4-test","i-heard-you-5-test","i-heard-you-6-test","i-heard-you-7-test","i-heard-you-9-test","i-heard-you-integration-test","offline-smoke-test","production-regression-test",
  "refactor-regression-test","operations-regression-test","npc-cognition-regression-test","audit-regression-test","simulation-regression-test",
  "seed-data-regression-test","seed-drafts-regression-test","city-regression-test","city-core-regression-test","city-civic-regression-test","city-depth-regression-test","narrative-contract-test",
  "context-conversation-test","prompt-budget-test","scene-entry-test","autonomous-world-test","typed-intents-regression-test","typed-intent-lifecycle-test","typed-routing-authority-test","rules-adjudication-test","compound-action-test","scene-action-window-test","memory-lifecycle-test","gm-recovery-regression-test","movement-authorization-regression-test","memory-audience-isolation-test","relax-end-to-end-test","interaction-lifecycle-test","narrative-understanding-test","narrative-inference-test","natural-language-scope-test","rules-srd-test","story-continuity-test","negotiation-preview-test","endurance-test","portrayal-authoring-test",
  "expansion-a-test","expansion-b-test","expansion-c-test","expansion-d-test","expansion-e-test","expansion-f-test","expansion-quality-test","expansion-h-test",
  "end-to-end-a-test","end-to-end-b-test","end-to-end-c-test","end-to-end-d-test","end-to-end-e-test","end-to-end-f-test","end-to-end-g-test","end-to-end-h-test","end-to-end-i-test","systems-to-players-1-test","systems-to-players-2-test","systems-to-players-3-test","systems-to-players-4-test","systems-to-players-5-test","systems-to-players-6-test","systems-to-players-7-test","systems-to-players-9-test","implementation-phase-a-test","implementation-phase-b-test","implementation-phase-c-test","implementation-phase-d-test","implementation-phase-e-test","implementation-evaluation"];
const report={fixture_only:true,network:"denied",billable_tokens:0,live_requests:0,suites:[],limits:["Synthetic fixtures do not establish unrestricted live-model semantics.","Consult I_HEARD_YOU_EVALUATION for measured false positives/negatives and unresolved ambiguities."]};
for(const suite of suites){
  const result=spawnSync(process.execPath,["--import","./scripts/offline-guard.mjs",`scripts/${suite}.mjs`],{stdio:"inherit",
    env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy",NODE_OPTIONS:`--import=${new URL("./offline-guard.mjs",import.meta.url).href}`}});
  report.suites.push({id:suite,status:result.error||result.status!==0?"failed":"passed",exit_code:result.status});
  if(result.error||result.status!==0){console.error(`VALIDATION_REPORT ${JSON.stringify(report)}`);if(result.error) throw result.error;process.exit(result.status||1);}
}
report.acceptance=JSON.parse(fs.readFileSync(new URL("./fixtures/i-heard-you-acceptance.json",import.meta.url),"utf8")).map(row=>({...row,
  test_result:row.suites.every(id=>report.suites.some(suite=>suite.id===id&&suite.status==="passed"))?"passed":"missing_or_failed",
  status:row.status||"bounded_fixture_verified"}));
if(report.acceptance.some(row=>row.test_result!=="passed")){console.error(`VALIDATION_REPORT ${JSON.stringify(report)}`);process.exit(1);}
console.log(`VALIDATION_REPORT ${JSON.stringify(report)}`);
console.log("Required validation PASS: network denied; zero live API requests or billable tokens.");
