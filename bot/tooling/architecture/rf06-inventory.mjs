/** Offline source inventory only. Read syntax and call names never qualify a repository migration. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {readProject,readStrictJson} from './read-project.mjs';
import {checkBoundaries} from './boundary-checker.mjs';

const databasePath='bot/src/frameworks/persistence/database.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const property=node=>node?.type==='MemberExpression'
  ?!node.computed&&node.property.type==='Identifier'?node.property.name
    :node.property.type==='Literal'&&typeof node.property.value==='string'?node.property.value:null:null;
function walk(node,visit){
  if(!node||typeof node!=='object')return;
  if(typeof node.type==='string')visit(node);
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(item=>walk(item,visit));
  else if(value&&typeof value==='object')walk(value,visit);
}
function connectionKind(node){
  if(node?.type==='MemberExpression'&&property(node)==='db')return node.object.type==='ThisExpression'?'instance':'caller_handle';
  return node?.type==='Identifier'&&node.name==='connection'?'repository_parameter':null;
}
function sqlValue(node){
  if(node?.type==='Literal'&&typeof node.value==='string')return {text:node.value,dynamic:false};
  if(node?.type==='TemplateLiteral')return {text:node.quasis.map(q=>q.value.cooked??q.value.raw).join('${dynamic}'),dynamic:node.expressions.length>0};
  return {text:null,dynamic:true};
}
function sqlCategory(text,dynamic){
  if(dynamic||text===null)return 'dynamic_review';
  const first=text.trim().match(/^([A-Za-z]+)/)?.[1]?.toUpperCase();
  if(first==='SELECT')return 'select_syntax_only';
  if(['INSERT','UPDATE','DELETE','REPLACE','CREATE','ALTER','DROP','VACUUM'].includes(first))return 'write_or_schema';
  if(['BEGIN','COMMIT','ROLLBACK','SAVEPOINT','RELEASE'].includes(first))return 'transaction_control';
  return 'other_review'; // WITH, PRAGMA and comments are deliberately not assumed read-only.
}
function scanCalls(node,source,file){
  const sql=[],computed=[],selfCalls=new Set(),calls=[];
  walk(node,item=>{
    if(item.type!=='CallExpression')return;
    const callee=item.callee,key=property(callee);calls.push(item);
    if(callee.type==='MemberExpression'&&callee.object.type==='ThisExpression'&&key)selfCalls.add(key);
    const connection=callee.type==='MemberExpression'?connectionKind(callee.object):null;
    if(!connection)return;
    if(!key){computed.push({file,line:item.loc.start.line,expression:source.slice(item.start,item.end)});return;}
    if(!['prepare','exec'].includes(key))return;
    const value=sqlValue(item.arguments[0]);
    sql.push({file,line:item.loc.start.line,operation:key,connection,category:sqlCategory(value.text,value.dynamic),
      sql_preview:value.text?.slice(0,1000)??null,sql_sha256:value.text===null?null:digest(value.text),dynamic:value.dynamic});
  });
  return {sql,computed,self_calls:[...selfCalls].sort(),calls};
}

export function inventoryStorageSources(sources){
  const parsed=new Map(),parse_errors=[];
  for(const [file,source] of Object.entries(sources).sort(([a],[b])=>a.localeCompare(b)))if(/\.[cm]?js$/.test(file)){
    try{parsed.set(file,parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true}));}
    catch(error){parse_errors.push({file,line:error.loc?.line??null,message:error.message});}
  }
  const tree=parsed.get(databasePath),source=sources[databasePath],cls=tree?.body.map(n=>n.declaration||n)
    .find(n=>n.type==='ClassDeclaration'&&n.id?.name==='VeiledDB');
  const imports=new Map(),repository_paths=new Set();
  for(const node of tree?.body||[])if(node.type==='ImportDeclaration'&&node.source.value.endsWith('-repository.js')){
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(databasePath),node.source.value));repository_paths.add(target);
    for(const specifier of node.specifiers)imports.set(specifier.local.name,{path:target,imported:specifier.imported?.name??'*'});
  }
  const methods=(cls?.body.body||[]).map(member=>{
    const computedName=member.computed&&member.key?.type!=='Literal',name=String(computedName?'[computed]':member.key?.name??member.key?.value??'[computed]'),
      scan=scanCalls(member.value??member,source,databasePath),delegated=[];
    for(const call of scan.calls){const local=call.callee.type==='Identifier'?call.callee.name:call.callee.object?.name,entry=imports.get(local);
      if(entry)delegated.push({...entry,function:call.callee.type==='Identifier'?entry.imported:property(call.callee),line:call.loc.start.line});}
    return {name,kind:member.kind??member.type,computed_name_review:!!computedName,line:member.loc.start.line,parameters:(member.value?.params||[]).map(p=>source.slice(p.start,p.end)),
      sql_sites:scan.sql,computed_connection_calls:scan.computed,self_calls:scan.self_calls,
      transaction_call:scan.self_calls.includes('transaction'),delegated_repository_calls:delegated};
  });
  const names=new Set(methods.map(m=>m.name)),repositories=[];
  for(const file of [...repository_paths].sort()){
    const ast=parsed.get(file),text=sources[file],scan=ast?scanCalls(ast,text,file):{sql:[],computed:[]};
    repositories.push({path:file,present:!!ast,sha256:text===undefined?null:digest(text),sql_sites:scan.sql,computed_connection_calls:scan.computed});
  }
  const caller_candidates=[],outside_storage_sql_candidates=[];
  for(const [file,ast] of parsed)if(file.startsWith('bot/src/')&&file!==databasePath&&!repository_paths.has(file)){
    const scan=scanCalls(ast,sources[file],file);outside_storage_sql_candidates.push(...scan.sql);
    for(const call of scan.calls){const name=property(call.callee);if(names.has(name))caller_candidates.push({method:name,file,line:call.loc.start.line,
      receiver:sources[file].slice(call.callee.object.start,call.callee.object.end)});}
  }
  const class_sql_sites=methods.reduce((sum,m)=>sum+m.sql_sites.length,0),repository_sql_sites=repositories.reduce((sum,r)=>sum+r.sql_sites.length,0);
  return {scan_complete:!!cls&&parse_errors.length===0&&repositories.every(r=>r.present),qualifies_repository_migration:false,
    caveat:'All callers, SQL categories and transaction flags are syntactic candidates. Connection identity, domain authority, atomicity and runtime behavior require separate contract evidence.',
    receiver_coverage:{recognized:['<receiver>.db','connection'],arbitrary_aliases_resolved:false},
    parse_errors,summary:{class_members:methods.length,class_sql_sites,repository_sql_sites,total_storage_sql_sites:class_sql_sites+repository_sql_sites,
      transaction_call_members:methods.filter(m=>m.transaction_call).length,caller_candidates:caller_candidates.length,outside_storage_sql_candidates:outside_storage_sql_candidates.length},
    methods,repositories,caller_candidates,outside_storage_sql_candidates};
}

export function captureRf06Inventory(root){
  const input=readProject(root),storage=inventoryStorageSources(input.sources),graph=checkBoundaries(input);
  const base='docs/Implementation_Plans/Framework_Refactor',manifest=readStrictJson(fs.readFileSync(path.join(root,base,'RF01/TRANSITIONS.json'),'utf8')),
    entries=new Map(manifest.entries.map(e=>[e.id,e])),modules=new Map(graph.modules.map(m=>[m.path,m]));
  const hubPaths=['bot/src/db.js',databasePath,'bot/src/publishing.js','bot/src/publication-outbox.js','bot/src/native-publications.js',
    'bot/src/pvp-output.js','bot/src/commands.js','bot/src/command-definitions.js','bot/src/frameworks/discord/command-definitions.js',
    'bot/src/index.js','bot/src/application/composition/runtime-initializers.js'];
  const hubs=hubPaths.map(file=>{
    const source=input.sources[file],module=modules.get(file);if(source===undefined)return {path:file,present:false};
    return {path:file,present:true,owner:module?.owner,role:module?.role,location:module?.location,bytes:Buffer.byteLength(source),split_lines:source.split('\n').length,
      exports:module.exports,imports:graph.edges.filter(e=>e.from===file),importers:[...new Set(graph.edges.filter(e=>e.to===file).map(e=>e.from))].sort(),
      obligations:graph.violations.filter(v=>v.from===file).map(v=>({code:v.code,to:v.to??null,specifier:v.specifier??null,id:v.id,
        transition:entries.has(v.id)?{remove_in_feature:entries.get(v.id).remove_in_feature,expires_after:entries.get(v.id).expires_after}:null}))};
  });
  const hashes=Object.entries(input.sources).sort(([a],[b])=>a.localeCompare(b)).map(([file,source])=>({path:file,sha256:digest(source)})),
    git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  return {captured_at:new Date().toISOString(),head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),dirty_paths:git(['status','--short']),
    source_snapshot_sha256:digest(JSON.stringify(hashes)),source_hashes:hashes,schema_sha256:digest(fs.readFileSync(path.join(root,'bot/sql/schema.sql'))),
    caveat:'Filesystem source snapshot only; concurrent unrelated edits are disclosed by hashes and dirty paths. No runtime imports, SQLite opens or contract/phase qualification.',
    boundary_source_summary:graph.summary,storage,hubs};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),result=captureRf06Inventory(root),
    target=path.join(root,'docs/Implementation_Plans/Framework_Refactor/features/RF06-F01/I03-INVENTORY.json');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({scan_complete:result.storage.scan_complete,head:result.head,...result.storage.summary,hubs:result.hubs.map(h=>({path:h.path,bytes:h.bytes,imports:h.imports?.length,obligations:h.obligations?.length}))}));
  if(!result.storage.scan_complete)process.exitCode=1;
}
