/** Evidence/handout serialization and delivery-file formatting helpers. */
import { Buffer } from "node:buffer";
import { markdownToDocx } from "./character-export.js";

function safe(v){return v==null?"":String(v);}
function stem(v){return safe(v).normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"Handout";}
function formats(format){return format==="all"?["json","markdown","docx"]:[format||"markdown"];}
import {handoutPlayerView} from './frameworks/publication/public.js';
export {handoutPlayerView};

export function handoutMarkdown(h){
  const facts=h.canonical_facts||[];
  const links=[h.case_key&&`Case: ${h.case_key}`,h.npc_key&&`NPC: ${h.npc_key}`,h.location_key&&`Location: ${h.location_key}`].filter(Boolean);
  return [
    `# ${h.title}`,
    `**Veiled City Evidence Handout**`,
    ``,
    `- Type: ${h.kind}`,
    `- Authority: ${h.authority}`,
    `- Visibility: ${h.visibility}`,
    ...(links.map(x=>`- ${x}`)),
    ``,
    `## Player-Facing Artifact`,
    ``,
    h.content||"(No player-facing text.)",
    ``,
    `## Evidence Authority`,
    h.authority==="canonical"?"Only independently established source facts are canonical; decorative presentation does not create campaign truth.":
      h.authority==="partial"?"The artifact is genuine, but its meaning or completeness is uncertain.":
      h.authority==="unreliable"?"The source may be mistaken, altered, forged, corrupted, or supernatural.":
      "This is an illustrative aid; incidental details are not automatically canon.",
    ``,
    `Handout ID: ${h.id}`
  ].join("\n");
}

export function handoutFiles(h,format="markdown"){
  const md=handoutMarkdown(h); const base=`EVIDENCE_${stem(h.title)}_${String(h.id).slice(0,8)}`; const out=[];
  for(const f of formats(format)){
    if(f==="json") out.push({name:`${base}.json`,buffer:Buffer.from(JSON.stringify({...handoutPlayerView(h),exported_at:new Date().toISOString()},null,2)+"\n","utf8")});
    if(f==="markdown") out.push({name:`${base}.md`,buffer:Buffer.from(md,"utf8")});
    if(f==="docx") out.push({name:`${base}.docx`,buffer:markdownToDocx(md,`${h.title} — Veiled City Evidence`)});
  }
  return out;
}

export function handoutSummary(h){
  const badge={canonical:"CANONICAL",partial:"PARTIAL",unreliable:"UNRELIABLE",illustrative:"ILLUSTRATIVE"}[h.authority]||String(h.authority).toUpperCase();
  return `**📎 Evidence — ${h.title}**\nType: ${h.kind} • Authority: **${badge}**\n${safe(h.content).slice(0,1300)}${safe(h.content).length>1300?"…":""}\n\nID: \`${String(h.id).slice(0,8)}\``;
}
