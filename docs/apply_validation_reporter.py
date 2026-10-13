#!/usr/bin/env python3
"""Safely enhance the existing offline runner in a local Veiled City checkout.

Preserves the current suite registry and its acceptance inventory. Refuses unfamiliar
runner structure rather than overwriting V95-04 work. Does not commit or push.
"""
import argparse
import pathlib
import re
import sys

MARKER = "VC_VALIDATION_REPORT_V1"

FUNCTIONS = r'''
// VC_VALIDATION_REPORT_V1: compact, atomic, local-only suite diagnostics.
const reportPath=path.resolve(process.env.VC_VALIDATION_REPORT_PATH||path.join(".reports","offline-validation.json"));
const reportStarted=performance.now();
report.started_at=new Date().toISOString();
report.suites=suites.map(id=>({id,status:"not_run",duration_ms:null,exit_code:null,signal:null,failure:null}));

function safeTail(value){
  const output=String(value||"").replace(/\x1b\[[0-9;]*m/g,"")
    .replace(/\b(?:sk-proj|sk|gh[pousr]|xox[baprs])-[A-Za-z0-9_-]{12,}\b/g,"[REDACTED_TOKEN]");
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
'''

LOOP = r'''for(let i=0;i<suites.length;i++){
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
'''

OLD_END = '''if(report.acceptance.some(row=>row.test_result!=="passed")){console.error(`VALIDATION_REPORT ${JSON.stringify(report)}`);process.exit(1);}
console.log(`VALIDATION_REPORT ${JSON.stringify(report)}`);
console.log("Required validation PASS: network denied; zero live API requests or billable tokens.");'''
NEW_END = '''if(report.acceptance.some(row=>row.test_result!=="passed")){
  report.acceptance_failures=report.acceptance.filter(row=>row.test_result!=="passed").map(row=>row.id||row.name||"unknown");
  saveReport("failed");
  console.error(`VALIDATION FAIL acceptance=${report.acceptance_failures.join(",")}; report=${reportPath}`);
  process.exit(1);
}
saveReport("passed");
console.log(`VALIDATION PASS ${report.summary.passed}/${report.summary.total} suites in ${report.summary.duration_ms}ms; network denied; live=0; billed=0; report=${reportPath}`);'''


def apply(root: pathlib.Path, dry_run: bool) -> None:
    runner = root / "bot" / "scripts" / "validate-offline.mjs"
    ignore = root / "bot" / ".gitignore"
    if not runner.is_file():
        raise ValueError(f"Runner not found: {runner}")
    src = runner.read_text(encoding="utf-8")
    if MARKER in src:
        print(f"Already integrated: {runner}")
        return
    start = src.find("for(const suite of suites){")
    stop = src.find("report.acceptance=", start)
    if start < 0 or stop < 0:
        raise ValueError("Runner loop/acceptance has changed; integrate manually, do not overwrite local V95-04 logic")
    original = src[start:stop]
    if "spawnSync" not in original or "report.suites.push" not in original or "stdio:\"inherit\"" not in original:
        raise ValueError("Runner loop differs from audited structure; manual integration needed")
    if src.count(OLD_END) != 1:
        raise ValueError("Runner terminal acceptance/reporting logic has changed; manual integration needed")
    # Do not replace or otherwise edit the existing suites registry or acceptance checks.
    new_src = src[:start] + FUNCTIONS + "\n" + LOOP + src[stop:]
    new_src = new_src.replace(OLD_END, NEW_END)
    if 'import path from "node:path";' not in new_src:
        new_src = new_src.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport path from "node:path";\nimport { performance } from "node:perf_hooks";')
    elif 'import { performance } from "node:perf_hooks";' not in new_src:
        new_src = new_src.replace('import path from "node:path";', 'import path from "node:path";\nimport { performance } from "node:perf_hooks";')
    old_ignore = ignore.read_text(encoding="utf-8") if ignore.exists() else ""
    new_ignore = old_ignore if ".reports/" in old_ignore.splitlines() else old_ignore.rstrip("\n")+"\n.reports/\n"
    if dry_run:
        print(f"Dry run OK. Would change {runner} and {ignore}; existing suite registry preserved.")
        return
    # Write only after all checks pass. If a write errors, user's git working tree shows the diff.
    runner.write_text(new_src,encoding="utf-8")
    ignore.write_text(new_ignore,encoding="utf-8")
    print(f"Applied compact reporter to {runner}")
    print("JSON report: bot/.reports/offline-validation.json (ignored by Git)")
    print("Run `node --check scripts/validate-offline.mjs` from bot before qualification.")


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo",type=pathlib.Path,required=True,help="Local Veiled City root (containing bot/)")
    parser.add_argument("--apply",action="store_true",help="Actually modify working tree (default is dry run)")
    args=parser.parse_args()
    try:
        apply(args.repo.resolve(),not args.apply)
    except (ValueError,OSError) as exc:
        print(f"NOT APPLIED: {exc}",file=sys.stderr)
        sys.exit(2)
