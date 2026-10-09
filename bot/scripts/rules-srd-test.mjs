/** Official SRD retrieval, native rules desk integration and safe fallback; synthetic HTTP/PDF fixtures only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OnlineSrd, SRD_INDEX, discoverSrdPdf, extractSrdPages, selectSrdExcerpts } from "../src/rules-srd.js";
import { GMService } from "../src/gm.js";
import { VeiledDB } from "../src/db.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { loadConfig } from "../src/config.js";
import { handleCommand } from "../src/commands.js";
const pdfUrl="https://www.daggerheart.com/wp-content/uploads/2026/08/Fixture-SRD-2.pdf";
const html=`<a href="https://evil.example/old-SRD.pdf">Old SRD</a><a href="${pdfUrl}">DOWNLOAD the Daggerheart SRD</a>`;
const pages=[{page:49,text:"Fixture help ally Hope action roll rules."},{page:50,text:"Fixture armor damage rules."}];
const requests=[];let clock=1000,fail=false,extracts=0;
const fetcher=async(url,options)=>{
  requests.push({url,options});if(fail) throw new Error("Offline fixture outage");
  return url===SRD_INDEX?new Response(html,{headers:{"content-type":"text/html"}}):new Response("%PDF-fixture",{headers:{"content-type":"application/pdf"}});
};
const srd=new OnlineSrd({fetcher,now:()=>clock,ttlMs:100,extract:async()=>{extracts++;return pages;}});
assert.equal(discoverSrdPdf(html),pdfUrl);
assert.throws(()=>discoverSrdPdf('<a href="https://evil.example/SRD.pdf">DOWNLOAD SRD</a>'),/unavailable/);
let [one,two]=await Promise.all([srd.lookup("help ally Hope"),srd.lookup("armor damage")]);
assert.equal(one.status,"current");assert.equal(two.status,"current");assert.equal(requests.length,2);assert.equal(extracts,1);
assert.equal(one.excerpts[0].page,49);assert.equal(two.excerpts[0].page,50);
assert.match(one.excerpts[0].source,/#page=49$/);
assert.equal((await srd.lookup("help")).status,"cached");assert.equal(requests.length,2);
clock+=101;fail=true;
assert.equal((await srd.lookup("help")).status,"stale");const failedCount=requests.length;
await srd.lookup("help");assert.equal(requests.length,failedCount,"Failure backoff prevents repeated outbound attempts");
clock+=60001;fail=false;assert.equal((await srd.lookup("help")).status,"current");
assert(requests.every(row=>row.url===SRD_INDEX||row.url===pdfUrl));
assert(requests.every(row=>row.options.redirect==="manual"&&row.options.signal));
assert.equal(selectSrdExcerpts(pages,"unmatchedword",pdfUrl).length,0);
assert(selectSrdExcerpts(Array.from({length:20},(_,i)=>({page:i+1,text:"help ".repeat(2000)})),"help",pdfUrl)
  .every(row=>row.text.length<=3000));

for(const location of ["https://evil.example/SRD.pdf","http://www.daggerheart.com/SRD.pdf","https://user:pass@www.daggerheart.com/SRD.pdf",
  "https://www.daggerheart.com:444/SRD.pdf","https://www.daggerheart.com/SRD.pdf?secret=1"]){
  let count=0;
  const rejected=new OnlineSrd({fetcher:async()=>{count++;return new Response(null,{status:302,headers:{location}});},extract:async()=>assert.fail("No parse on unsafe redirect")});
  assert.equal((await rejected.lookup("Hope")).status,"unavailable");assert.equal(count,1);
}
for(const response of [()=>new Response(new Uint8Array(1000001),{headers:{"content-type":"text/html"}}),
  ()=>new Response("not html",{headers:{"content-type":"application/json"}}),()=>new Response(null,{status:503})]){
  assert.equal((await new OnlineSrd({fetcher:async()=>response()}).lookup("Hope")).status,"unavailable");
}
const invalidPdf=new OnlineSrd({fetcher:async url=>url===SRD_INDEX?new Response(html,{headers:{"content-type":"text/html"}}):new Response("not PDF")});
assert.equal((await invalidPdf.lookup("Hope")).status,"unavailable");
let redirects=0;
assert.equal((await new OnlineSrd({fetcher:async()=>{redirects++;return new Response(null,{status:302,headers:{location:SRD_INDEX}});}}).lookup("Hope")).status,"unavailable");
assert.equal(redirects,4);

// Real parser regression: a minimal generated PDF, without network/filesystem fixture dependencies.
function fixturePdf(){
  const text="BT /F1 12 Tf 20 100 Td (Fixture help ally Hope rules.) Tj ET";
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let out="%PDF-1.4\n";const offsets=[0];
  objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(out);
  out+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n `).join("\n")}\n`;
  return Buffer.from(`${out}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
assert.match((await extractSrdPages(fixturePdf()))[0].text,/Fixture help ally Hope/);
const aborted=new AbortController();aborted.abort();
await assert.rejects(()=>extractSrdPages(fixturePdf(),{signal:aborted.signal}));

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-rules-srd-"));
const db=new VeiledDB(path.join(temp,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="rules-srd",user="owner";db.ensureCampaign(guild);db.upsertPlayer(guild,user,"Owner");
  db.upsertRulesRuling(guild,{key:"help-hope",question:"help ally Hope",ruling:"Fixture human ruling takes precedence",createdBy:user});
  const source=one.excerpts[0].source;
  const ai=new FakeResponses([{classification:"GM_RULING",answer:"Fixture human ruling",basis:"Saved ruling",sources:["GM_RULING: help-hope",source,"https://evil.example/fabricated"]},
    {classification:"PROVISIONAL_RULING",answer:"Needs confirmation",basis:"Missing reference",sources:[]}]);
  const content={search:()=>[],read:()=>""};
  const gm=new GMService({db,content,config:{rulesOnlineSrd:true,rulesModel:"offline",rulesMaxOutputTokens:500,maxRulesChunks:6},ai,srd});
  const output=await gm.answerRulesQuestion({guildId:guild,userId:user,userName:"Owner",question:"help ally Hope DO_NOT_SEND_TO_SITE"});
  assert.equal(ai.requests.length,1);assert.equal(output.classification,"GM_RULING");
  assert(output.sources.includes("GM_RULING: help-hope"));assert(output.sources.includes(source));
  assert(!output.sources.some(value=>value.includes("evil.example")));
  assert.match(ai.requests[0].input,/saved human GM rulings > supplied official online/);
  assert.match(ai.requests[0].input,/Fixture human ruling takes precedence/);
  assert.doesNotMatch(JSON.stringify(requests),/DO_NOT_SEND_TO_SITE/);
  gm.srd=new OnlineSrd({fetcher:async()=>{throw new Error("Fixture outage");}});
  const unavailable=await gm.answerRulesQuestion({guildId:guild,userId:user,userName:"Owner",question:"unknown rule"});
  assert.equal(unavailable.srd_status,"unavailable");assert.match(unavailable.basis,/Online SRD unavailable/);
  gm.config.rulesOnlineSrd=false;gm.srd={lookup:()=>assert.fail("Disabled lookup must not run")};
  ai.outputs.push({classification:"PROVISIONAL_RULING",answer:"Local only",basis:"Fixture",sources:[]});
  assert.equal((await gm.answerRulesQuestion({guildId:guild,userId:user,userName:"Owner",question:"unknown rule"})).srd_status,"disabled");
  ai.outputs.push({classification:"RAW",answer:"Unsupported fixture assertion",basis:"No actual supplied source",sources:["fabricated"]});
  const unsupported=await gm.answerRulesQuestion({guildId:guild,userId:user,userName:"Owner",question:"unknown rule"});
  assert.equal(unsupported.classification,"PROVISIONAL_RULING");assert.deepEqual(unsupported.sources,[]);

  // Real slash-command path must defer before the SRD fetch, and preserve page-linked sources.
  let deferred=false,delivered="";
  gm.config.rulesOnlineSrd=true;gm.srd={lookup:async()=>{assert(deferred);return one;}};
  ai.outputs.push({classification:"RAW",answer:"Fixture source-grounded answer",basis:"Fixture page",sources:[source]});
  const command={id:"rules-srd-delivery",commandName:"vc-rules",guildId:guild,guild:{id:guild},user:{id:user,username:"Owner"},
    member:{displayName:"Owner"},deferred:false,replied:false,isChatInputCommand:()=>true,
    options:{getSubcommand:()=>"ask",getString:()=>"help ally Hope"},
    deferReply:async()=>{deferred=true;command.deferred=true;},reply:()=>assert.fail("No second acknowledgement"),
    editReply:async text=>{delivered=typeof text==="string"?text:text.content;}};
  await handleCommand(command,{db,gm});assert.match(delivered,/#page=49/);
  assert.equal(db.listGuildCharacters(guild).length,0);assert.equal(db.getActiveSession(guild)??null,null);
  const old={...process.env};
  try{
    process.env.DISCORD_TOKEN="dummy";process.env.DISCORD_CLIENT_ID="dummy";process.env.OPENAI_API_KEY="dummy";
    delete process.env.RULES_ONLINE_SRD;assert.equal(loadConfig().rulesOnlineSrd,true);
    process.env.RULES_ONLINE_SRD="false";assert.equal(loadConfig().rulesOnlineSrd,false);
    process.env.RULES_ONLINE_SRD="invalid";assert.throws(()=>loadConfig(),/RULES_ONLINE_SRD/);
  }finally{for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old);}
  console.log("Rules SRD PASS: official-only bounded retrieval, real PDF extraction, caching/backoff, no question exfiltration, rulings precedence, citations, disabled/outage fallback and early Discord acknowledgement.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
