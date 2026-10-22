import {parentPort,workerData} from 'node:worker_threads';
import {VeiledDB} from '../../src/db.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';
const db=new VeiledDB(workerData.dbPath,workerData.schema);let calls=0;
const gm={planAssembly:async()=>{calls++;parentPort.postMessage({type:'planning'});await new Promise(resolve=>parentPort.once('message',resolve));throw new Error('mock provider offline');}};
try{const row=await runSessionOpening({db,guild:{id:'g'},gm});parentPort.postMessage({type:'done',calls,status:row.status});}
catch(error){parentPort.postMessage({type:'error',code:error.code||'worker_error'});}
finally{db.db.close();parentPort.close();}
