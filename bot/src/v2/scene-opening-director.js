import {createHash} from 'node:crypto';import {createNpcPrivateContext} from './npc-private-context.js';import {createNpcDecisionPlanner} from './npc-decision-planner.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Private thought only, once per native opening/reopening and NPC. No timers,
 * player source, speech publication, fictional time, consequences or AI tools.
 */
export function createSceneOpeningDirector({sceneStore,store,provider,allowedGuildIds=null,onError=()=>{}}){
 if(['sceneNpcRefs','history'].some(k=>typeof sceneStore?.[k]!=='function')||['readScene','readSession','readActor'].some(k=>typeof sceneStore?.readers?.[k]!=='function')||['claimNpcSceneOpportunity','npcKnownRefs','npcOpportunityCount','propose','metadata','readText','append'].some(k=>typeof store?.[k]!=='function')||typeof provider?.generate!=='function')throw new TypeError('Native scene Director dependencies required');
 const pending=new Set(),controller=new AbortController();let closed=false;
 function sourceFor(campaign,sceneId){
  if(closed||allowedGuildIds&&!allowedGuildIds.has(campaign))throw new Error('Director scene unavailable');
  const scene=sceneStore.readers.readScene(campaign,sceneId),session=scene&&sceneStore.readers.readSession(campaign,scene.sessionId),epoch=scene?.authorityRevision??scene?.revision,opening=scene&&sceneStore.history(campaign,'scene',sceneId).find(h=>h.record.revision===epoch);
  if(scene?.campaignId!==campaign||scene.status!=='active'||session?.status!=='active'||opening?.record.status!=='active'||!opening.sourceRef)throw new Error('Current committed native scene opening required');
  return {id:'director-source:'+hash([campaign,sceneId,epoch,opening.sourceRef]),campaign,scene:sceneId,revision:hash([scene,session,opening]),principal:'native:scene-director',actors:[],recipients:[],text:'',kind:'private_scene_opening'};
 }
 const authority={revalidate(source){try{return JSON.stringify(sourceFor(source.campaign,source.scene))===JSON.stringify(source);}catch{return false;}}},context=createNpcPrivateContext({sourceAuthority:authority,records:store,readActor:sceneStore.readers.readActor});
 function considerScene(campaign,sceneId,{maxPlans=1,signal}={}){
  const work=(async()=>{if(!Number.isSafeInteger(maxPlans)||maxPlans<1||maxPlans>4)throw new Error('Bounded Director planning required');const combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;combined.throwIfAborted();const source=sourceFor(campaign,sceneId),results=[];let attempts=0;
   const actors=sceneStore.sceneNpcRefs(campaign,sceneId).map(id=>({id,count:store.npcOpportunityCount(campaign,id)})).sort((a,b)=>a.count-b.count||a.id.localeCompare(b.id));
   for(const {id:actorId}of actors){if(attempts>=maxPlans)break;combined.throwIfAborted();const actor=sceneStore.readers.readActor(campaign,actorId);if(actor?.controllerUserId!==null||actor.controlRole!=null||actor.delegationRef!=null||actor.proxyAuthorized===true)continue;
    const refs=store.npcKnownRefs(campaign,sceneId,actorId);if(!refs.length)continue;
    const actorHash=hash(actor),check=()=>{combined.throwIfAborted();if(!authority.revalidate(source)||hash(sceneStore.readers.readActor(campaign,actorId))!==actorHash)throw new Error('Director opportunity changed');},claim=store.claimNpcSceneOpportunity({campaignId:campaign,sceneId,actorId,actorRevision:actor.controlRevision,sourceRef:source.id,sourceRevision:source.revision},{check});if(!claim.created){results.push({actorId,status:'already_considered'});continue;}
    attempts++;try{const grant=context.issue(source,refs,{actorId}),planner=createNpcDecisionPlanner({contextAuthority:context,provider}),handle=await planner.plan(grant,{signal:combined});check();const retained=planner.retain(handle,{store});store.propose({campaignId:campaign,id:claim.ref+':result',kind:'native_npc_scene_result',status:'private_proposal_retained',actorId,sourceRef:source.id,planRef:retained.ref,executionAuthority:false,publicationAuthority:false});results.push({actorId,status:'private_proposal_retained',planRef:retained.ref});}catch(error){try{onError(error,{stage:'native_scene_director',campaignId:campaign,sceneId,actorId});}catch{}results.push({actorId,status:'private_planning_held'});}
   }return Object.freeze({status:'considered_private_opportunity',attempts,results:Object.freeze(results),effectsCommitted:false,publicationAuthority:false});
  })();pending.add(work);return work.finally(()=>pending.delete(work));
 }
 return Object.freeze({considerScene,async drain(){await Promise.allSettled([...pending]);},close(){if(closed)return;closed=true;controller.abort();}});
}
