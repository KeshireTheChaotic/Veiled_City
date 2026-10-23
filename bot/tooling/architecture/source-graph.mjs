/** Offline lexical inventory. Never imports or evaluates inspected application modules. */
import path from 'node:path';

const controls=new Set(['if','for','while','switch','catch','with','function','import']);
const regexPrefixes=new Set(['(','[','{','=',':',',',';','!','?','=>','return','throw','case','&&','||','??']);
const identifierStart=c=>!!c&&/[A-Za-z_$]/.test(c);
const identifierPart=c=>!!c&&/[A-Za-z0-9_$]/.test(c);
function decodeString(raw){
  return raw.slice(1,-1).replace(/\\(?:u\{([\da-f]+)\}|u([\da-f]{4})|x([\da-f]{2})|([\s\S]))/gi,(_,wide,unicode,hex,simple)=>
    wide||unicode||hex?String.fromCodePoint(parseInt(wide||unicode||hex,16)):({n:'\n',r:'\r',t:'\t'}[simple]??simple));
}
export function tokenize(source){
  const tokens=[],warnings=[];let i=0,line=1,depth=0;
  const advance=()=>{if(source[i]==='\n')line++;return source[i++];};
  const add=(type,value,start,startLine,extra={})=>tokens.push({type,value,start,end:i,line:startLine,depth,...extra});
  function code(templateExpression=false){
    let braces=0;
    while(i<source.length){
      const c=source[i],start=i,startLine=line;
      if(/\s/.test(c)){advance();continue;}
      if(c==='/'&&source[i+1]==='/'){while(i<source.length&&source[i]!=='\n')advance();continue;}
      if(c==='/'&&source[i+1]==='*'){
        advance();advance();while(i<source.length&&!(source[i]==='*'&&source[i+1]==='/'))advance();
        if(i===source.length)warnings.push({line:startLine,reason:'unterminated comment'});else{advance();advance();}continue;
      }
      if(c==='"'||c==="'"){
        const quote=advance();while(i<source.length){const next=advance();if(next==='\\'){advance();continue;}if(next===quote)break;}
        add('string',decodeString(source.slice(start,i)),start,startLine);continue;
      }
      if(c==='`'){
        advance();const token={type:'template',value:'',start,end:i,line:startLine,depth,interpolated:false};tokens.push(token);
        while(i<source.length){
          if(source[i]==='\\'){advance();advance();continue;}
          if(source[i]==='`'){advance();break;}
          if(source[i]==='$'&&source[i+1]==='{'){
            token.interpolated=true;advance();advance();depth++;code(true);continue;
          }
          advance();
        }
        token.end=i;token.value=source.slice(start+1,i-1);continue;
      }
      if(c==='/'&&(!tokens.length||regexPrefixes.has(tokens.at(-1).value))){
        advance();let bracket=false;
        while(i<source.length){const next=advance();if(next==='\\'){advance();continue;}
          if(next==='[')bracket=true;if(next===']')bracket=false;if(next==='/'&&!bracket)break;
          if(next==='\n'){warnings.push({line:startLine,reason:'ambiguous regular expression'});break;}}
        while(identifierPart(source[i]))advance();add('regex',source.slice(start,i),start,startLine);continue;
      }
      if(identifierStart(c)){advance();while(identifierPart(source[i]))advance();add('identifier',source.slice(start,i),start,startLine);continue;}
      if(/[0-9]/.test(c)){advance();while(/[\w.]/.test(source[i]||''))advance();add('number',source.slice(start,i),start,startLine);continue;}
      if(c==='}'&&templateExpression&&braces===0){advance();depth--;return;}
      if(c==='{'){braces++;add('punct',advance(),start,startLine);depth++;continue;}
      if(c==='}'){braces--;depth--;add('punct',advance(),start,startLine);continue;}
      const double=source.slice(i,i+2);
      if(['=>','?.','&&','||','??','++','--','==','!=','**'].includes(double)){advance();advance();add('punct',double,start,startLine);continue;}
      add('punct',advance(),start,startLine);
    }
  }
  code();return {tokens,warnings};
}

export function inspectModule(source){
  const {tokens,warnings}=tokenize(source),imports=[],exports=[],functions=[],calls=[],topLevelCalls=[],state=[],storage=[];
  const value=n=>tokens[n]?.value;
  for(let i=0;i<tokens.length;i++){
    const t=tokens[i],previous=value(i-1),next=value(i+1);
    if(t.type==='identifier'&&t.value==='import'&&!['.','?.'].includes(previous)){
      if(next==='('){
        const argument=tokens[i+2],literal=argument?.type==='string'||argument?.type==='template'&&!argument.interpolated;
        imports.push({kind:literal?'dynamic-literal':'dynamic-computed',specifier:literal?argument.value:null,line:t.line});
      }else if(next!=='.'){
        if(tokens[i+1]?.type==='string')imports.push({kind:'side-effect',specifier:value(i+1),line:t.line});
        else for(let j=i+1;j<tokens.length&&value(j)!==';';j++)if(value(j)==='from'&&tokens[j+1]?.type==='string'){
          const bindings=[];
          for(let k=i+1;k<j;k++){
            if(value(k)==='*'&&value(k+1)==='as')bindings.push(value(k+2));
            if(tokens[k].type==='identifier'&&value(k)!=='as'&&value(k-1)!=='as')bindings.push(value(k+1)==='as'?value(k+2):value(k));
          }
          imports.push({kind:'static',specifier:value(j+1),line:t.line,bindings});break;}
      }
    }
    if(t.value==='export'&&t.type==='identifier'&&previous!=='.'){
      let j=i+1;if(value(j)==='default'){exports.push('default');j++;}if(value(j)==='async')j++;
      if(['function','class','const','let','var'].includes(value(j))&&tokens[j+1]?.type==='identifier')exports.push(value(j+1));
      if(['const','let','var'].includes(value(j))){
        let nesting=0;
        for(let k=j+1;k<tokens.length;k++){
          if(nesting===0&&value(k)===';')break;
          if(['(','[','{'].includes(value(k)))nesting++;
          if([')',']','}'].includes(value(k)))nesting--;
          if(nesting===0&&value(k)===','&&tokens[k+1]?.type==='identifier')exports.push(value(k+1));
        }
      }
      if(value(j)==='{')for(let k=j+1;k<tokens.length&&value(k)!=='}';k++){
        if(tokens[k].type==='identifier'&&value(k)!=='as'&&value(k-1)!=='as')exports.push(value(k+1)==='as'?value(k+2):value(k));}
      if(value(j)==='*')exports.push('*');
      if(value(j)==='{'||value(j)==='*'){
        let k=j;if(value(j)==='{'){while(k<tokens.length&&value(k)!=='}')k++;k++;}
        else{k++;if(value(k)==='as')k+=2;}
        if(value(k)==='from'&&tokens[k+1]?.type==='string')imports.push({kind:'re-export',specifier:value(k+1),line:t.line});
      }
    }
    if(t.value==='function'&&tokens[i+1]?.type==='identifier')functions.push({name:value(i+1),line:t.line,kind:'function'});
    if(t.type==='identifier'&&next==='('&&!controls.has(t.value)){
      let j=i+1,nesting=0;for(;j<tokens.length;j++){if(value(j)==='(')nesting++;if(value(j)===')'&&--nesting===0)break;}
      const declaration=value(j+1)==='{'&&!['.','?.','new'].includes(previous);
      if(declaration&&previous!=='function')functions.push({name:t.value,line:t.line,kind:'method-or-declaration'});
      else if(previous!=='function'){
        const receiver=['.','?.'].includes(previous)?value(i-2):null;
        calls.push({name:t.value,receiver,line:t.line});
        if(t.depth===0)topLevelCalls.push({name:t.value,receiver,line:t.line});
        if(['db','this'].includes(receiver)||['prepare','transaction','exec','parse','stringify','send','fetch'].includes(t.value))
          storage.push({name:t.value,receiver,line:t.line});
      }
    }
    if(t.depth===0&&t.value==='new')state.push({constructor:next,line:t.line});
  }
  return {imports,exports:[...new Set(exports)].sort(),functions,calls,topLevelCalls,moduleState:state,coupling:storage,warnings};
}

export function resolveImport(from,specifier,files,aliases={}){
  if(specifier===null)return {kind:'computed',target:null};
  if(specifier.startsWith('#')){
    let mapped=aliases[specifier];
    if(!mapped)for(const [key,value] of Object.entries(aliases))if(key.includes('*')&&typeof value==='string'){
      const [prefix,suffix]=key.split('*');if(specifier.startsWith(prefix)&&specifier.endsWith(suffix))mapped=value.replace('*',specifier.slice(prefix.length,suffix?-suffix.length:undefined));}
    if(typeof mapped!=='string')return {kind:'unresolved-alias',target:null};
    specifier=mapped.startsWith('./')?`../${mapped.slice(2)}`:mapped;
    // Import-map targets resolve at bot/package.json, not at the importing module.
    if(mapped.startsWith('./'))return {kind:files.has(`bot/${mapped.slice(2)}`)?'internal':'missing',target:`bot/${mapped.slice(2)}`};
  }
  if(!specifier.startsWith('.'))return {kind:'external',target:specifier};
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(from),specifier));
  return {kind:files.has(target)?'internal':'missing',target};
}

export function stronglyConnected(nodes,edges){
  const adjacency=new Map(nodes.map(n=>[n,[]]));for(const e of edges)if(adjacency.has(e.from)&&adjacency.has(e.to))adjacency.get(e.from).push(e.to);
  let serial=0;const indices=new Map(),low=new Map(),stack=[],active=new Set(),cycles=[];
  function visit(node){
    indices.set(node,serial);low.set(node,serial++);stack.push(node);active.add(node);
    for(const target of adjacency.get(node)){if(!indices.has(target)){visit(target);low.set(node,Math.min(low.get(node),low.get(target)));}
      else if(active.has(target))low.set(node,Math.min(low.get(node),indices.get(target)));}
    if(low.get(node)===indices.get(node)){const group=[];let current;do{current=stack.pop();active.delete(current);group.push(current);}while(current!==node);
      if(group.length>1||adjacency.get(node).includes(node))cycles.push(group.sort());}
  }
  for(const node of nodes)if(!indices.has(node))visit(node);return cycles.sort((a,b)=>a[0].localeCompare(b[0]));
}
