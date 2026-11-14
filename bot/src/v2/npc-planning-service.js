import {createNpcDecisionPlanner} from './npc-decision-planner.js';
/** Optional native-only private planning with the same refreshed Discord intake
 * as conversation. No listener, autonomous cadence, tools or publication path.
 * Requests merely establish current transport provenance, not NPC hearing.
 */
export function createNpcPlanningService({intake,sourceAuthority,contextAuthority,provider,store,allowedGuildIds=null}){
 if(typeof intake?.ingest!=='function'||typeof sourceAuthority?.authenticate!=='function'||['issue','inspect','dependencyManifest'].some(k=>typeof contextAuthority?.[k]!=='function')||typeof provider?.generate!=='function'||typeof store?.append!=='function')throw new TypeError('Native NPC planning service dependencies required');
 const controller=new AbortController(),states=new WeakMap(),pending=new Set();let closed=false;
 const signalFor=signal=>{if(closed)throw new Error('NPC planning service closed');return signal?AbortSignal.any([controller.signal,signal]):controller.signal;};
 async function track(work){const job=work();pending.add(job);try{return await job;}finally{pending.delete(job);}}
 function plan(request,{npcActorId,references,signal}={}){return track(async()=>{
  const nativeRequest=structuredClone(request),nativeReferences=structuredClone(references),combined=signalFor(signal);combined.throwIfAborted();if(allowedGuildIds&&!allowedGuildIds.has(nativeRequest.guildId))throw new Error('NPC planning guild unavailable');
  const event=await intake.ingest(nativeRequest,{signal:combined}),source=sourceAuthority.authenticate(event),grant=contextAuthority.issue(source,nativeReferences,{actorId:npcActorId});
  const refresh=async()=>{combined.throwIfAborted();await intake.ingest(nativeRequest,{signal:combined});combined.throwIfAborted();contextAuthority.inspect(grant);};
  const planner=createNpcDecisionPlanner({contextAuthority,provider:{async generate(input){await refresh();const result=await provider.generate(input);await refresh();return result;}}}),inner=await planner.plan(grant,{signal:combined}),handle=Object.freeze(Object.create(null));
  combined.throwIfAborted();states.set(handle,{request:nativeRequest,planner,inner});return handle;
 });}
 async function current(handle,signal){const combined=signalFor(signal);combined.throwIfAborted();const state=handle&&states.get(handle);if(!state)throw new Error('Issued native NPC planning handle required');await intake.ingest(state.request,{signal:combined});combined.throwIfAborted();state.planner.inspect(state.inner);return state;}
 function inspect(handle,{signal}={}){return track(async()=>{const state=await current(handle,signal);return state.planner.inspect(state.inner);});}
 function retain(handle,{signal}={}){return track(async()=>{const state=await current(handle,signal);return state.planner.retain(state.inner,{store});});}
 return Object.freeze({plan,inspect,retain,async drain(){await Promise.allSettled([...pending]);},close(){if(closed)return;closed=true;controller.abort();}});
}
