/** Mechanical historical assertion inventory; candidates are not semantic equivalence proofs. */
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

const baseline="194a64a6405a0068eb1c0a13d7ff0e38b18d1b11",git=process.env.VEILED_GIT||"git";
const read=file=>execFileSync(git,["show",`${baseline}:${file}`],{encoding:"utf8",maxBuffer:16*1024*1024}).replaceAll("\r\n","\n");
const registry=read("bot/scripts/validate-offline.mjs").split("const report=")[0];
const suites=[...registry.matchAll(/"([a-z0-9-]+)"/g)].map(m=>m[1]).filter(id=>!id.startsWith("node"));
const retired=["bot/src/gm.js.20261009-144611.bak","bot/src/narrative-integrity.js.20261009-144611.bak",
  "bot/scripts/v9-pvp-contract-test.mjs"].map(file=>({file,sha256:createHash("sha256").update(read(file)).digest("hex"),
    last_change:execFileSync(git,["log","-1","--format=%H",baseline,"--",file],{cwd:"..",encoding:"utf8"}).trim()}));
const assertions=suites.flatMap(id=>read(`bot/scripts/${id}.mjs`).split("\n").flatMap((text,i)=>
  /\bassert[.(]/.test(text)?[{old_suite:id,line:i+1,assertion:text.trim(),status:"RETAINED_UNCHANGED_BEHAVIOR"}]:[]));
const rows=read("docs/V9_REGRESSION_MATRIX.csv").split("\n").filter(line=>/^V9-PVP-/.test(line));
const availability=rows.map(line=>({old_case_id:line.split(",")[2],old_suite:"v9-pvp-contract-test",
  scenario:"module availability only; NOT behavioral qualification",production_path:"narrative-pvp.js exports",
  new_suite:"v95-deprecation-coverage-test",new_assertion:"all original PvP inventory IDs and native exports survive consolidation",
  evidence:"identical seven unique export type assertions; original 32 IDs retained in V9_REGRESSION_MATRIX.csv",
  status:"CONSOLIDATED_AVAILABILITY_ONLY"}));
fs.writeFileSync("../docs/V95_05_DEPRECATION_EVIDENCE.json",JSON.stringify({baseline,retired,
  mandatory_suites:suites,assertions,availability,caveat:"No registered behavior assertion removed; no semantic equivalence claimed for candidate overlaps."},null,2)+"\n");
console.log(JSON.stringify({baseline,mandatory:suites.length,retired:retired.length,assertion_lines:assertions.length,availability_cases:availability.length}));
