import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkProject} from './read-project.mjs';

export function runBoundaryCli(args,{stdout=console.log}={}){
  let root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),mode='ratchet',phase='RF01',jsonFile=null;
  for(let i=0;i<args.length;i++){
    const argument=args[i];
    if(argument==='--strict')mode='strict';else if(argument==='--ratchet')mode='ratchet';
    else if(['--root','--phase','--json'].includes(argument)){
      const value=args[++i];if(!value||value.startsWith('--'))throw new TypeError(`Value required for ${argument}`);
      if(argument==='--root')root=path.resolve(value);else if(argument==='--phase')phase=value;else jsonFile=value;
    }else throw new TypeError(`Unknown architecture argument: ${argument}`);
  }
  if(!/^RF0[1-7]$/.test(phase))throw new TypeError('Explicit RF01–RF07 phase required.');
  const report=checkProject(root,{mode,phase});
  if(jsonFile){
    const target=path.resolve(root,jsonFile),relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new TypeError('Architecture report must remain inside the project root.');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  }
  stdout(JSON.stringify({mode,phase,...report.summary,firstErrors:(report.activeViolations||report.violations).slice(0,5)
    .map(({code,from,to,owner,line})=>({code,from,to,owner,line}))},null,2));
  return report.summary.pass?0:1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=runBoundaryCli(process.argv.slice(2));}
  catch(error){console.error(JSON.stringify({pass:false,code:error.code||'ARCHITECTURE_CHECK_ERROR',file:error.file||null,message:error.message}));process.exitCode=1;}
}
