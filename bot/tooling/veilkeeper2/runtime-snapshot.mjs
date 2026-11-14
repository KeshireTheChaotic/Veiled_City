import {createRuntimeSnapshot,inspectRuntimeSnapshot,restoreRuntimeSnapshot} from '../../src/v2/runtime-snapshots.js';
const [operation,...args]=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--directory','--legacy','--guild','--leases','--destination','--snapshot','--hash'].includes(key)||!value||value.startsWith('--')||Object.hasOwn(options,key))throw new Error('Unique named snapshot options required');options[key]=value;}
const required=keys=>{for(const key of keys)if(!options[key])throw new Error('Required snapshot option: '+key);};let result;
if(operation==='create'){required(['--directory','--legacy','--guild','--destination']);result=createRuntimeSnapshot({directory:options['--directory'],legacyDb:options['--legacy'],guildId:options['--guild'],destination:options['--destination'],...(options['--leases']?{leaseDirectory:options['--leases']}:{})});}
else if(operation==='inspect'){required(['--snapshot']);const s=inspectRuntimeSnapshot(options['--snapshot'],{expectedHash:options['--hash']});result={directory:s.directory,snapshotHash:s.snapshotHash,guildId:s.guildId,runId:s.manifest.runId,files:s.files};}
else if(operation==='restore'){required(['--snapshot','--hash','--destination']);result=restoreRuntimeSnapshot({snapshotDirectory:options['--snapshot'],expectedHash:options['--hash'],destination:options['--destination'],...(options['--leases']?{leaseDirectory:options['--leases']}:{})});}
else throw new Error('Native offline snapshot command: create, inspect or restore. No Discord login or inference occurs.');
console.log(JSON.stringify(result,null,2));
