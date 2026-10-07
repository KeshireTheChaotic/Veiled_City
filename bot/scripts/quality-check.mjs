/** Static maintainability guard with no third-party dependencies. */
import fs from "node:fs";
import path from "node:path";

const root=path.resolve("src");
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&p.endsWith(".js"))files.push(p);}}
walk(root);
const errors=[];
const warnings=[];
for(const file of files){
  const text=fs.readFileSync(file,"utf8");
  if(!text.trimStart().startsWith("/**")) errors.push(`${file}: missing module responsibility/trust-boundary header.`);
  if(file!==path.join(root,"db.js") && /\bdb\.db\.(prepare|exec)\b/.test(text)) errors.push(`${file}: direct SQLite access bypasses VeiledDB.`);
  for(const [i,line] of text.split(/\r?\n/).entries()){
    if(line.length>1200 && !file.endsWith("concept-context.js")) errors.push(`${file}:${i+1}: extreme source line length (${line.length}).`);
    else if(line.length>240 && !file.endsWith("concept-context.js")) warnings.push(`${file}:${i+1}: long source line (${line.length}).`);
  }
}
if(warnings.length) console.warn(`QUALITY WARNINGS: ${warnings.length} legacy long lines remain; new code should stay under 240 characters.`);
if(errors.length){console.error(`QUALITY CHECK FAILED\n${errors.map(x=>` - ${x}`).join("\n")}`);process.exitCode=1;}
else console.log(`QUALITY CHECK PASSED: ${files.length} source modules; module headers and DB-boundary rules verified.`);
