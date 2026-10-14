/** Queue measurement wraps the existing serial authority boundary, never changes scheduling. */
import {withTurnTrace} from './turn-trace-context.js';
import {turnLatency} from './turn-latency.js';
export function enqueueTrackedTurn(queue,guild,job,{latency=turnLatency,trace=latency.begin(guild)}={}){
  const key=`guild:${guild}`,depth=queue.depth(key);
  return queue.enqueue(key,()=>withTurnTrace(trace,async()=>{
    trace.queueStarted(depth);
    try{const result=await job(trace);trace.finish(result?.stage||'no_response');return result;}
    catch(error){trace.finish('failed');throw error;}
  }));
}
