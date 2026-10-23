/** Official public SRD retrieval only. No campaign data leaves the process; retrieved text never authorizes state changes. */
import { setImmediate as yieldToEventLoop } from "node:timers/promises";
export const SRD_INDEX="https://www.daggerheart.com/srd/";
const hosts=new Set(["www.daggerheart.com","daggerheart.com"]);
const stop=new Set("the and for with from what when where does can how this that your have are use using rule rules daggerheart".split(" "));
function officialUrl(value,base=SRD_INDEX){
  const url=new URL(value,base);
  if(url.protocol!=="https:"||!hosts.has(url.hostname)||url.username||url.password||url.port||url.search)
    throw new Error("SRD source must remain on the official HTTPS site.");
  return url;
}
export function discoverSrdPdf(html){
  const links=[...String(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .filter(match=>/srd[^/]*\.pdf(?:#.*)?$/i.test(match[1]))
    .sort((a,b)=>Number(/download[\s\S]*srd/i.test(b[2]))-Number(/download[\s\S]*srd/i.test(a[2])));
  for(const link of links){
    try{const url=officialUrl(link[1].replace(/&amp;/g,"&"));url.hash="";return url.href;}catch{/* Reject off-site candidates. */}
  }
  throw new Error("Official SRD PDF link unavailable.");
}
async function download(fetcher,value,signal,maxBytes){
  let url=officialUrl(value);
  for(let redirects=0;redirects<=3;redirects++){
    const response=await fetcher(url.href,{redirect:"manual",signal,headers:{Accept:"text/html, application/pdf"}});
    if([301,302,303,307,308].includes(response.status)){
      await response.body?.cancel();url=officialUrl(response.headers.get("location"),url.href);continue;
    }
    if(!response.ok){await response.body?.cancel();throw new Error("Official SRD request failed.");}
    const reader=response.body?.getReader();if(!reader) throw new Error("Empty SRD response.");
    const chunks=[];let size=0;
    try{
      while(true){
        const {done,value:chunk}=await reader.read();if(done) break;
        size+=chunk.byteLength;if(size>maxBytes) throw new Error("SRD download exceeded its byte budget.");
        chunks.push(chunk);
      }
    }finally{await reader.cancel();reader.releaseLock();}
    return {bytes:Buffer.concat(chunks,size),type:response.headers.get("content-type")||"",url:url.href};
  }
  throw new Error("Too many SRD redirects.");
}
export async function extractSrdPages(bytes,{signal}={}){
  const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,verbosity:0});
  const abort=()=>{void task.destroy().catch(()=>{});};
  signal?.addEventListener("abort",abort,{once:true});
  try{
    signal?.throwIfAborted();const pdf=await task.promise;
    if(pdf.numPages>350) throw new Error("SRD page budget exceeded.");
    const pages=[];let length=0;
    for(let page=1;page<=pdf.numPages;page++){
      signal?.throwIfAborted();const item=await pdf.getPage(page),content=await item.getTextContent();
      const text=content.items.map(token=>token.str||"").join(" ").replace(/\s+/g," ").trim();
      item.cleanup();length+=text.length;
      if(length>2000000) throw new Error("SRD text budget exceeded.");
      pages.push({page,text});
      // Keep other Discord acknowledgements and the refresh deadline responsive.
      await yieldToEventLoop();
    }
    return pages;
  }finally{signal?.removeEventListener("abort",abort);await task.destroy();}
}
/** Lexical retrieval is bounded reference selection, not a claim that every rules ambiguity is answered. */
export function selectSrdExcerpts(pages,question,url){
  const terms=[...new Set((String(question).toLowerCase().match(/[a-z]{3,}/g)||[]).filter(word=>!stop.has(word)))].slice(0,40);
  return pages.map(row=>{
    const lower=row.text.toLowerCase();let score=0,offset=0;
    for(const word of terms){const at=lower.indexOf(word);if(at>=0){score++;if(offset===0)offset=at;}}
    return {...row,score,offset};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.page-b.page).slice(0,4)
    .map(row=>({source:`OFFICIAL SRD: ${url}#page=${row.page}`,page:row.page,authority:"OFFICIAL DAGGERHEART SRD",
      text:row.text.slice(Math.max(0,row.offset-500),Math.max(0,row.offset-500)+3000)}));
}
export class OnlineSrd{
  constructor({fetcher=globalThis.fetch,extract=extractSrdPages,now=Date.now,ttlMs=6*60*60*1000}={}){
    this.fetcher=fetcher;this.extract=extract;this.now=now;this.ttlMs=ttlMs;this.cache=null;this.pending=null;this.retryAfter=0;
  }
  async refresh(){
    if(this.pending) return this.pending;
    this.pending=(async()=>{
      const signal=AbortSignal.timeout(20000);
      const index=await download(this.fetcher,SRD_INDEX,signal,1000000);
      if(!/text\/html/i.test(index.type)) throw new Error("Unexpected SRD index format.");
      const source=discoverSrdPdf(index.bytes.toString("utf8"));
      const pdf=await download(this.fetcher,source,signal,16000000);
      if(!pdf.bytes.subarray(0,5).equals(Buffer.from("%PDF-"))) throw new Error("Invalid official SRD PDF.");
      const pages=await this.extract(pdf.bytes,{signal});
      signal.throwIfAborted();
      if(!Array.isArray(pages)||!pages.length||pages.length>350||!pages.some(row=>row.text?.trim())) throw new Error("SRD text unavailable.");
      this.cache={pages,url:pdf.url,checked:this.now()};return this.cache;
    })();
    try{return await this.pending;}finally{this.pending=null;}
  }
  async lookup(question){
    let status="cached";
    if(!this.cache||this.now()-this.cache.checked>=this.ttlMs){
      if(this.now()<this.retryAfter) status=this.cache?"stale":"unavailable";
      else try{await this.refresh();status="current";this.retryAfter=0;}
      catch{this.retryAfter=this.now()+60000;status=this.cache?"stale":"unavailable";}
    }
    return {status,checked_at:this.cache?new Date(this.cache.checked).toISOString():null,
      source:this.cache?.url||SRD_INDEX,excerpts:this.cache?selectSrdExcerpts(this.cache.pages,question,this.cache.url):[]};
  }
}
