import path from 'node:path';
import {builtinModules} from 'node:module';
import {createHash} from 'node:crypto';
import {parseModule} from './ast-imports.mjs';
import {stronglyConnected} from './source-graph.mjs';

const infrastructure=new Set(['application','bootstrap','kernel','tooling']);
const builtins=new Set(builtinModules.map(name=>name.replace(/^node:/,'')));
const scalar=value=>value??null;
export function violationId(value){
  return createHash('sha256').update(JSON.stringify(['code','from','to','kind','specifier','detail','owner'].map(key=>scalar(value[key])))).digest('hex');
}
function canonicalPair(name,frameworks){
  const members=name.split('--');return members.length===2&&members[0]!==members[1]&&members.every(m=>frameworks.includes(m))&&[...members].sort().join('--')===name;
}
export function classifySource(file,policy,legacyOwners){
  let match=file.match(/^bot\/src\/frameworks\/([^/]+)\//);
  if(match)return policy.frameworks.includes(match[1])?{owner:match[1],role:'framework',location:'new'}:null;
  match=file.match(/^bot\/src\/framework-to-framework\/([^/]+)\//);
  if(match)return canonicalPair(match[1],policy.frameworks)?{owner:match[1],role:'pair',location:'new'}:null;
  if(/^bot\/src\/application\/(composition|workflows)\//.test(file))return {owner:'application',role:'application',location:'new'};
  match=file.match(/^bot\/src\/(kernel|bootstrap)\//);if(match)return {owner:match[1],role:match[1],location:'new'};
  if(file.startsWith('bot/tooling/'))return {owner:'tooling',role:'tooling',location:'tooling'};
  if(['bot/scripts/export-campaign.mjs','bot/scripts/cost-estimate.mjs'].includes(file))return {owner:'tooling',role:'tooling',location:'legacy-cli'};
  const owner=legacyOwners.get(file);if(!owner)return null;
  return {owner,role:owner.includes('--')?'pair':infrastructure.has(owner)?owner:'framework',location:'legacy'};
}
function legacyMap(decisions,policy){
  const result=new Map();for(const group of decisions.groups||[]){
    if(!policy.frameworks.includes(group.owner)&&!infrastructure.has(group.owner)&&!canonicalPair(group.owner,policy.frameworks))throw new TypeError('Unknown legacy owner.');
    for(const name of group.files.split(/\s+/).filter(Boolean)){
      const file=`bot/src/${name}`;if(result.has(file))throw new TypeError(`Duplicate legacy owner: ${file}`);result.set(file,group.owner);
    }
  }return result;
}
function packageRoot(specifier){return specifier.startsWith('@')?specifier.split('/').slice(0,2).join('/'):specifier.split('/')[0];}
function resolve(from,specifier,files,pkg,seen=new Set()){
  if(specifier===null)return {error:'COMPUTED_IMPORT_REVIEW'};
  if(specifier.startsWith('#')){
    if(seen.has(specifier))return {error:'IMPORT_ALIAS_REVIEW'};seen.add(specifier);
    let mapped=pkg.imports?.[specifier];
    if(mapped===undefined)for(const key of Object.keys(pkg.imports||{}).filter(k=>k.includes('*')).sort((a,b)=>b.length-a.length)){
      const [prefix,suffix]=key.split('*');if(specifier.startsWith(prefix)&&specifier.endsWith(suffix)){
        mapped=pkg.imports[key];if(typeof mapped==='string')mapped=mapped.replaceAll('*',specifier.slice(prefix.length,suffix?-suffix.length:undefined));break;
      }
    }
    if(typeof mapped!=='string')return {error:'IMPORT_ALIAS_REVIEW'};
    if(mapped.startsWith('./'))return local(path.posix.normalize(`bot/${mapped.slice(2)}`),files);
    return resolve(from,mapped,files,pkg,seen);
  }
  if(/[?%#]/.test(specifier))return {error:'IMPORT_SPECIFIER_REVIEW'};
  if(specifier.startsWith('/')||/^[a-zA-Z]:/.test(specifier)||/^(?:file|data|https?):/.test(specifier))return {error:'IMPORT_URL_REVIEW'};
  if(specifier.startsWith('.'))return local(path.posix.normalize(path.posix.join(path.posix.dirname(from),specifier)),files);
  const name=specifier.replace(/^node:/,'');if(builtins.has(name))return {external:`node:${name}`,package:`node:${name}`};
  if(specifier.startsWith('node:'))return {error:'UNKNOWN_NODE_MODULE'};
  const root=packageRoot(specifier);
  if(root===pkg.name)return {error:'SELF_PACKAGE_IMPORT_REVIEW'};
  if(!Object.hasOwn(pkg.dependencies||{},root)&&!Object.hasOwn(pkg.devDependencies||{},root))return {error:'UNDECLARED_PACKAGE'};
  return {external:specifier,package:root};
}
function local(to,files){
  if(!/^bot\/(src|tooling|scripts)\//.test(to))return {error:'IMPORT_ROOT_ESCAPE',to};
  return files.has(to)?{to}:{error:'MISSING_IMPORT',to};
}
function edgeRule(from,to,target,policy){
  if(from.location==='new'&&to.location.startsWith('legacy'))return 'NEW_TO_LEGACY_IMPORT';
  if(from.owner===to.owner)return null;
  if(to.owner==='kernel')return null;
  const isPublic=(policy.publicEntrypoints[to.owner]||[]).includes(target);
  if(from.role==='framework')return to.role==='pair'?'FRAMEWORK_IMPORTS_PAIR':'DIRECT_CROSS_FRAMEWORK_IMPORT';
  if(from.role==='kernel')return 'KERNEL_IMPORTS_DOMAIN';
  if(from.role==='pair'){
    if(to.role!=='framework'||!from.owner.split('--').includes(to.owner))return 'PAIR_IMPORTS_THIRD_OWNER';
    return isPublic?null:'PAIR_IMPORTS_PRIVATE_API';
  }
  if(['application','bootstrap','tooling'].includes(from.role)){
    if(to.owner==='bootstrap')return 'IMPORTS_BOOTSTRAP_INTERNALS';
    return isPublic?null:'IMPORTS_PRIVATE_API';
  }
  return 'UNAUTHORIZED_IMPORT';
}

export function checkBoundaries({sources,policy,legacy={groups:[]},pkg={}}){
  if(!Array.isArray(policy?.frameworks)||new Set(policy.frameworks).size!==policy.frameworks.length||!policy.publicEntrypoints||
    policy.frameworks.some(name=>typeof name!=='string'||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)||infrastructure.has(name)))
    throw new TypeError('Explicit unique framework and public entrypoint policy required.');
  if(Object.values(policy.externalCapabilityOwners||{}).some(allowed=>!Array.isArray(allowed)))throw new TypeError('Explicit external capability owners required.');
  const files=new Set(Object.keys(sources)),legacyOwners=legacyMap(legacy,policy),owners=new Map(),modules=[],edges=[],violations=[];
  const add=value=>violations.push({...value,id:violationId(value)});
  for(const [file,source] of Object.entries(sources).sort(([a],[b])=>a.localeCompare(b))){
    const owner=classifySource(file,policy,legacyOwners);owners.set(file,owner);
    if(!owner)add({code:'UNOWNED_MODULE',from:file});
    else if(owner.location==='legacy'&&!(policy.stableEntrypoints||[]).includes(file))add({code:'LEGACY_MODULE_LOCATION',from:file,owner:owner.owner});
    let parsed={imports:[],exports:[],reviews:[]};
    try{if(/\.(?:[cm]?js)$/.test(file))parsed=parseModule(source);else if(file.endsWith('.json')){JSON.parse(source);parsed.exports=['default'];}
      else add({code:'SOURCE_TYPE_REVIEW',from:file,owner:owner?.owner});}
    catch(error){add({code:'SOURCE_PARSE_ERROR',from:file,line:error.loc?.line||null,detail:error.name,owner:owner?.owner});}
    modules.push({path:file,...owner,sha256:createHash('sha256').update(source).digest('hex'),...parsed});
    for(const review of parsed.reviews)if(owner?.role!=='tooling')add({...review,from:file,owner:owner?.owner});
  }
  for(const [owner,entries] of Object.entries(policy.publicEntrypoints)){
    if(!Array.isArray(entries)||new Set(entries).size!==entries.length)throw new TypeError('Public entrypoints must be explicit and unique.');
    for(const file of entries){
      const actual=owners.get(file);
      if(/[?*%]/.test(file)||!actual||actual.owner!==owner||actual.location!=='new')add({code:'INVALID_PUBLIC_ENTRYPOINT',from:file,owner});
      else if(!modules.find(m=>m.path===file).exports.length)add({code:'EMPTY_PUBLIC_ENTRYPOINT',from:file,owner});
    }
  }
  for(const module of modules)for(const request of module.imports){
    const result=resolve(module.path,request.specifier,files,pkg),edge={from:module.path,...request,...result,owner:module.owner};
    edges.push(edge);
    if(result.error){add({...edge,code:result.error});continue;}
    if(result.external){
      const allowed=policy.externalCapabilityOwners?.[result.package];
      if(allowed&&!allowed.includes(module.owner))add({...edge,code:'EXTERNAL_CAPABILITY_OWNER'});
      continue;
    }
    const from=owners.get(module.path),to=owners.get(result.to);
    if(!from||!to){add({...edge,code:'IMPORT_TARGET_UNOWNED'});continue;}
    const code=edgeRule(from,to,result.to,policy);if(code)add({...edge,code});
  }
  const byPath=new Map(modules.map(module=>[module.path,module]));
  function hasExport(file,name,seen=new Set()){
    if(seen.has(file))return false;seen.add(file);const module=byPath.get(file);if(!module)return false;
    if(module.exports.includes(name))return true;
    return name!=='default'&&edges.some(edge=>edge.from===file&&edge.star&&edge.to&&!edge.error&&hasExport(edge.to,name,new Set(seen)));
  }
  for(const edge of edges.filter(e=>e.to&&!e.error)){
    if(owners.get(edge.from)?.location!=='new'&&owners.get(edge.to)?.location!=='new')continue;
    for(const name of edge.importedNames||[])if(name!=='*'&&!hasExport(edge.to,name))add({...edge,code:'MISSING_NAMED_EXPORT',detail:name});
  }
  const internal=edges.filter(e=>e.to&&!e.error),cycles=stronglyConnected([...files],internal),components=new Map();
  cycles.forEach((cycle,index)=>cycle.forEach(file=>components.set(file,index)));
  for(const edge of internal)if(components.has(edge.from)&&components.get(edge.from)===components.get(edge.to))add({...edge,code:'CYCLIC_IMPORT_EDGE'});
  return {modules,edges,cycles,violations,summary:{sourceModules:modules.length,unowned:modules.filter(m=>!m.owner).length,
    importOccurrences:edges.length,internalImportOccurrences:internal.length,cycleComponents:cycles.length,
    largestCycle:Math.max(0,...cycles.map(c=>c.length)),rawViolationOccurrences:violations.length}};
}

const phaseNumber=phase=>/^RF0[0-7]$/.test(phase||'')?Number(phase.slice(2)):NaN;
export const transitionBaselineHash=baseline=>createHash('sha256').update(JSON.stringify(baseline)).digest('hex');
export function applyTransitions(report,manifest,{phase,legacyPaths,baseline}={}){
  const current=phaseNumber(phase);if(!Number.isInteger(current))throw new TypeError('An explicit RF phase is required.');
  if(manifest?.version!==1||!Array.isArray(manifest.entries))throw new TypeError('Versioned exact transition entries required.');
  if(!baseline?.source_sha||!baseline.violations||manifest.baseline_sha256!==transitionBaselineHash(baseline))throw new TypeError('Frozen transition baseline mismatch.');
  const entries=new Map(),errors=[],counts=new Map();
  for(const violation of report.violations)counts.set(violation.id,(counts.get(violation.id)||0)+1);
  const addError=(code,entry)=>errors.push({code,from:entry?.from||null,id:entry?.id||null});
  for(const entry of manifest.entries){
    if(entries.has(entry.id)){addError('DUPLICATE_TRANSITION',entry);continue;}
    entries.set(entry.id,entry);
    if(entry.id!==violationId(entry)||!legacyPaths?.has(entry.from)||/[?*]/.test(entry.from)||
      !Object.hasOwn(baseline.violations,entry.id)||entry.max_occurrences>baseline.violations[entry.id]||entry.reviewed_base_sha!==baseline.source_sha||
      !Number.isSafeInteger(entry.max_occurrences)||entry.max_occurrences<1||!entry.owner||!entry.reason||
      !/^RF0[2-6]-F0[1-7]$/.test(entry.remove_in_feature||'')||phaseNumber(entry.expires_after)!==Number(entry.remove_in_feature.slice(2,4)))
      addError('INVALID_TRANSITION',entry);
    else if(current>phaseNumber(entry.expires_after))addError('EXPIRED_TRANSITION',entry);
    if(!counts.has(entry.id))addError('UNUSED_TRANSITION',entry);
  }
  const rejected=new Set(errors.map(e=>e.id));let accepted=0;const active=[];
  for(const [id,count] of counts){
    const entry=entries.get(id),sample=report.violations.find(v=>v.id===id);
    if(entry&&!rejected.has(id)&&count<=entry.max_occurrences){accepted+=count;continue;}
    active.push({...sample,occurrences:count,reason:entry&&count>entry.max_occurrences?'TRANSITION_COUNT_EXCEEDED':'UNACCEPTED'});
  }
  return {...report,transitionErrors:errors,activeViolations:active,summary:{...report.summary,acceptedLegacyOccurrences:accepted,
    activeViolationGroups:active.length,transitionErrors:errors.length,pass:active.length===0&&errors.length===0}};
}
