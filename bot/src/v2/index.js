import {pathToFileURL} from 'node:url';
import {createKernel,createMemoryJournal,createRulesetRegistry} from './kernel.js';

/** Bootable isolation boundary; real Discord authentication is deliberately not installed in R1. */
export function createOfflineApplication(){
  return createKernel({
    authority:{authenticate:()=>null,revalidate:()=>false},
    journal:createMemoryJournal(),rules:createRulesetRegistry()
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.slice(2).some(arg=>arg!=='--offline'))throw new Error('Only offline/no-send mode is available');
  console.log(JSON.stringify(createOfflineApplication().describe(),null,2));
}
