import {parse} from 'acorn';
import {DatabaseSync} from 'node:sqlite';
import {walkAst} from './binding-audit.mjs';

const UNKNOWN=Symbol('unresolved migration expression');
function constant(node,scope){
  if(!node)return UNKNOWN;
  if(node.type==='Literal')return node.value;
  if(node.type==='Identifier')return Object.hasOwn(scope,node.name)?scope[node.name]:UNKNOWN;
  if(node.type==='TemplateLiteral'&&!node.expressions.length)return node.quasis[0].value.cooked;
  if(node.type==='ArrayExpression'){
    const values=node.elements.map(n=>constant(n,scope));
    return values.includes(UNKNOWN)?UNKNOWN:values;
  }
  return UNKNOWN;
}
export function migrationAdditions(source){
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
  const methods=[];
  walkAst(ast,node=>{if(node.type==='MethodDefinition'&&node.key.name==='migrateSchema')methods.push(node.value.body);});
  if(methods.length!==1)throw new Error('Exactly one migrateSchema method required');
  const additions=[],unresolved=[];
  function collect(node,scope={}){
    if(!node||typeof node!=='object')return;
    if(node.type==='ForOfStatement'){
      const values=constant(node.right,scope),pattern=node.left.declarations?.[0]?.id;
      if(Array.isArray(values)&&pattern?.type==='ArrayPattern'&&pattern.elements.every(p=>p?.type==='Identifier')){
        for(const row of values){
          if(!Array.isArray(row))throw new Error('Expected tuple for migration loop');
          collect(node.body,{...scope,...Object.fromEntries(pattern.elements.map((p,i)=>[p.name,row[i]]))});
        }
        return;
      }
    }
    if(node.type==='CallExpression'&&node.callee.type==='Identifier'&&node.callee.name==='add'){
      const values=node.arguments.map(n=>constant(n,scope));
      if(values.length!==3||values.some(v=>typeof v!=='string'))unresolved.push({line:node.loc.start.line,expression:source.slice(node.start,node.end)});
      else additions.push({table:values[0],column:values[1],definition:values[2],line:node.loc.start.line});
      return;
    }
    for(const [key,value] of Object.entries(node)){
      if(key==='loc')continue;
      if(Array.isArray(value))for(const child of value)collect(child,scope);
      else if(value&&typeof value==='object')collect(value,scope);
    }
  }
  collect(methods[0]);
  return {additions,unresolved};
}
export function effectiveSchema(sql,migrationSource){
  const extracted=migrationAdditions(migrationSource);
  if(extracted.unresolved.length)throw new Error(`Unresolved schema additions: ${JSON.stringify(extracted.unresolved)}`);
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(sql);
    const applied=[];
    for(const item of extracted.additions){
      if(!/^[a-z_][a-z0-9_]*$/i.test(item.table)||!/^[a-z_][a-z0-9_]*$/i.test(item.column))throw new Error('Invalid migration identifier');
      const exists=db.prepare(`PRAGMA table_info("${item.table}")`).all().some(c=>c.name===item.column);
      if(!exists)db.exec(`ALTER TABLE "${item.table}" ADD COLUMN "${item.column}" ${item.definition}`);
      applied.push({...item,alreadyInBaseSchema:exists});
    }
    const tables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>({...row,columns:db.prepare(`PRAGMA table_info("${row.name}")`).all(),foreignKeys:db.prepare(`PRAGMA foreign_key_list("${row.name}")`).all()}));
    return {tables,additions:applied,scope:'schema.sql plus statically resolved add() calls; no data backfill or legacy runtime execution'};
  }finally{db.close();}
}
