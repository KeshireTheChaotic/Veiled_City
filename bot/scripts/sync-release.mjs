/** Mechanical release metadata synchronization; manifest excludes secrets, runtime data and its own generated artifacts. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { phaseVersion } from "./release-version.mjs";
import { manifestBytes } from "./release-files.mjs";
const root=path.resolve(".."),packageFile=path.join(root,"bot/package.json");
const pkg=JSON.parse(fs.readFileSync(packageFile,"utf8"));
const version=phaseVersion(pkg.version,process.argv[2],{major:process.argv.includes("--major")});
pkg.version=version;fs.writeFileSync(packageFile,JSON.stringify(pkg,null,2)+"\n");
const readme=path.join(root,"README.md");fs.writeFileSync(readme,fs.readFileSync(readme,"utf8").replace(/ENGINE v\d+\.\d+\.\d+/,`ENGINE v${version}`));
const git=process.env.VEILED_GIT||"git";
const files=[...new Set(execFileSync(git,["ls-files","--cached","--others","--exclude-standard","-z"],{cwd:root,encoding:"utf8"}).split("\0"))]
  .filter(file=>file&&!["manifest.json","MANIFEST.txt"].includes(file)&&fs.existsSync(path.join(root,file)))
  .filter(file=>!/(^|\/)(?:\.env(?:\.|$)|node_modules\/)|veiled_city\.sqlite(?:-|$)/.test(file)||file.endsWith(".env.example"))
  .sort().map(file=>{const bytes=manifestBytes(fs.readFileSync(path.join(root,file)));return {path:file,size_bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};});
fs.writeFileSync(path.join(root,"manifest.json"),JSON.stringify({package:"Veiled_City_Multiplayer_Discord",version,
  generated:new Date().toISOString().slice(0,10),content_normalization:"utf8-lf",files},null,2)+"\n");
fs.writeFileSync(path.join(root,"MANIFEST.txt"),files.map(file=>file.path).join("\n")+"\n");
console.log(`Release metadata synchronized: ${version}; ${files.length} non-runtime files.`);
