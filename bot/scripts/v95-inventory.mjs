/** Reproducible static inventory only; no execution, secrets, campaign data or semantic coverage claims. */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
const root=path.resolve(".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const files=[...fs.readdirSync("src").map(n=>`bot/src/${n}`),...fs.readdirSync("scripts").map(n=>`bot/scripts/${n}`)]
  .filter(p=>/\.(?:js|mjs|bak)$/.test(p));
// Include nested runtime modules without following arbitrary files or symlinks.
for(const entry of fs.readdirSync("src",{withFileTypes:true}).filter(e=>e.isDirectory()))
  for(const name of fs.readdirSync(`src/${entry.name}`))if(/\.js$/.test(name))files.push(`bot/src/${entry.name}/${name}`);
files.sort();
const registry=read("bot/scripts/validate-offline.mjs"),pkg=JSON.parse(read("bot/package.json"));
const assertions=[],graph=files.map(file=>{
  const text=read(file),imports=[...text.matchAll(/(?:from\s*|import\s*\(|import\s*|require\s*\()(["'])([^"']+)\1/g)]
    .map(m=>m[2]).filter(p=>p.startsWith(".")).map(p=>path.posix.normalize(path.posix.join(path.posix.dirname(file),p)));
  text.split(/\r?\n/).forEach((line,i)=>{
    if(/\btest\(|\bassert[.(]/.test(line))assertions.push({file,line:i+1,text:line.trim()});
  });
  return {file,sha256:createHash("sha256").update(text.replaceAll("\r\n","\n")).digest("hex"),imports,
    nonliteral_dynamic_import:/\bimport\s*\(\s*[^"'\s]/.test(text),
    registered:file.startsWith("bot/scripts/")&&registry.includes(`"${path.basename(file,".mjs")}"`)};
});
for(const row of graph){
  row.callers=graph.filter(r=>r.imports.includes(row.file)).map(r=>r.file);
  row.classification=row.file.includes("legacy-authority")?"backward-compatibility:KEEP"
    :row.file.endsWith(".bak")?"backup:verify packaging before retirement"
    :row.file.startsWith("bot/src/")?row.callers.length||row.file.endsWith("index.js")?"runtime:KEEP":"uncertain:KEEP"
    :row.registered?"mandatory-suite:KEEP":row.callers.length?"fixture-or-tool:KEEP":"unregistered:review callers outside module graph";
}
function csvRows(text){
  const rows=[];let row=[],value="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===","&&!quoted){row.push(value);value="";}
    else if(c==="\n"&&!quoted){row.push(value.replace(/\r$/,""));rows.push(row);row=[];value="";}
    else value+=c;
  }
  if(value||row.length){row.push(value);rows.push(row);}return rows;
}
const [headers,...matrix]=csvRows(read("docs/V9_4_REGRESSION_MATRIX.csv"));
const suites=graph.filter(r=>r.registered),tokens=s=>new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>3));
const mappings=matrix.filter(r=>r.length===headers.length).map(values=>{
  const item=Object.fromEntries(headers.map((h,i)=>[h,values[i]])),terms=tokens(`${item.scenario} ${item.arrange_act} ${item.expected_outcome}`);
  const candidates=assertions.filter(a=>suites.some(s=>s.file===a.file)).map(a=>({a,
    score:[...tokens(a.text)].filter(t=>terms.has(t)).length+(a.text.includes(item.id)?4:0)}))
    .filter(v=>v.score>0).sort((a,b)=>b.score-a.score||a.a.file.localeCompare(b.a.file)).slice(0,4);
  return [item.id,item.phase,item.scenario,candidates.map(v=>`${v.a.file}:${v.a.line}`).join(";"),
    candidates.map(v=>v.a.text).join(" | "),"KEEP_ORIGINAL; candidate assertion index, NOT equivalence certification"];
});
const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync("../docs/V9_5_SOURCE_INVENTORY.json",JSON.stringify({version:1,static_only:true,
  caveats:["Literal imports only; dynamic dispatch and external operators need review.",
    "Candidate matching does not prove semantic/assertion equivalence; retain all mandatory suites."],
  package_scripts:pkg.scripts,modules:graph},null,2)+"\n");
fs.writeFileSync("../docs/V9_5_COVERAGE_CROSSWALK.csv",[
  ["old_case_id","phase","scenario","candidate_assertion_refs","candidate_assertions","status"],...mappings]
  .map(r=>r.map(quote).join(",")).join("\n")+"\n");
console.log(JSON.stringify({modules:graph.length,mandatory_suites:suites.length,assertion_sites:assertions.length,
  original_cases:mappings.length,unmapped:mappings.filter(r=>!r[3]).length,semantic_equivalence:"not asserted"}));
