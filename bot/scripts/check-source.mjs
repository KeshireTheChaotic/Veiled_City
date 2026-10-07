/** Recursively syntax-check every JavaScript module under src/ and scripts/. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
for(const file of files){
  const result=spawnSync(process.execPath,["--check",file],{stdio:"inherit"});
  if(result.status!==0) process.exit(result.status??1);
}
console.log(`JavaScript syntax OK (${files.length} modules/scripts).`);
