import {parentPort,workerData} from 'node:worker_threads';
import {VeiledDB} from '../../src/db.js';
import {GMService} from '../../src/gm.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import '../../src/ai-intents.js';
import '../../src/audience-native-v9.js';
import {initializeWorldExecution,initializeSessionWorldEvents,initializeSessionSceneWorld,initializeKnowledgeWorld,initializeNarrativeWorld,initializeKnowledgeNarrative,initializeNativeWorldEvents,initializeCharacterWorldEvents,initializeNativeScenes,initializeNativePrincipals} from '../../src/application/composition/public.js';
initializeWorldExecution();initializeSessionWorldEvents();initializeSessionSceneWorld();initializeKnowledgeWorld();initializeNarrativeWorld();initializeKnowledgeNarrative();initializeNativeWorldEvents();initializeCharacterWorldEvents();initializeNativeScenes();initializeNativePrincipals();

const db=new VeiledDB(workerData.dbPath,workerData.schema),barriers=new Int32Array(workerData.barriers);
let observed=false,writes=0,sends=0;
const getCityRecord=db.getCityRecord.bind(db);
db.getCityRecord=(guild,kind,key)=>{
  const row=getCityRecord(guild,kind,key);
  if(!observed&&kind==='session_opening_job'&&key===workerData.session){
    observed=true;parentPort.postMessage({type:'observed',worker:workerData.id,status:row?.status});
    Atomics.add(barriers,0,1);Atomics.notify(barriers,0);
    Atomics.wait(barriers,1,0);
  }
  return row;
};
const gm=Object.create(GMService.prototype);gm.db=db;gm.config={gmTurnDeadlineMs:5000};gm.metrics={record(){}};
gm.generateNarrative=async(_guild,packet)=>{
  writes++;parentPort.postMessage({type:'writer_started',worker:workerData.id});
  Atomics.wait(barriers,2,0);
  return {version:9,acts:[{id:'opening',task_id:packet.audience_v9.task_ids[0],kind:'scene_description',speaker_key:'',
    location_key:packet.place.key||'market',text:'Rain stipples the market awnings. A brass bell sounds behind the closed tea counter.',source_refs:[]}],fiction_delta:[]};
};
const guild={id:'g',channels:{fetch:async id=>({id,isTextBased:()=>true,send:async()=>{
  sends++;const message={id:`ack-${workerData.id}-${sends}`,channelId:id};
  parentPort.postMessage({type:'sent',worker:workerData.id});return message;
}})},members:{fetch:async()=>null}};
try{
  const row=await runSessionOpening({db,guild,gm});
  parentPort.postMessage({type:'done',worker:workerData.id,status:row?.status||null,writes,sends});
}catch(error){parentPort.postMessage({type:'error',worker:workerData.id,code:error?.code||'worker_error'});}
finally{db.db.close();parentPort.close();}
