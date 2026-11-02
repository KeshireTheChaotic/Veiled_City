import {parse} from 'acorn';
import path from 'node:path';

const nameOf = node => node?.name ?? node?.value;
export function walkAst(node, visit, ancestors=[]) {
  if(!node || typeof node!=='object')return;
  if(node.type){visit(node,ancestors);ancestors=[...ancestors,node];}
  for(const [key,value] of Object.entries(node)){
    if(key==='loc')continue;
    if(Array.isArray(value))for(const child of value)walkAst(child,visit,ancestors);
    else if(value&&typeof value==='object')walkAst(value,visit,ancestors);
  }
}
function identifiers(pattern){
  if(!pattern)return [];
  if(pattern.type==='Identifier')return [pattern.name];
  if(pattern.type==='RestElement')return identifiers(pattern.argument);
  if(pattern.type==='AssignmentPattern')return identifiers(pattern.left);
  if(pattern.type==='ObjectPattern')return pattern.properties.flatMap(p=>identifiers(p.value??p.argument));
  if(pattern.type==='ArrayPattern')return pattern.elements.flatMap(identifiers);
  return [];
}
export function bindingIndex(sources){
  const modules=new Map();
  const relative=(file,specifier)=>specifier.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier)):specifier;
  for(const [file,source] of sources){
    const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
    const module={file,source,ast,locals:new Map(),exports:new Map(),stars:[],bindings:[],factoryReturns:[]};
    function declaration(node){
      if(!node)return;
      if(node.type==='VariableDeclaration')for(const d of node.declarations)for(const name of identifiers(d.id))module.locals.set(name,{file,name,line:d.loc.start.line,end:d.loc.end.line,kind:d.init?.type??'uninitialized'});
      else if(node.id)module.locals.set(node.id.name,{file,name:node.id.name,line:node.loc.start.line,end:node.loc.end.line,kind:node.type});
    }
    for(const statement of ast.body){
      if(statement.type==='ImportDeclaration'){
        for(const spec of statement.specifiers)module.locals.set(spec.local.name,{target:relative(file,statement.source.value),name:spec.type==='ImportDefaultSpecifier'?'default':spec.type==='ImportNamespaceSpecifier'?'*':nameOf(spec.imported),line:spec.loc.start.line});
      }else if(statement.type==='ExportNamedDeclaration'){
        declaration(statement.declaration);
        if(statement.declaration){
          const declared=statement.declaration;
          for(const name of declared.type==='VariableDeclaration'?declared.declarations.flatMap(d=>identifiers(d.id)):[declared.id.name])module.exports.set(name,{local:name});
        }
        for(const spec of statement.specifiers)module.exports.set(nameOf(spec.exported),statement.source?{target:relative(file,statement.source.value),name:nameOf(spec.local)}:{local:nameOf(spec.local)});
      }else if(statement.type==='ExportAllDeclaration'){
        if(statement.exported)module.exports.set(nameOf(statement.exported),{target:relative(file,statement.source.value),name:'*'});
        else module.stars.push(relative(file,statement.source.value));
      }else if(statement.type==='ExportDefaultDeclaration'){
        declaration(statement.declaration);
        const d=statement.declaration;
        module.exports.set('default',d.type==='Identifier'||d.id?{local:d.name??d.id.name}:{definition:{file,name:'default',line:d.loc.start.line,end:d.loc.end.line,kind:d.type}});
      }else declaration(statement);
    }
    const text=n=>source.slice(n.start,n.end);
    walkAst(ast,(node,ancestors)=>{
      if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&!node.callee.computed&&node.callee.property.name==='bind'){
        module.bindings.push({file,line:node.loc.start.line,target:text(node.callee.object),arguments:node.arguments.map(text),status:'explicit-source-binding-not-execution-proof'});
      }
      if(node.type==='ReturnStatement'&&node.argument?.type==='ObjectExpression'){
        const owner=[...ancestors].reverse().find(a=>/Function|Arrow/.test(a.type));
        module.factoryReturns.push({file,line:node.loc.start.line,owner:owner?.id?.name??`anonymous@${owner?.loc.start.line}`,members:node.argument.properties.map(p=>({name:p.type==='SpreadElement'?'...':nameOf(p.key),expression:text(p.type==='SpreadElement'?p.argument:p.value),computed:p.computed??false}))});
      }
    });
    modules.set(file,module);
  }
  function resolveLocal(file,name,chain=[]){
    const module=modules.get(file),entry=module?.locals.get(name);
    if(!entry)return {status:'unresolved-local',file,name,chain};
    if(entry.target)return resolveExport(entry.target,entry.name,chain);
    return {status:'definition',...entry,chain};
  }
  function resolveExport(file,name,chain=[]){
    const key=`${file}#${name}`;
    if(chain.includes(key))return {status:'cycle',file,name,chain:[...chain,key]};
    chain=[...chain,key];
    const module=modules.get(file);
    if(!module)return {status:file.startsWith('bot/')?'missing-module':'external',file,name,chain};
    if(name==='*')return {status:'namespace',file,name,chain};
    const entry=module.exports.get(name);
    if(entry?.definition)return {status:'definition',...entry.definition,chain};
    if(entry?.local)return resolveLocal(file,entry.local,chain);
    if(entry?.target)return resolveExport(entry.target,entry.name,chain);
    const options=module.stars.map(target=>resolveExport(target,name,chain)).filter(r=>r.status!=='missing-export'&&r.status!=='cycle');
    const unique=new Map(options.map(r=>[`${r.file}#${r.name}`,r]));
    if(unique.size===1)return [...unique.values()][0];
    return {status:unique.size?'ambiguous-export':'missing-export',file,name,chain,options:[...unique.values()]};
  }
  function exportNames(file,seen=new Set()){
    if(seen.has(file))return [];
    seen=new Set([...seen,file]);
    const m=modules.get(file);
    return [...new Set([...(m?.exports.keys()??[]),...(m?.stars??[]).flatMap(f=>exportNames(f,seen).filter(n=>n!=='default'))])].sort();
  }
  return {modules,resolveExport,resolveLocal,exportNames};
}

export const UNKNOWN=Symbol('unknown-static-value');
export function evaluateRoute(node,values){
  if(!node)return UNKNOWN;
  if(node.type==='Literal')return node.value;
  if(node.type==='Identifier')return Object.hasOwn(values,node.name)?values[node.name]:UNKNOWN;
  if(node.type==='ArrayExpression')return node.elements.map(n=>evaluateRoute(n,values));
  if(node.type==='UnaryExpression'&&node.operator==='!'){const v=evaluateRoute(node.argument,values);return v===UNKNOWN?UNKNOWN:!v;}
  if(node.type==='LogicalExpression'){
    const a=evaluateRoute(node.left,values),b=evaluateRoute(node.right,values);
    if(node.operator==='&&')return a===false||b===false?false:a===UNKNOWN||b===UNKNOWN?UNKNOWN:Boolean(a&&b);
    if(node.operator==='||')return a===true||b===true?true:a===UNKNOWN||b===UNKNOWN?UNKNOWN:Boolean(a||b);
  }
  if(node.type==='BinaryExpression'){
    const a=evaluateRoute(node.left,values),b=evaluateRoute(node.right,values);
    if(a===UNKNOWN||b===UNKNOWN)return UNKNOWN;
    if(node.operator==='===')return a===b;
    if(node.operator==='!==')return a!==b;
  }
  if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&!node.callee.computed){
    const receiver=evaluateRoute(node.callee.object,values),arg=evaluateRoute(node.arguments[0],values);
    if(receiver===UNKNOWN||arg===UNKNOWN)return UNKNOWN;
    if(node.callee.property.name==='includes'&&(typeof receiver==='string'||Array.isArray(receiver)))return Array.isArray(receiver)&&receiver.includes(UNKNOWN)?UNKNOWN:receiver.includes(arg);
    if(node.callee.property.name==='startsWith'&&typeof receiver==='string')return receiver.startsWith(arg);
  }
  return UNKNOWN;
}

// Reports candidate branch bindings, never concludes that authorization or runtime execution passed.
export function routeBranches(module,values){
  const branches=[];
  walkAst(module.ast,(node,ancestors)=>{
    if(node.type!=='IfStatement')return;
    let mentions=false;
    walkAst(node.test,n=>{if(n.type==='Identifier'&&['group','sub'].includes(n.name))mentions=true;});
    if(!mentions||evaluateRoute(node.test,values)===false)return;
    for(let i=0;i<ancestors.length;i++){
      const parent=ancestors[i],next=ancestors[i+1]??node;
      if(parent.type!=='IfStatement')continue;
      const decision=evaluateRoute(parent.test,values);
      if(next===parent.consequent&&decision===false||next===parent.alternate&&decision===true)return;
    }
    const calls=[];
    walkAst(node.consequent,n=>{if(n.type==='CallExpression'||n.type==='NewExpression')calls.push({line:n.loc.start.line,callee:module.source.slice(n.callee.start,n.callee.end),identifier:n.callee.type==='Identifier'?n.callee.name:null});});
    branches.push({file:module.file,line:node.loc.start.line,end:node.consequent.loc.end.line,condition:module.source.slice(node.test.start,node.test.end),decision:evaluateRoute(node.test,values)===UNKNOWN?'conditional':'route-match',calls});
  });
  return branches;
}
