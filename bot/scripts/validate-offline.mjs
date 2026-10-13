/** Required suites run in network-denied child processes with dummy credentials. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
const suites=["quality-check","format-check","check-source","validate-command-schema","i-heard-you-1-test","i-heard-you-2-test","i-heard-you-3-test","i-heard-you-4-test","i-heard-you-5-test","i-heard-you-6-test","i-heard-you-7-test","i-heard-you-9-test","i-heard-you-integration-test","offline-smoke-test","production-regression-test",
  "refactor-regression-test","operations-regression-test","npc-cognition-regression-test","audit-regression-test","simulation-regression-test",
  "seed-data-regression-test","seed-drafts-regression-test","city-regression-test","city-core-regression-test","city-civic-regression-test","city-depth-regression-test","narrative-contract-test",
  "context-conversation-test","prompt-budget-test","scene-entry-test","autonomous-world-test","typed-intents-regression-test","typed-intent-lifecycle-test","h01-source-recovery-test","h02-referent-movement-test","h03-post-turn-review-test","h04-narrative-claim-evidence-test","h05-discord-delivery-test","d01-roll-lifecycle-test","d02-roll-options-test","d03-roll-menu-test","d04-trait-sharing-test","d05-live-window-test","d06-continuation-test","d07-scoped-memory-test","session2-replay-test","session2-message-contract-test","typed-routing-authority-test","rules-adjudication-test","compound-action-test","scene-action-window-test","memory-lifecycle-test","consequence-reconciliation-test","legacy-authority-migration-test","gm-recovery-regression-test","movement-authorization-regression-test","memory-audience-isolation-test","relax-end-to-end-test","interaction-lifecycle-test","narrative-understanding-test","narrative-inference-test","natural-language-scope-test","rules-srd-test","story-continuity-test","negotiation-preview-test","endurance-test","portrayal-authoring-test",
  "expansion-a-test","expansion-b-test","expansion-c-test","expansion-d-test","expansion-e-test","expansion-f-test","expansion-quality-test","expansion-h-test",
  "end-to-end-a-test","end-to-end-b-test","end-to-end-c-test","end-to-end-d-test","end-to-end-e-test","end-to-end-f-test","end-to-end-g-test","end-to-end-h-test","end-to-end-i-test","systems-to-players-1-test","systems-to-players-2-test","systems-to-players-3-test","systems-to-players-4-test","systems-to-players-5-test","systems-to-players-6-test","systems-to-players-7-test","systems-to-players-9-test","implementation-phase-a-test","implementation-phase-b-test","implementation-phase-c-test","implementation-phase-d-test","implementation-phase-e-test","implementation-evaluation","typed-intent-qualification-test"];
suites.push("v94-pc-effect-authority-test","v94-pvp-profile-test","v94-pvp-attack-test","v94-pvp-reaction-test","v94-pvp-damage-test","v94-pc-death-test","v94-pc-recovery-test","v94-pvp-multiplayer-test","d08-window-security-test","v9-action-consent-test","v9-pvp-agreement-test","v9-pvp-typed-roll-test","v9-window-lifecycle-test",
  "v9-pvp-rounds-test","v9-pvp-authorship-test","v9-observation-compatibility-test","v9-npc-observation-test","v9-pvp-hope-fear-test","v94-pvp-qualification-test","v9-continuation-test","v9-roll-truth-test","v9-publication-test","v9-roll-ux-test","v9-discord-hardening-test",
  "d08-observability-test","v9-baseline-regressions-test","v9-release-qualification-test","v95-protected-narrative-test","v95-autonomous-fear-test","v95-pvp-ux-test","v95-operational-metrics-test");
suites.push("v95-validation-reporter-test","v95-deprecation-coverage-test");
suites.push("v96-baseline-test");
suites.push("v96-rules-discretion-test");
suites.push("v96-native-actions-test");
const report={fixture_only:true,network:"denied",billable_tokens:0,live_requests:0,suites:[],limits:["Synthetic fixtures do not establish unrestricted live-model semantics.","Consult I_HEARD_YOU_EVALUATION for measured false positives/negatives and unresolved ambiguities."]};

// VC_VALIDATION_REPORT_V1: compact, atomic, local-only suite diagnostics.
const reportPath=path.resolve(process.env.VC_VALIDATION_REPORT_PATH||path.join(".reports","offline-validation.json"));
const reportStarted=performance.now();
report.started_at=new Date().toISOString();
report.suites=suites.map(id=>({id,status:"not_run",duration_ms:null,exit_code:null,signal:null,failure:null}));

function safeTail(value){
  const output=String(value||"").replace(/\x1b\[[0-9;]*m/g,"")
    .replace(/\b(?:(?:sk-proj|sk|xox[baprs])-|gh[pousr]_)[A-Za-z0-9_-]{12,}\b/g,"[REDACTED_TOKEN]");
  let scrubbed=output;
  for(const name of ["OPENAI_API_KEY","DISCORD_TOKEN"]){
    const secret=process.env[name];if(secret&&secret.length>8) scrubbed=scrubbed.split(secret).join("[REDACTED_TOKEN]");
  }
  return scrubbed.split(/\r?\n/).slice(-25).join("\n").slice(-3000);
}
function saveReport(status){
  const counts={total:report.suites.length,passed:0,failed:0,not_run:0};
  for(const row of report.suites)counts[row.status]=(counts[row.status]||0)+1;
  report.summary={status,...counts,duration_ms:Math.round(performance.now()-reportStarted)};
  if(status!=="running")report.finished_at=new Date().toISOString();
  const folder=path.dirname(reportPath);
  fs.mkdirSync(folder,{recursive:true,mode:0o700});
  const temp=`${reportPath}.tmp-${process.pid}`;
  fs.writeFileSync(temp,JSON.stringify(report,null,2)+"\n",{mode:0o600});
  fs.renameSync(temp,reportPath);
}
saveReport("running");

for(let i=0;i<suites.length;i++){
  const suite=suites[i],started=performance.now();
  const result=spawnSync(process.execPath,["--import","./scripts/offline-guard.mjs",`scripts/${suite}.mjs`],{
    stdio:["ignore","pipe","pipe"],encoding:"utf8",maxBuffer:32*1024*1024,
    env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy",
      NODE_OPTIONS:`--import=${new URL("./offline-guard.mjs",import.meta.url).href}`}});
  const failed=!!result.error||result.status!==0;
  report.suites[i]={id:suite,status:failed?"failed":"passed",
    duration_ms:Math.round(performance.now()-started),exit_code:result.status,signal:result.signal||null,
    failure:failed?{message:safeTail(result.error?.message||""),
      stderr_tail:safeTail(result.stderr),stdout_tail:safeTail(result.stdout)}:null};
  saveReport(failed?"failed":"running");
  if(failed){
    const detail=report.suites[i];
    console.error(`VALIDATION FAIL ${suite}: exit=${detail.exit_code??"spawn_error"}; ${detail.duration_ms}ms; report=${reportPath}`);
    if(detail.failure.stderr_tail)console.error(detail.failure.stderr_tail);
    else if(detail.failure.stdout_tail)console.error(detail.failure.stdout_tail);
    if(detail.failure.message)console.error(detail.failure.message);
    process.exit(result.status||1);
  }
}
try{
report.acceptance=JSON.parse(fs.readFileSync(new URL("./fixtures/i-heard-you-acceptance.json",import.meta.url),"utf8")).map(row=>({...row,
  test_result:row.suites.every(id=>report.suites.some(suite=>suite.id===id&&suite.status==="passed"))?"passed":"missing_or_failed",
  status:row.status||"bounded_fixture_verified"}));
}catch{
  report.acceptance_failures=["invalid_acceptance_inventory"];
  saveReport("failed");
  console.error(`VALIDATION FAIL invalid acceptance inventory; report=${reportPath}`);
  process.exit(1);
}
if(report.acceptance.some(row=>row.test_result!=="passed")){
  report.acceptance_failures=report.acceptance.filter(row=>row.test_result!=="passed").map(row=>row.id||row.name||"unknown");
  saveReport("failed");
  console.error(`VALIDATION FAIL acceptance=${report.acceptance_failures.join(",")}; report=${reportPath}`);
  process.exit(1);
}
saveReport("passed");
console.log(`VALIDATION PASS ${report.summary.passed}/${report.summary.total} suites in ${report.summary.duration_ms}ms; network denied; live=0; billed=0; report=${reportPath}`);
