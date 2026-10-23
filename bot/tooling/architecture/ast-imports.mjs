/** Parse source, never execute it. Acorn is development-only and is not loaded by the bot. */
import {parse} from 'acorn';

const label=node=>node?.type==='Identifier'?node.name:node?.type==='MemberExpression'
  ?`${label(node.object)}.${node.computed?'[computed]':node.property.name}`:'[expression]';
export function parseModule(source){
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true,allowHashBang:true}),imports=[],exports=[],reviews=[];
  const loaderNames=new Set(['require','createRequire']);
  const resourceConstructors=new Set(['DatabaseSync','VeiledDB','GMService','OpenAI','Client','REST']);
  const eagerMethods=new Set(['login','connect','createConnection','createPool','writeFileSync','appendFileSync','mkdirSync','renameSync','unlinkSync','rmSync']);
  const add=(node,kind,specifier)=>imports.push({kind,specifier,line:node.loc.start.line,column:node.loc.start.column});
  for(const node of ast.body)if(node.type==='ImportDeclaration')for(const spec of node.specifiers){
    if(spec.imported?.name==='createRequire')loaderNames.add(spec.local.name);
    if(resourceConstructors.has(spec.imported?.name)||spec.type==='ImportDefaultSpecifier'&&node.source.value==='openai')resourceConstructors.add(spec.local.name);
    if(eagerMethods.has(spec.imported?.name))eagerMethods.add(spec.local.name);
  }
  function visit(node){
    if(!node?.type)return;
    const children=[];for(const [key,value] of Object.entries(node))if(!['loc','start','end'].includes(key)){
      if(Array.isArray(value))children.push(...value.filter(v=>v?.type));else if(value?.type)children.push(value);
    }
    return children;
  }
  function traverse(node){
    if(!node?.type)return;
    extract(node);for(const child of visit(node))traverse(child);
  }
  function extract(node){
    if(node.type==='ImportDeclaration'){
      add(node,node.specifiers.length?'static':'side-effect',node.source.value);
      for(const spec of node.specifiers)if(spec.imported?.name==='createRequire')loaderNames.add(spec.local.name);
    }else if(node.type==='ExportNamedDeclaration'){
      if(node.source)add(node,'re-export',node.source.value);
      for(const spec of node.specifiers)exports.push(spec.exported.name??spec.exported.value);
      if(node.declaration?.id)exports.push(node.declaration.id.name);
      for(const decl of node.declaration?.declarations||[])bindingNames(decl.id,exports);
    }else if(node.type==='ExportAllDeclaration'){add(node,'re-export',node.source.value);exports.push(node.exported?.name||'*');}
    else if(node.type==='ExportDefaultDeclaration')exports.push('default');
    else if(node.type==='ImportExpression'){
      const target=node.source,literal=target.type==='Literal'&&typeof target.value==='string'||target.type==='TemplateLiteral'&&!target.expressions.length;
      add(node,literal?'dynamic-literal':'dynamic-computed',literal?(target.value??target.quasis[0].value.cooked):null);
    }
    if(node.type==='CallExpression'&&(node.callee.type==='Identifier'&&loaderNames.has(node.callee.name)||
      node.callee.type==='MemberExpression'&&['require','createRequire'].includes(node.callee.property.name)))
      reviews.push({code:'MODULE_LOADER_REVIEW',detail:label(node.callee),line:node.loc.start.line});
    if((node.type==='CallExpression'||node.type==='NewExpression')&&['eval','Function','globalThis.eval','globalThis.Function'].includes(label(node.callee)))
      reviews.push({code:'DYNAMIC_CODE_REVIEW',detail:label(node.callee),line:node.loc.start.line});
  }
  function eager(node){
    if(!node?.type||['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type))return;
    if(node.type==='PropertyDefinition'&&!node.static)return;
    if(node.type==='CallExpression'&&eagerMethods.has(node.callee.name||node.callee.property?.name))
      reviews.push({code:'EAGER_MODULE_CALL',detail:label(node.callee),line:node.loc.start.line});
    if(node.type==='NewExpression'&&resourceConstructors.has(label(node.callee)))
      reviews.push({code:'EAGER_MODULE_CONSTRUCTION',detail:label(node.callee),line:node.loc.start.line});
    for(const child of visit(node)||[])eager(child);
  }
  traverse(ast);eager(ast);
  return {imports,exports:[...new Set(exports)].sort(),reviews};
}
function bindingNames(node,names){
  if(node?.type==='Identifier')names.push(node.name);
  else if(node?.type==='ObjectPattern')for(const property of node.properties)bindingNames(property.value||property.argument,names);
  else if(node?.type==='ArrayPattern')for(const element of node.elements)bindingNames(element,names);
  else if(node?.type==='AssignmentPattern')bindingNames(node.left,names);
  else if(node?.type==='RestElement')bindingNames(node.argument,names);
}
