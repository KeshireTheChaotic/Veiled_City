import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {analyzeModule,verifyReferences,hash} from './source-audit.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),pin='1ba6c7e15db1a66ba34b36336f31437beffe44d6',upstream=process.argv[2],snapshot=process.argv[3];
if(!/^[a-f0-9]{40}$/.test(upstream??'')||!snapshot)throw new Error('Exact upstream commit and extracted source snapshot required');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});
git('merge-base','--is-ancestor',pin,upstream);
const files=new Set(git('ls-tree','-r','--name-only',upstream).trim().split('\n')),cache=new Map();
const read=file=>{if(!cache.has(file)){const source=file.startsWith('bot/src/')?fs.readFileSync(path.resolve(root,snapshot,file),'utf8'):git('show',`${upstream}:${file}`);cache.set(file,source);}return cache.get(file);};
const changed=git('diff','--name-only',pin,upstream).trim().split('\n'),modules=[],errors=[];
for(const file of [...files].filter(f=>f.startsWith('bot/src/')&&/\.(?:m?js|cjs)$/.test(f)).sort()){
 try{const source=read(file),m=analyzeModule(file,source,files);modules.push(m);}catch(error){errors.push({file,error:error.message});}
}
const map=new Map(modules.map(m=>[m.file,m])),referenceFile='docs/veilkeeper2/VEILKEEPER_2_ASTRA6_REBUILD_HANDOFF.md',handoff=fs.readFileSync(path.join(root,referenceFile),'utf8'),pinnedRefs=JSON.parse(fs.readFileSync(path.join(root,'docs/veilkeeper2/SOURCE_REFERENCE_AUDIT.json'),'utf8'));
const references=verifyReferences(handoff.replaceAll(pin,upstream),read).map((r,index)=>({...r,pinned:pinnedRefs.find(p=>p.file===r.file&&p.start===r.start&&p.end===r.end)??null,changeStatus:changed.includes(r.file)?'changed-source-requires-semantic-review':'unchanged-source'}));
const symbols=JSON.parse(fs.readFileSync(path.join(root,'docs/veilkeeper2/SYMBOL_REFERENCE_AUDIT.json'),'utf8')).map(ref=>{
 const same=(map.get(ref.file)?.functions??[]).filter(f=>f.name===ref.name),locations=same.length?same.map(f=>({file:ref.file,...f})):modules.flatMap(m=>m.functions.filter(f=>f.name===ref.name&&ref.definitions.some(old=>old.sha256===f.sha256)).map(f=>({file:m.file,...f})));
 return {file:ref.file,name:ref.name,citedStart:ref.citedStart,citedEnd:ref.citedEnd,locations,bodyHashMatchesPin:locations.length>0&&locations.every(f=>ref.definitions.some(old=>old.sha256===f.sha256)),status:changed.includes(ref.file)||!same.length?'semantic-review-required':'unchanged-source-symbol'};
});
const runtime=modules.map(m=>({file:m.file,sha256:m.sha256,functions:m.functions,exports:m.exports,imports:m.imports,registrations:m.registrations,sql:m.sql,callCount:m.calls.length,...(changed.includes(m.file)?{changedCallsites:m.calls}:{})}));
const report={pin,upstream,snapshot,scope:'Static source audit only, no upstream runtime or tests executed and no merge. Original pinned audit retained.',changedFiles:changed,summary:{changedFiles:changed.length,runtimeModules:modules.length,changedRuntimeModules:modules.filter(m=>changed.includes(m.file)).length,functions:modules.reduce((n,m)=>n+m.functions.length,0),imports:modules.reduce((n,m)=>n+m.imports.length,0),parseErrors:errors.length,unresolvedImports:modules.flatMap(m=>m.imports.filter(i=>['missing','dynamic-unresolved'].includes(i.status))).length,referenceRanges:references.length,changedReferenceRanges:references.filter(r=>r.changeStatus.startsWith('changed-')).length,invalidRanges:references.filter(r=>!r.rangeValid).length},errors,references,symbols,runtime};
fs.writeFileSync(path.join(root,'docs/veilkeeper2/UPSTREAM_15A8F_SOURCE_AUDIT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
