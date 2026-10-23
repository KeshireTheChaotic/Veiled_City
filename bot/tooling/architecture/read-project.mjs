import fs from 'node:fs';
import path from 'node:path';
import {parseExpressionAt} from 'acorn';
import {checkBoundaries,applyTransitions,violationId} from './boundary-checker.mjs';
import {checkBridgeRegistry,isFreshArchitectureTestPath} from './bridge-registry.mjs';

export function readStrictJson(text){
  const result=JSON.parse(text),tree=parseExpressionAt(text,0,{ecmaVersion:'latest'});
  function visit(node){
    if(node?.type==='ObjectExpression'){
      const keys=new Set();for(const property of node.properties){
        const key=String(property.key.value??property.key.name);if(keys.has(key))throw new TypeError('Duplicate JSON configuration key.');keys.add(key);visit(property.value);
      }
    }else if(node?.type==='ArrayExpression')for(const element of node.elements)visit(element);
  }
  visit(tree);return result;
}
function json(root,file){
  try{return readStrictJson(fs.readFileSync(path.join(root,file),'utf8'));}
  catch(error){throw Object.assign(new Error(`Invalid or unavailable JSON configuration: ${file}`),{code:'ARCHITECTURE_CONFIGURATION',file,cause:error});}
}
export function readProject(root){
  const base='docs/Implementation_Plans/Framework_Refactor',policy=json(root,`${base}/RF01/PACKAGES.json`),sources={};
  if(policy.legacyOwnership!==`${base}/OWNERSHIP_DECISIONS.json`)throw new Error('Legacy ownership must use the fixed source manifest.');
  function scan(folder){
    const absolute=path.join(root,folder);if(!fs.existsSync(absolute))return;
    for(const entry of fs.readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=`${folder}/${entry.name}`;
      if(entry.isSymbolicLink())throw Object.assign(new Error(`Source symlink requires explicit review: ${file}`),{code:'SOURCE_SYMLINK',file});
      if(entry.isDirectory())scan(file);else if(entry.isFile()&&!file.endsWith('.md'))sources[file]=fs.readFileSync(path.join(root,file),'utf8');
    }
  }
  scan('bot/src');scan('bot/tooling/architecture');
  for(const file of ['bot/scripts/export-campaign.mjs','bot/scripts/cost-estimate.mjs'])if(fs.existsSync(path.join(root,file)))sources[file]=fs.readFileSync(path.join(root,file),'utf8');
  if(!Object.keys(sources).some(file=>file.startsWith('bot/src/')))throw new Error('No active runtime source found.');
  return {sources,policy,legacy:json(root,policy.legacyOwnership),pkg:json(root,'bot/package.json')};
}
export function checkProject(root,{mode='ratchet',phase='RF01'}={}){
  if(!['strict','ratchet'].includes(mode))throw new TypeError('Architecture mode must be strict or ratchet.');
  const input=readProject(root),raw=checkBoundaries(input),base='docs/Implementation_Plans/Framework_Refactor/RF01';
  const registry=json(root,`${base}/BRIDGE_CONTRACTS.json`),testPaths=new Set();
  // Only stat explicitly named fresh test files; never read suites, fixture bodies or test registries.
  for(const entry of registry.pairs||[])for(const file of entry.tests||[])
    if(isFreshArchitectureTestPath(file)&&fs.existsSync(path.join(root,file)))testPaths.add(file);
  raw.violations.push(...checkBridgeRegistry({registry,report:raw,policy:input.policy,testPaths}).map(v=>({...v,id:violationId(v)})));
  raw.summary.rawViolationOccurrences=raw.violations.length;
  if(mode==='strict')return {...raw,mode,phase,summary:{...raw.summary,pass:raw.violations.length===0}};
  const legacyPaths=new Set(raw.modules.filter(module=>module.location?.startsWith('legacy')).map(module=>module.path));
  return {...applyTransitions(raw,json(root,`${base}/TRANSITIONS.json`),{
    phase,legacyPaths,baseline:json(root,`${base}/TRANSITION_BASELINE.json`)
  }),mode,phase};
}
