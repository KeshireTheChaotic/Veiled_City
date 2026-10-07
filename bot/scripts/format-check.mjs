/** Dependency-free whitespace/format policy check driven by .editorconfig. */
import fs from "node:fs";
import path from "node:path";

const roots=["src","scripts"];
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
}
for(const root of roots) walk(path.resolve(root));
const errors=[];
for(const file of files){
  const raw=fs.readFileSync(file,"utf8");
  if(!raw.endsWith("\n")) errors.push(`${file}: missing final newline.`);
  raw.split(/\n/).forEach((line,i)=>{
    if(/[ \t]+$/.test(line)) errors.push(`${file}:${i+1}: trailing whitespace.`);
    if(/^\t+/.test(line)) errors.push(`${file}:${i+1}: leading tab indentation.`);
  });
}
if(errors.length){console.error(`FORMAT CHECK FAILED\n${errors.map(x=>` - ${x}`).join("\n")}`);process.exitCode=1;}
else console.log(`FORMAT CHECK PASSED (${files.length} modules/scripts).`);
