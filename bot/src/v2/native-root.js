import {join} from 'node:path';
import {createStatementOriginRefresh} from './statement-origin-refresh.js';
import {createStatementLineage,statementReference} from './statement-lineage.js';
import {openRecallStore} from './recall-store.js';
import {createRecallPlanner} from './recall-planner.js';
import {createSceneProseReview} from './scene-prose-review.js';
import {openSceneStore} from './scene-store.js';
import {openSourceRegistry} from './source-registry.js';
import {createNativeActionAuthority} from './native-action-authority.js';
import {createContextAuthority} from './context-authority.js';
import {createSourceAuthority} from './source-authority.js';
import {openActionStore} from './rules/action-store.js';
import {openCostPromptStore} from './cost-prompt-store.js';
import {openDeathPromptStore} from './death-prompts.js';
import {openComponentDecisionStore} from './component-decision-store.js';
import {openInteractionReceipts} from './interaction-receipts.js';
import {createCanonicalActorReaders} from './canonical-actor-readers.js';
import {createPcBootstrapSource} from './pc-bootstrap-source.js';
import {createCharacterIdentityReader} from './discord-session-attendance.js';
import {createCampaignGmPolicyReader,createOwnerSessionReader} from './native-campaign-adapters.js';
import {createDiscordInteractionRouter} from './discord-interaction-router.js';
import {createDiscordMessageReader} from './discord-message-reader.js';
import {createDiscordIntake} from './discord-intake.js';
import {createDiscordMessageObserver} from './discord-message-observer.js';
import {createDiscordTurnRunner} from './discord-turn-runner.js';
import {openTurnStore} from './turn-store.js';
import {openKnowledgeStore} from './knowledge-store.js';
/** Composes the dedicated native stores, adapters and exclusive interaction router.
 * `directory` must be a new directory for these stores, never a production database.
 * The caller supplies the client, the existing character/campaign repositories, an RNG and
 * the callbacks for commands/components the native router does not own.
 */
export function createNativeRoot({client,directory,characterRepository,campaignRepository,rng,clock=()=>Date.now(),provider=null,allowedGuildIds=null,gmPolicy={},onDraft,handleOtherCommand,handleOtherComponent,onError}){
  if(typeof directory!=='string'||!directory||typeof rng!=='function')throw new TypeError('Native store directory and RNG required');
  const opened=[];let router,observer,closed=false;
  const open=(factory,...args)=>{const store=factory(...args);opened.push(store);return store;};
  try{
    const sceneStore=open(openSceneStore,join(directory,'scenes.sqlite')),registry=open(openSourceRegistry,join(directory,'sources.sqlite')),actionStore=open(openActionStore,join(directory,'actions.sqlite')),
      costPrompts=open(openCostPromptStore,join(directory,'cost-prompts.sqlite'),{clock}),promptStore=open(openDeathPromptStore,join(directory,'prompts.sqlite'),{clock}),decisionStore=open(openComponentDecisionStore,join(directory,'decisions.sqlite')),interactionReceipts=open(openInteractionReceipts,join(directory,'interactions.sqlite'));
    const canonical=createCanonicalActorReaders({sceneStore,actionStore,characterRepository}),sourceAuthority=createSourceAuthority({...canonical.readers,sourceRegistry:registry}),readPolicy=createCampaignGmPolicyReader({repository:campaignRepository,...gmPolicy});
    const route=(campaignId,actorId)=>{const actor=sceneStore.readers.readActor(campaignId,actorId),channel=actor?.kind==='pc'&&actor.ownerUserId?sceneStore.ownerPrivateChannel(campaignId,actor.sceneId,actor.ownerUserId):null;if(!channel)throw new Error('Verified owner private channel required');return {guildId:campaignId,channelId:channel.id,sceneId:actor.sceneId,ownerUserId:actor.ownerUserId};};
    const conversationReaders={...canonical.readers,sourceRegistry:registry},conversationAuthority=createSourceAuthority(conversationReaders);
    const turnStore=provider?open(openTurnStore,join(directory,'turns.sqlite')):null,knowledgeStore=provider?open(openKnowledgeStore,join(directory,'knowledge.sqlite')):null;
    const recallStore=provider?open(openRecallStore,join(directory,'recall.sqlite')):null;
    const statementLineage=createStatementLineage({sourceAuthority:conversationAuthority,sourceRegistry:registry,...sceneStore.readers});
    const knowledgeRecords=knowledgeStore?{...knowledgeStore,validateOrigin:statementLineage.validate}:null;
    const conversationContext=knowledgeStore?createContextAuthority({sourceAuthority:conversationAuthority,records:knowledgeRecords,readActor:conversationReaders.readActor}):null;
    const recall=recallStore?createRecallPlanner({contextAuthority:conversationContext,readCandidates:s=>knowledgeStore.candidateRefs(s.campaign,s.scene).filter(ref=>ref!==statementReference(s)),readCauses:s=>recallStore.readCauses(s.campaign),readPins:s=>recallStore.readPins(s.campaign),readClock:recallStore.readClock}):null;
    const nativeActions=createNativeActionAuthority({sourceAuthority:conversationAuthority,readActor:conversationReaders.readActor,actionStore,requestConsent:(source,ref)=>router.costs.request(source,ref)});
    const readOwnerSession=createOwnerSessionReader({sceneStore,repository:characterRepository,readPolicy});
    const messageReader=createDiscordMessageReader({client}),intake=createDiscordIntake({messageReader,sceneStore});
    const originRefresh=knowledgeStore?createStatementOriginRefresh({contextAuthority:conversationContext,records:knowledgeRecords,sourceRegistry:registry,sceneStore,messageReader,readGmRoleId:c=>readPolicy(c).gmRoleId}):null;
    router=createDiscordInteractionRouter({client,
      nativeCost:{actionStore,sceneStore,sourceAuthority,sourceRegistry:registry,readActor:canonical.readActor,readGmRoleId:c=>readPolicy(c).gmRoleId,readRoute:route,promptStore:costPrompts,decisionStore,interactionReceipts,nativeActions,clock},
      nativeDeath:{actionStore,sceneStore,sourceAuthority,readActorSnapshot:canonical.readActorSnapshot,readRoute:route,readOwnerRoute:route,promptStore,decisionStore,interactionReceipts,clock,rng},
      nativeSession:{readOwnerSession,readCharacter:createCharacterIdentityReader({repository:characterRepository})},
      nativeGm:{readPolicy,drafts:turnStore?{inspectReceipts:(c,s,r,entries)=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c)throw new Error('Receipt campaign mismatch');nativeActions.verifyDependencies(proof,entries);},inspectContext:(c,s,r,manifests)=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c||!Array.isArray(manifests)||manifests.length<1||manifests.length>17)throw new Error('Saved native context lineage required');for(const manifest of manifests)conversationContext.verifyDependencies(proof,manifest);},refreshSource:async(c,s,r,{signal})=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c)throw new Error('Draft campaign mismatch');const event=conversationAuthority.eventForReference(s),channel=sceneStore.readers.readChannel(c,sceneStore.readers.readMessage(c,event.messageId).channelId);await intake.ingest({guildId:c,channelId:channel.id,messageId:event.messageId,userId:event.userId,actorId:event.actorId,sceneId:proof.scene,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:readPolicy(c).gmRoleId??null,participantIds:channel.kind==='party'?channel.recipientIds:[]},{signal});const saved=turnStore.recentDrafts(c,20).find(row=>row.source===s);if(!saved)throw new Error('Saved draft lineage unavailable');await originRefresh.refresh(proof,saved.draft.contextDependencies.flatMap(m=>m.records.map(r=>r.ref)),{signal});},inspectSource:(c,s,r)=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c)throw new Error('Draft campaign mismatch');return proof;},recent:(c,n)=>turnStore.recentDrafts(c,n),begin:(c,s,o)=>turnStore.beginPublication(c,s,o),finish:(c,s,m)=>turnStore.finishPublication(c,s,m),uncertain:(c,s,r)=>turnStore.markPublicationUncertain(c,s,r)}:null,bootstrap:{readSource:createPcBootstrapSource({sceneStore,characterRepository}),actionStore},characters:characterRepository},
      allowedGuildIds,handleOtherCommand,handleOtherComponent,onError});
    // Weighted metadata-only recall. Gameplay cause issuers and commitment pin lifecycle remain uncomposed.
    // Entitlement includes complete ancestry before any selected body reaches inference.
    // Model knowledge proposals are retained privately; native establishment has no evidence adapter yet.
    const turns=provider?createDiscordTurnRunner({intake,provider,turnStore,onSource:source=>{const statement=statementLineage.capture(source),ref=statementReference(source);knowledgeStore.append({campaignId:source.campaign,id:ref,expectedRevision:null,evidenceRef:ref,...statement});if(!conversationAuthority.revalidate(source))throw new Error('Statement source changed during capture');},refreshContext:(source,refs,options)=>originRefresh.refresh(source,refs,options),applicationOptions:{readers:conversationReaders,proseReview:createSceneProseReview({sceneStore,characterRepository,authorizeMaterial:candidate=>nativeActions.authorizeMaterial(candidate)}),records:knowledgeRecords,knowledge:{store:knowledgeStore,readEvidence:()=>null},selectContext:source=>recall.select(source,{limit:64}),actionAuthority:nativeActions}}):null;
    observer=createDiscordMessageObserver({client,sceneStore,readOwnerSession,intake,turns,allowedGuildIds,onDraft,onError});
    return Object.freeze({router,costs:router.costs,turns,knowledgeStore,recallStore,readOwnerRoute:route,sceneStore,actionStore,async drain(){await observer.drain();return router.drain();},close(){if(closed)return;closed=true;observer.close();router.close();for(const store of opened.reverse())store.close();}});
  }catch(error){observer?.close();router?.close();for(const store of opened.reverse())try{store.close();}catch{}throw error;}
}
