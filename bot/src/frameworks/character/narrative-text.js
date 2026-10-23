import {safeStem} from './file-names.js';
const MAX_MARKDOWN_BYTES=128*1024;
export function normalizeNarrativeMarkdown(text){
  const out=String(text??"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trimEnd()+"\n";
  if(!out.trim()) throw new Error("Narrative Markdown cannot be empty.");
  if(Buffer.byteLength(out,"utf8")>MAX_MARKDOWN_BYTES) throw new Error("Narrative Markdown is too large; maximum is 128 KiB.");
  return out;
}
export function narrativeRelativePath(characterName,scope){
  const stem=safeStem(characterName);
  if(scope==="player") return `PLAYER/PLAYERS/${stem}.md`;
  if(scope==="gm_private") return `GM_PRIVATE/PLAYERS/GM_PRIVATE_${stem}.md`;
  throw new Error("Narrative scope must be player or gm_private.");
}
