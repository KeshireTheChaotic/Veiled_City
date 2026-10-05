import fs from "node:fs";
import path from "node:path";

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
    for(const f of walk(this.root)){
      const rel=path.relative(this.root,f);
      const text=fs.readFileSync(f,"utf8");
      this.chunks.push(...chunkMarkdown(rel,text));
    }
  }
  read(rel){
    const p=path.join(this.root,rel);
    return fs.existsSync(p)?fs.readFileSync(p,"utf8"):"";
  }
  search(query,limit=8,{gm=true}={}){
    const q=tokens(query);
    return this.chunks
      .filter(c=>gm || !c.file.startsWith("GM_PRIVATE"))
      .map(c=>{
        const t=tokens(c.body+" "+c.file);
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
