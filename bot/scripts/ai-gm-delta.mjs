/** Opt-in fresh delta runner. No inherited registry, watchers, polling, network or retries. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {selectFreshTests} from '../src/ai-gm-test-selection.js';

/** Reject duplicate object keys at the coverage root before JSON.parse can discard one. */
export function parseCoverageJson(text){
  if(typeof text!=='string')throw new TypeError('Coverage JSON must be text.');
  let i=0;const ws=()=>{while(/[\u0009\u000a\u000d\u0020]/.test(text[i]||'')&&i<text.length)i++;};
  const stringEnd=start=>{
    if(text[start]!=='"')throw new Error('Coverage JSON root keys must be strings.');
    let escaped=false;
    for(let n=start+1;n<text.length;n++){
      const c=text[n];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"')return n+1;
    }
    throw new Error('Malformed coverage JSON string.');
  };
  const valueEnd=()=>{
    ws();const start=i;if(i>=text.length)throw new Error('Missing coverage JSON value.');
    if(text[i]==='"'){i=stringEnd(i);return;}
    let depth=0,inString=false,escaped=false;
    for(;i<text.length;i++){
      const c=text[i];
      if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
      if(c==='"'){inString=true;continue;}
      if(c==='{'||c==='['){depth++;continue;}
      if(c===']'){depth--;if(depth<0)break;continue;}
      if(c==='}'){
        if(depth===0)break;
        depth--;continue;
      }
      if(c===','&&depth===0)break;
    }
    if(inString||depth!==0||i===start)throw new Error('Malformed coverage JSON value.');
  };
  ws();if(text[i++]!=='{')throw new Error('Coverage JSON root must be an object.');
  const keys=new Set();ws();
  while(text[i]!=='}'){
    const start=i,end=stringEnd(start),key=JSON.parse(text.slice(start,end));i=end;ws();
    if(text[i++]!==':')throw new Error('Malformed coverage JSON mapping.');
    if(keys.has(key))throw new Error(`Duplicate coverage mapping: ${key}`);keys.add(key);
    valueEnd();ws();if(text[i]===','){i++;ws();continue;}if(text[i]!=='}')throw new Error('Malformed coverage JSON root.');
  }
  i++;ws();if(i!==text.length)throw new Error('Trailing content after coverage JSON.');
  return JSON.parse(text);
}

export function runFreshDelta({changedPaths,coverage,root,execute=spawnSync,reportDirectory}){
  const selection=selectFreshTests(changedPaths,coverage);
  if(!selection.qualified)throw new Error(`Fresh coverage required: ${selection.uncovered.join(', ')}`);
  const sources=changedPaths.filter(p=>/^bot\/(src|scripts)\/.*\.(?:js|mjs|json)$/.test(p));
  const inputs=[...new Set([...sources,...selection.tests])].sort();
  const hashes=Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
  const result={run_id:`fresh-delta-${Date.now()}`,start:new Date().toISOString(),selection,hashes,syntax:[],test:null,
    release_authorized:false,provider_calls:0,provider_usage:'Offline tests only; Codex usage not measured by this runner.'};
  for(const file of inputs.filter(p=>/\.[cm]?js$/.test(p))){
    const args=['--check',file],run=execute(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000});
    result.syntax.push({file,exit:run.status,error:run.error?.message||run.stderr||null});
  }
  if(result.syntax.every(r=>r.exit===0)&&selection.tests.length){
    const args=['--test','--test-reporter=tap',...selection.tests];
    const run=execute(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
    result.test={command:['node',...args],exit:run.status,error:run.error?.message||null,
      summary:(run.stdout||'').split('\n').filter(l=>/^# (tests|pass|fail|cancelled|skipped|duration)|^not ok/.test(l))};
    if(reportDirectory){fs.mkdirSync(reportDirectory,{recursive:true});fs.writeFileSync(path.join(reportDirectory,result.run_id+'.log'),(run.stdout||'')+(run.stderr||''));}
  }
  result.end=new Date().toISOString();
  result.status=result.syntax.some(r=>r.exit!==0)||result.test&&result.test.exit!==0?'UNQUALIFIED':result.test?'TARGETED_PASS':'NO_PRODUCTION_TESTS';
  if(reportDirectory){fs.mkdirSync(reportDirectory,{recursive:true});fs.writeFileSync(path.join(reportDirectory,result.run_id+'.json'),JSON.stringify(result,null,2));}
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const base=process.argv[2]||'9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3';
  if(!/^[a-f0-9]{40}$/.test(base))throw new Error('Use an exact 40-character base commit SHA.');
  const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim();};
  const changedPaths=[...new Set([git(['diff','--name-only',base,'--']),git(['ls-files','--others','--exclude-standard'])].join('\n').split(/\r?\n/).filter(Boolean))];
  const coverage=parseCoverageJson(fs.readFileSync(path.join(root,'bot/tests/ai-gm-2026-10/coverage.json'),'utf8'));
  const result=runFreshDelta({changedPaths,coverage,root,reportDirectory:path.join(root,'bot/.reports/ai-gm-2026-10')});
  console.log(JSON.stringify({sha:git(['rev-parse','HEAD']),...result}));
  process.exitCode=result.status==='TARGETED_PASS'||result.status==='NO_PRODUCTION_TESTS'?0:1;
}
