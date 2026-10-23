import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {fixture} from './p10-fixture.mjs';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {prepareAssemblyRefresh,refreshAssemblyPlan} from '../../src/assembly-planning.js';

function eventQueue(){
  const queue=[],waiters=[];
  return {next:()=>queue.length?Promise.resolve(queue.shift()):new Promise(resolve=>waiters.push(resolve)),
    push:message=>{const resolve=waiters.shift();if(resolve)resolve(message);else queue.push(message);}};
}
async function nextMatching(next,predicate){
  for(;;){const message=await next();if(message.type==='error')throw new Error(`worker ${message.worker}: ${message.code}`);
    if(predicate(message))return message;}
}

test('two SQLite connections race one prepared refresh and only the durable claimant invokes the writer',async()=>{
  const f=fixture();let workers=[];
  try{
    f.start();f.gm.planAssembly=async()=>{throw new Error('offline planner');};
    const failed=await runSessionOpening(f);assert.equal(failed.status,'needs_review');
    const review=prepareAssemblyRefresh(f.db,'g',f.session,'gm');assert.ok(review);
    f.gm.planAssembly=async()=>f.currentPlan();
    await refreshAssemblyPlan(f.db,'g','gm',review,f.gm,{authorized:true,interactionId:'explicit-refresh'});
    const prepared=f.db.getCityRecord('g','session_opening_job',f.session.id);assert.equal(prepared.status,'prepared_refresh');

    const barriers=new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT*3),gates=new Int32Array(barriers),events=eventQueue();
    const makeWorker=id=>{
      const worker=new Worker(new URL('./p10-prepared-refresh-worker.mjs',import.meta.url),{workerData:{...f.paths,session:f.session.id,id,barriers}});
      worker.on('message',events.push);workers.push(worker);
    };
    makeWorker('a');makeWorker('b');
    const observedA=nextMatching(events.next,m=>m.type==='observed'),observedB=nextMatching(events.next,m=>m.type==='observed');
    const [a,b]=await Promise.all([observedA,observedB]);
    assert.equal(a.status,'prepared_refresh');assert.equal(b.status,'prepared_refresh');
    Atomics.store(gates,1,1);Atomics.notify(gates,1,2);
    const firstTwo=await Promise.all([events.next(),events.next()]);
    assert.equal(firstTwo.filter(m=>m.type==='writer_started').length,1,JSON.stringify(firstTwo));
    assert.equal(firstTwo.filter(m=>m.type==='done').length,1,JSON.stringify(firstTwo));
    assert.equal(firstTwo.find(m=>m.type==='done').status,'publishing');
    Atomics.store(gates,2,1);Atomics.notify(gates,2,2);
    let doneCount=1,writerCount=1,sendCount=0;
    while(doneCount<2){const message=await events.next();if(message.type==='error')throw new Error(`worker ${message.worker}: ${message.code}`);
      if(message.type==='done')doneCount++;if(message.type==='writer_started')writerCount++;if(message.type==='sent')sendCount++;}
    assert.equal(writerCount,1);assert.equal(sendCount,1);
    assert.equal(f.db.getCityRecord('g','session_opening_job',f.session.id).status,'completed');
  }finally{
    for(const worker of workers)await worker.terminate();
    f.close();
  }
});
