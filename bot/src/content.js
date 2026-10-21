/** Read-only indexed access to packaged Veiled City content files. */
import fs from "node:fs";
import path from "node:path";
import {createHash} from 'node:crypto';

function walk(dir,out=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p,out);
    else if(e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(p);
  }
  return out;
}
function tokens(s){
  return new Set(String(s).toLowerCase().match(/[a-z0-9']{3,}/g)||[]);
}
function chunkMarkdown(file,text){
  const rel=file;
  const parts=text.split(/\n(?=#{1,3}\s)/g);
  return parts.map((body,i)=>({id:`${rel}#${i}`,file:rel,body:body.trim()}))
    .filter(x=>x.body.length>40);
}

export class ContentIndex {
  constructor(root){
    this.root=path.resolve(root);
    this.chunks=[];
    // Only immutable packaged token indexes are cached. Seeded tenant documents,
    // generated prose, native outcomes and choices never enter this cache.
    this.tokenIndexes=new WeakMap();this.tokenCacheStats={hits:0,misses:0};
    for(const f of walk(this.root)){
      const rel=path.relative(this.root,f).split(path.sep).join("/");
      const text=fs.readFileSync(f,"utf8");
      const privateSource=/^(?:GM|GM_PRIVATE)\//i.test(rel)||/^PLAYER\/PLAYERS\//i.test(rel)
        || /^(?:visibility|scope)\s*:\s*(?:gm|gm_private|private|player|character)\s*$/im.test(text);
      this.chunks.push(...chunkMarkdown(rel,text).map(chunk=>({...chunk,visibility:privateSource?"gm":"party"})));
    }
  }
  read(rel){
    const p=path.join(this.root,rel);
    return fs.existsSync(p)?fs.readFileSync(p,"utf8"):"";
  }
  search(query,limit=8,{gm=true,documents=[]}={}){
    const q=tokens(query);
    const seededPaths=new Set(documents.map(doc=>doc.source_path));
    const seeded=documents.filter(doc=>doc.encoding==="utf8"&&(gm||doc.visibility==="party"))
      .flatMap(doc=>chunkMarkdown(doc.source_path,doc.body).flatMap(chunk=>{
        const pieces=[];
        for(let offset=0;offset<chunk.body.length;offset+=6000){
          pieces.push({...chunk,id:`${chunk.id}:${offset}`,body:chunk.body.slice(offset,offset+6000),visibility:doc.visibility});
        }
        return pieces;
      }));
    const packaged=new Set(this.chunks);
    return [...this.chunks.filter(chunk=>!seededPaths.has(chunk.file)),...seeded]
      .filter(c=>gm || (c.visibility!=="gm"&&!/^(?:GM|GM_PRIVATE)\//i.test(c.file)&&!/^PLAYER\/PLAYERS\//i.test(c.file)
        && !/^(?:visibility|scope)\s*:\s*(?:gm|gm_private|private|player|character)\s*$/im.test(c.body)))
      .map(c=>{
        const source=c.body+" "+c.file;
        const cacheKey=packaged.has(c)?JSON.stringify([1,this.root,c.visibility,gm,createHash('sha256').update(source).digest('hex')]):null;
        const prior=cacheKey&&this.tokenIndexes.get(c);
        let t;
        if(prior?.key===cacheKey){t=prior.tokens;this.tokenCacheStats.hits++;}
        else{t=tokens(source);if(cacheKey){this.tokenIndexes.set(c,{key:cacheKey,tokens:t});this.tokenCacheStats.misses++;}}
        let score=0;
        for(const x of q) if(t.has(x)) score++;
        if(/AI_GM_CONSTITUTION|MULTIPLAYER_GM_RULES/.test(c.file)) score+=0.25;
        return {...c,score};
      })
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || a.body.length-b.body.length)
      .slice(0,limit);
  }
}
