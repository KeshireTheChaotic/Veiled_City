import {handoutMarkdown,handoutSummary} from './frameworks/publication/public.js';
export {handoutMarkdown,handoutSummary} from './frameworks/publication/public.js';
/** Evidence/handout serialization and delivery-file formatting helpers. */
import { Buffer } from "node:buffer";
import { markdownToDocx } from "./character-export.js";

function safe(v){return v==null?"":String(v);}
function stem(v){return safe(v).normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"Handout";}
function formats(format){return format==="all"?["json","markdown","docx"]:[format||"markdown"];}
import {handoutPlayerView} from './frameworks/publication/public.js';
export {handoutPlayerView};



export function handoutFiles(h,format="markdown"){
  const md=handoutMarkdown(h); const base=`EVIDENCE_${stem(h.title)}_${String(h.id).slice(0,8)}`; const out=[];
  for(const f of formats(format)){
    if(f==="json") out.push({name:`${base}.json`,buffer:Buffer.from(JSON.stringify({...handoutPlayerView(h),exported_at:new Date().toISOString()},null,2)+"\n","utf8")});
    if(f==="markdown") out.push({name:`${base}.md`,buffer:Buffer.from(md,"utf8")});
    if(f==="docx") out.push({name:`${base}.docx`,buffer:markdownToDocx(md,`${h.title} — Veiled City Evidence`)});
  }
  return out;
}
