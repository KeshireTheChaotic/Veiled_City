/** Required suites run in network-denied child processes with dummy credentials. */
import { spawnSync,execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {selectValidationSuites} from './validation-selection.mjs';
const suites=["quality-check","format-check","check-source","validate-command-schema",
  "refactor-regression-test","audit-regression-test",
  "typed-intent-lifecycle-test","h01-source-recovery-test","h02-referent-movement-test","h05-discord-delivery-test","session2-message-contract-test","typed-routing-authority-test","legacy-authority-migration-test","interaction-lifecycle-test","rules-srd-test",
  "implementation-phase-a-test","implementation-phase-d-test","implementation-phase-e-test","implementation-evaluation","typed-intent-qualification-test"];
suites.push("v9-action-consent-test",
  "d08-observability-test");
suites.push("v95-validation-reporter-test");
suites.push("session5-routing-test");
suites.push("critical-validation-profile-test");
suites.push("validation-selection-test");
suites.push("narrative-deployment-safety-test");
suites.push("semantic-native-alias-recall-test");
suites.push("pvp-safety-command-test");
suites.push("native-feature-rule-context-test");
suites.push("native-environment-proposals-test");
suites.push("pre-roll-fear-recovery-test");
suites.push("native-feature-authoring-test");
suites.push("audience-first-framework-test");
// Critical is the release gate. Optional feature/history matrices remain executable via --extended;
// no source assertion is deleted, and historical registration inventory stays intact above.
const extendedSuiteInventory=[...suites];
const optionalFeatureMatrices=new Set([
  "refactor-regression-test","audit-regression-test","implementation-phase-a-test","implementation-phase-d-test","implementation-phase-e-test","implementation-evaluation"
]);
const validationProfile=process.argv.includes('--extended')?'extended':'critical';
if(validationProfile==='critical')suites.splice(0,suites.length,...suites.filter(id=>!optionalFeatureMatrices.has(id)));
const report={fixture_only:true,network:"denied",billable_tokens:0,live_requests:0,suites:[],limits:["Synthetic fixtures do not establish unrestricted live-model semantics.","Consult I_HEARD_YOU_EVALUATION for measured false positives/negatives and unresolved ambiguities."]};
report.profile=typeof validationProfile==='undefined'?'fixture':validationProfile;
report.deferred_optional_suites=typeof extendedSuiteInventory==='undefined'?[]:extendedSuiteInventory.filter(id=>!suites.includes(id));
report.selection={mode:'full',reason:'default_full_gate'};
if(process.argv.includes('--changed')){
  let paths=null,clean=true;
  const base=process.env.VC_CHANGED_BASE;
  if(/^[a-f0-9]{40}$/.test(base||'')&&!/^0+$/.test(base)){
    try{
      const git=process.env.VEILED_GIT||'git',options={cwd:path.resolve('..'),encoding:'utf8'};
      clean=!execFileSync(git,['status','--porcelain','--untracked-files=normal'],options).trim();
      if(clean)paths=execFileSync(git,['diff','--name-only','--diff-filter=ACDMRTUXB','-z',base,'HEAD','--'],options).split('\0').filter(Boolean);
    }
    catch{ /* Missing/shallow ancestry selects the full gate, never zero tests. */ }
  }
  const selection=selectValidationSuites(suites,paths,{clean}),chosen=new Set(selection.suites);
  report.not_selected_suites=suites.filter(id=>!chosen.has(id));
  suites.splice(0,suites.length,...selection.suites);
  report.selection={mode:selection.mode,reason:selection.reason};
}
report.release_qualified=false; // Whole-plan completion and exact-SHA release gates are separate.
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
  const result=spawnSync(process.execPath,["--test-reporter=spec","--import","./scripts/offline-guard.mjs",`scripts/${suite}.mjs`],{
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
    if(detail.failure.stdout_tail)console.error(detail.failure.stdout_tail);
    if(detail.failure.message)console.error(detail.failure.message);
    process.exit(result.status||1);
  }
}
try{
report.acceptance=JSON.parse(fs.readFileSync(new URL("./fixtures/i-heard-you-acceptance.json",import.meta.url),"utf8")).map(row=>({...row,
  test_result:row.suites.every(id=>report.suites.some(suite=>suite.id===id&&suite.status==="passed"))?"passed"
    :report.selection.mode==='focused'&&row.suites.some(id=>report.not_selected_suites.includes(id))?'not_selected':'missing_or_failed',
  status:row.status||"bounded_fixture_verified"}));
}catch{
  report.acceptance_failures=["invalid_acceptance_inventory"];
  saveReport("failed");
  console.error(`VALIDATION FAIL invalid acceptance inventory; report=${reportPath}`);
  process.exit(1);
}
if(report.acceptance.some(row=>row.test_result==='missing_or_failed')){
  report.acceptance_failures=report.acceptance.filter(row=>row.test_result==='missing_or_failed').map(row=>row.id||row.name||"unknown");
  saveReport("failed");
  console.error(`VALIDATION FAIL acceptance=${report.acceptance_failures.join(",")}; report=${reportPath}`);
  process.exit(1);
}
saveReport("passed");
console.log(`VALIDATION ${report.selection.mode==='focused'?'FOCUSED ':''}PASS ${report.summary.passed}/${report.summary.total} suites in ${report.summary.duration_ms}ms; network denied; live=0; billed=0; report=${reportPath}`);
