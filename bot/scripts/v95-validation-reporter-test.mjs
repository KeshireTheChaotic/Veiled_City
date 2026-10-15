/** Isolated runner fixtures: never execute the real mandatory suite registry. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const runner=fs.readFileSync(new URL("./validate-offline.mjs",import.meta.url),"utf8");
function fixture(run){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-reporter-"));
  try{
    const scripts=path.join(root,"scripts");fs.mkdirSync(path.join(scripts,"fixtures"),{recursive:true});
    fs.copyFileSync(new URL("./offline-guard.mjs",import.meta.url),path.join(scripts,"offline-guard.mjs"));
    fs.writeFileSync(path.join(scripts,"pass.mjs"),'console.log("PASS_LOG_PRIVATE_MARKER");');
    fs.writeFileSync(path.join(scripts,"fail.mjs"),'console.error("sk-proj-VERYSECRETTESTTOKEN1234567");console.log("FAILED_ASSERTION_EXPECTED");process.exit(7);');
    const invoke=(names,acceptance,{reportPath,malformed=false}={})=>{
      const pattern=/const suites=([\s\S]*?);\s*const report=/;
      assert.equal([...runner.matchAll(new RegExp(pattern,"g"))].length,1);
      fs.writeFileSync(path.join(scripts,"validate-offline.mjs"),runner.replace(pattern,`const suites=${JSON.stringify(names)};\nconst report=`));
      fs.writeFileSync(path.join(scripts,"fixtures/i-heard-you-acceptance.json"),malformed?"{":JSON.stringify(acceptance));
      const result=spawnSync(process.execPath,["scripts/validate-offline.mjs"],{cwd:root,encoding:"utf8",
        env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy",VC_VALIDATION_REPORT_PATH:reportPath||""}});
      const file=path.join(root,".reports/offline-validation.json");
      return {...result,report:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null};
    };
    return run(invoke,root);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test("compact reporter preserves early failure, not-run identity and redacts local diagnostics",()=>fixture(invoke=>{
  const r=invoke(["pass","fail","never"],[{id:"accept",suites:["pass"]}]);
  assert.equal(r.status,7);assert.deepEqual(r.report.suites.map(s=>s.status),["passed","failed","not_run"]);
  assert.equal(r.report.suites[1].exit_code,7);assert(r.report.suites[0].duration_ms>=0);
  assert(!JSON.stringify(r.report).includes("VERYSECRET"));assert(!`${r.stdout}${r.stderr}`.includes("PASS_LOG_PRIVATE_MARKER"));
  assert.equal(r.report.summary.status,"failed");
  assert(r.stderr.includes('FAILED_ASSERTION_EXPECTED'),'Warning stderr must not hide the failed assertion stdout.');
}));
test("compact reporter succeeds silently and preserves acceptance",()=>fixture(invoke=>{
  const r=invoke(["pass"],[{id:"accept",suites:["pass"]}]);assert.equal(r.status,0);
  assert.equal(r.stdout.trim().split("\n").length,1);assert.equal(r.report.summary.passed,1);
  assert.equal(r.report.acceptance[0].test_result,"passed");assert.equal(r.report.suites[0].failure,null);
  assert.equal(r.report.network,"denied");assert.equal(r.report.live_requests,0);assert.equal(r.report.billable_tokens,0);
}));
test("invalid and malformed acceptance cannot leave a success or running report",()=>fixture(invoke=>{
  for(const [data,options] of [[[{id:"missing",suites:["not-registered"]}],{}],[[],{malformed:true}],[{},{}]]){
    const r=invoke(["pass"],data,options);assert.notEqual(r.status,0);assert.equal(r.report.summary.status,"failed");
  }
}));
test("report storage failure never yields PASS",()=>fixture((invoke,root)=>{
  const blocked=path.join(root,"blocked");fs.writeFileSync(blocked,"not a directory");
  const r=invoke(["pass"],[],{reportPath:path.join(blocked,"report.json")});
  assert.notEqual(r.status,0);assert(!r.stdout.includes("VALIDATION PASS"));
}));
