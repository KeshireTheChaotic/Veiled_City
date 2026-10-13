/** DEP01-12: conservative retirement, exact retained gates and isolated negative mutation proof. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const root=path.resolve(".."),evidence=JSON.parse(fs.readFileSync("../docs/V95_05_DEPRECATION_EVIDENCE.json","utf8"));
test("DEP01/02/04 retired artifacts are absent; historical hashes and all mandatory suites remain",()=>{
  for(const row of evidence.retired){assert(!fs.existsSync(path.join(root,row.file)),row.file);assert.match(row.sha256,/^[a-f0-9]{64}$/);
    assert.match(row.last_change,/^[a-f0-9]{40}$/);}
  const runner=fs.readFileSync("scripts/validate-offline.mjs","utf8").split("const report=")[0];
  assert.equal(evidence.mandatory_suites.length,130);
  for(const id of evidence.mandatory_suites)assert(runner.includes(`"${id}"`),`${id} cannot be removed without proof`);
  for(const row of evidence.assertions)assert(fs.readFileSync(`scripts/${row.old_suite}.mjs`,"utf8").includes(row.assertion),
    `${row.old_suite}:${row.line} historical assertion cannot be silently dropped`);
});
test("all original PvP inventory IDs and native exports survive consolidation",async()=>{
  const service=await import("../src/narrative-pvp.js");
  for(const name of ["proposePvp","reviewPvp","respondPvp","revisePvp","rollPvp","authorPvpNarrative","sharePvpNarrative"])
    assert.equal(typeof service[name],"function",name);
  const matrix=fs.readFileSync("../docs/V9_REGRESSION_MATRIX.csv","utf8");assert.equal(evidence.availability.length,32);
  for(const row of evidence.availability)assert(matrix.includes(`,${row.old_case_id},`));
});
test("DEP03/06/08/09 compatibility and corrected v7 behavioral sentinel are retained",()=>{
  for(const file of ["src/legacy-authority.js","scripts/legacy-authority-migration-test.mjs","scripts/v7-delta-baseline-test.mjs"])
    assert(fs.existsSync(file));
  const v7=fs.readFileSync("scripts/v7-delta-baseline-test.mjs","utf8");
  assert(v7.includes("d01-roll-lifecycle-test.mjs"));assert(v7.includes("d05-live-window-test.mjs"));
  for(const prefix of ["i-heard-you-","systems-to-players-","implementation-phase-","end-to-end-"])
    assert(evidence.mandatory_suites.some(id=>id.startsWith(prefix)));
});
test("DEP11 unchanged D08 negative detects removal of consent authority in an isolated source copy",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-deprecation-mutant-"));
  try{
    fs.cpSync("src",path.join(dir,"src"),{recursive:true});fs.cpSync("sql",path.join(dir,"sql"),{recursive:true});
    fs.mkdirSync(path.join(dir,"scripts"));fs.writeFileSync(path.join(dir,"package.json"),'{"type":"module"}');
    for(const file of ["d08-window-security-test.mjs","offline-guard.mjs"])fs.copyFileSync(`scripts/${file}`,path.join(dir,"scripts",file));
    const run=()=>spawnSync(process.execPath,["--import","./scripts/offline-guard.mjs","scripts/d08-window-security-test.mjs"],
      {cwd:dir,encoding:"utf8",env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy"}});
    const before=run();assert.equal(before.status,0,before.stderr);
    const file=path.join(dir,"src/scene-action-window.js"),source=fs.readFileSync(file,"utf8");
    const guard="&&(!required.length||!validateActionConsent(db,guild,input.consent_refs||[],{window,accepted,input})))";
    assert.equal(source.split(guard).length,2,"mutant must remove exactly the native consent guard");
    fs.writeFileSync(file,source.replace(guard,"&&false)"));
    const after=run();assert.notEqual(after.status,0);assert.match(after.stderr,/Missing expected exception/);
    assert.match(after.stderr,/stale unrelated consent must not authorize/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
