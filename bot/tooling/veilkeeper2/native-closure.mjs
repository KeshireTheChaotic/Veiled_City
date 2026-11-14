import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {analyzeModule,hash} from './source-audit.mjs';
import {TOOL_NAMES} from '../../src/v2/kernel.js';
import {GENERIC_TOOL_CONTRACTS} from '../../src/v2/tool-contracts.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const files=new Set(git('ls-files').split('\n'));
const native=[...files].filter(f=>f.startsWith('bot/src/v2/')&&/\.(?:m?js|cjs)$/.test(f)).sort();
const modules=new Map();
function load(file){if(modules.has(file))return modules.get(file);const value=analyzeModule(file,fs.readFileSync(path.join(root,file),'utf8'),files);modules.set(file,value);return value;}
for(const file of native)load(file);
const entries=['bot/src/v2/native-start.js','bot/src/v2/register-commands.js','bot/tooling/veilkeeper2/runtime-snapshot.mjs'];
const reachable=new Set();
function visit(file){if(reachable.has(file))return;reachable.add(file);for(const edge of load(file).imports)if(edge.target&&/\.(?:m?js|cjs)$/.test(edge.target))visit(edge.target);}
for(const entry of entries)visit(entry);
const issues=[...modules.values()].flatMap(m=>m.imports.filter(e=>['missing','dynamic-unresolved'].includes(e.status)).map(e=>({file:m.file,...e})));
const names=GENERIC_TOOL_CONTRACTS.map(t=>t.name);
if(JSON.stringify(names)!==JSON.stringify(TOOL_NAMES)||names.length!==4)throw new Error('Four-capability contract drift');
const report={head:git('rev-parse','HEAD'),baseline:'1ba6c7e15db1a66ba34b36336f31437beffe44d6',scope:'Current native runtime static imports, including literal dynamic imports; not runtime call binding, mechanical parity or retirement proof.',entries,tools:names,nativeModules:native.length,reachableNativeModules:native.filter(f=>reachable.has(f)).length,uncomposedNativeModules:native.filter(f=>!reachable.has(f)),legacyImportClosure:[...reachable].filter(f=>!f.startsWith('bot/src/v2/')&&!entries.includes(f)).sort(),importIssues:issues,modules:[...modules.values()].sort((a,b)=>a.file.localeCompare(b.file)).map(m=>({file:m.file,sha256:m.sha256,reachable:reachable.has(m.file),exports:m.exports,imports:m.imports,functions:m.functions.length,sqlStatements:m.sql.length}))};
fs.writeFileSync(path.join(root,'docs/veilkeeper2/NATIVE_DEPENDENCY_MAP.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({nativeModules:report.nativeModules,reachableNativeModules:report.reachableNativeModules,uncomposedNativeModules:report.uncomposedNativeModules.length,legacyImportClosure:report.legacyImportClosure.length,importIssues:issues.length,tools:names,scriptHash:hash(fs.readFileSync(fileURLToPath(import.meta.url)))}));
