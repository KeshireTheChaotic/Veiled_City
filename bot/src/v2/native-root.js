import {join} from 'node:path';
import {createReceiptRecall} from './receipt-recall.js';
import {createStatementOriginRefresh} from './statement-origin-refresh.js';
import {createNpcSpeechLineage} from './npc-speech-lineage.js';
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
import {createNpcPrivateContext} from './npc-private-context.js';
import {createNpcPlanningService} from './npc-planning-service.js';
import {createSceneOpeningDirector} from './scene-opening-director.js';
import {createAutonomousPublication} from './autonomous-publication.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {createProvisionalRulings} from './provisional-rulings.js';
import {openPrivateHookStore} from './private-hook-store.js';
/** Composes the dedicated native stores, adapters and exclusive interaction router.
 * `directory` must be a new directory for these stores, never a production database.
 * The caller supplies the client, the existing character/campaign repositories, an RNG and
 * the callbacks for commands/components the native router does not own.
 */
export function createNativeRoot({client,directory,characterRepository,campaignRepository,rng,clock=()=>Date.now(),provider=null,directorEnabled=false,publicationEnabled=true,privateImportsEnabled=false,gmImportFetch=fetch,allowedGuildIds=null,gmPolicy={},onDraft,handleOtherCommand,handleOtherComponent,onError}){
  if(typeof directory!=='string'||!directory||typeof rng!=='function')throw new TypeError('Native store directory and RNG required');
  if(typeof directorEnabled!=='boolean')throw new TypeError('Explicit native Director opt-in required');
  if(typeof publicationEnabled!=='boolean')throw new TypeError('Explicit native publication mode required');
  if(typeof privateImportsEnabled!=='boolean')throw new TypeError('Explicit native private import opt-in required');
  const opened=[];let router,observer,npcPlanning,director,publisher,closed=false;
  const open=(factory,...args)=>{const store=factory(...args);opened.push(store);return store;};
  try{
    const sceneStore=open(openSceneStore,join(directory,'scenes.sqlite'),{onCommitted:receipt=>{if(!directorEnabled||!director)return;for(const r of receipt.records.filter(r=>r.kind==='scene')){const s=sceneStore.readers.readScene(receipt.campaignId,r.id);if(s?.status==='active'&&s.authorityRevision===String(r.revision))void director.considerScene(receipt.campaignId,r.id).catch(error=>{try{onError?.(error,{stage:'native_scene_director'});}catch{}});}}}),registry=open(openSourceRegistry,join(directory,'sources.sqlite')),actionStore=open(openActionStore,join(directory,'actions.sqlite')),
      costPrompts=open(openCostPromptStore,join(directory,'cost-prompts.sqlite'),{clock}),promptStore=open(openDeathPromptStore,join(directory,'prompts.sqlite'),{clock}),decisionStore=open(openComponentDecisionStore,join(directory,'decisions.sqlite')),interactionReceipts=open(openInteractionReceipts,join(directory,'interactions.sqlite'));
    const canonical=createCanonicalActorReaders({sceneStore,actionStore,characterRepository}),sourceAuthority=createSourceAuthority({...canonical.readers,sourceRegistry:registry}),readPolicy=createCampaignGmPolicyReader({repository:campaignRepository,...gmPolicy});
    const privateHookStore=privateImportsEnabled?open(openPrivateHookStore,join(directory,'private-hooks.sqlite')):null;
    const route=(campaignId,actorId)=>{const actor=sceneStore.readers.readActor(campaignId,actorId),channel=actor?.kind==='pc'&&actor.ownerUserId?sceneStore.ownerPrivateChannel(campaignId,actor.sceneId,actor.ownerUserId):null;if(!channel)throw new Error('Verified owner private channel required');return {guildId:campaignId,channelId:channel.id,sceneId:actor.sceneId,ownerUserId:actor.ownerUserId};};
    const conversationReaders={...canonical.readers,sourceRegistry:registry},conversationAuthority=createSourceAuthority(conversationReaders);
    const turnStore=provider?open(openTurnStore,join(directory,'turns.sqlite')):null,knowledgeStore=provider?open(openKnowledgeStore,join(directory,'knowledge.sqlite')):null;
    const recallStore=provider?open(openRecallStore,join(directory,'recall.sqlite')):null;
    const statementLineage=createStatementLineage({sourceAuthority:conversationAuthority,sourceRegistry:registry,...sceneStore.readers});
    const npcSpeech=knowledgeStore?createNpcSpeechLineage({turnStore,store:knowledgeStore,sceneStore,sourceRegistry:registry,characterRepository,sourceAuthority:conversationAuthority}):null;
    const isSpeech=row=>row.origin?.kind==='native_npc_speech';
    const knowledgeRecords=knowledgeStore?{...knowledgeStore,validateOrigin:row=>(isSpeech(row)?npcSpeech:statementLineage).validate(row),entitledOrigin:(row,source)=>(isSpeech(row)?npcSpeech:statementLineage).entitled(row,source),describeOrigin:(row,source)=>(isSpeech(row)?npcSpeech:statementLineage).describe(row,source),validateNpcOrigin:(row,actorId)=>npcSpeech.knownOrigin(row,actorId)}:null;
    const conversationContext=knowledgeStore?createContextAuthority({sourceAuthority:conversationAuthority,records:knowledgeRecords,readActor:conversationReaders.readActor}):null;
    const recall=recallStore?createRecallPlanner({contextAuthority:conversationContext,readCandidates:s=>knowledgeStore.candidateRefs(s.campaign,s.scene).filter(ref=>ref!==statementReference(s)),readCauses:s=>recallStore.readCauses(s.campaign),readPins:s=>recallStore.readPins(s.campaign),readClock:recallStore.readClock}):null;
    const receiptRecall=recallStore?createReceiptRecall({sourceAuthority:conversationAuthority,statementLineage,knowledgeStore,recallStore,inspectReceipt:(source,ref)=>nativeActions.inspect(source,ref)}):null;
    const rulings=knowledgeStore?createProvisionalRulings({store:knowledgeStore,sourceAuthority:conversationAuthority,readScene:sceneStore.readers.readScene,readSession:sceneStore.readers.readSession}):null;
    const nativeActions=createNativeActionAuthority({sourceAuthority:conversationAuthority,readActor:conversationReaders.readActor,actionStore,rulings,requestConsent:(source,ref)=>router.costs.request(source,ref),onCommittedReceipt:receiptRecall?(source,receipt)=>receiptRecall.record(source,receipt):null,onRecallError:error=>onError?.(error,{stage:'native_receipt_recall'})});
    const readOwnerSession=createOwnerSessionReader({sceneStore,repository:characterRepository,readPolicy});
    const messageReader=createDiscordMessageReader({client}),intake=createDiscordIntake({messageReader,sceneStore});
    const originRefresh=knowledgeStore?createStatementOriginRefresh({contextAuthority:conversationContext,records:knowledgeRecords,sourceRegistry:registry,sceneStore,messageReader,readGmRoleId:c=>readPolicy(c).gmRoleId}):null;
    router=createDiscordInteractionRouter({client,
      nativeGmHookImports:privateHookStore?{repository:characterRepository,readCharacter:canonical.readCharacterExport,hookStore:privateHookStore,fetchImpl:gmImportFetch}:null,
      nativeGmCharacterExports:['withValidationSnapshot','findExportCharacter','readGmCharacterExportFacets'].every(key=>typeof characterRepository[key]==='function')?{repository:characterRepository,readCharacter:canonical.readCharacterExport,hookStore:privateHookStore}:null,
      nativeCharacterExports:['withValidationSnapshot','playerFactsFor','playerExportRelationships'].every(key=>typeof characterRepository[key]==='function')?{repository:characterRepository,readCharacter:canonical.readCharacterExport}:null,
      nativeCost:{actionStore,sceneStore,sourceAuthority,sourceRegistry:registry,readActor:canonical.readActor,readGmRoleId:c=>readPolicy(c).gmRoleId,readRoute:route,promptStore:costPrompts,decisionStore,interactionReceipts,nativeActions,clock},
      nativeDeath:{actionStore,sceneStore,sourceAuthority,readActorSnapshot:canonical.readActorSnapshot,readRoute:route,readOwnerRoute:route,promptStore,decisionStore,interactionReceipts,clock,rng},
      nativeSession:{readOwnerSession,readCharacter:createCharacterIdentityReader({repository:characterRepository})},
      nativeGm:{readPolicy,bootstrap:{readSource:createPcBootstrapSource({sceneStore,characterRepository}),actionStore},characters:characterRepository},
      allowedGuildIds,handleOtherCommand,handleOtherComponent,onError});
    // Weighted metadata-only recall. Gameplay cause issuers and commitment pin lifecycle remain uncomposed.
    // Entitlement includes complete ancestry before any selected body reaches inference.
    // Model knowledge proposals are retained privately; native establishment has no evidence adapter yet.
    const turns=provider?createDiscordTurnRunner({intake,provider,turnStore,readGmRoleId:c=>readPolicy(c).gmRoleId,onSource:source=>{const statement=statementLineage.capture(source),ref=statementReference(source);knowledgeStore.append({campaignId:source.campaign,id:ref,expectedRevision:null,evidenceRef:ref,...statement});if(!conversationAuthority.revalidate(source))throw new Error('Statement source changed during capture');},refreshContext:(source,refs,options)=>originRefresh.refresh(source,refs,options),applicationOptions:{readers:conversationReaders,proseReview:createSceneProseReview({sceneStore,characterRepository,authorizeMaterial:candidate=>nativeActions.authorizeMaterial(candidate)}),records:knowledgeRecords,knowledge:{store:knowledgeStore,readEvidence:()=>null,testimonyAuthor:npcSpeech},selectContext:source=>recall.select(source,{limit:64}),actionAuthority:nativeActions}}):null;
    npcPlanning=provider?createNpcPlanningService({intake,provider,store:knowledgeStore,sourceAuthority:conversationAuthority,contextAuthority:createNpcPrivateContext({sourceAuthority:conversationAuthority,records:knowledgeRecords,readActor:conversationReaders.readActor}),allowedGuildIds}):null;
    director=provider?createSceneOpeningDirector({sceneStore,store:knowledgeStore,provider,records:knowledgeRecords,allowedGuildIds,onError}):null;
    publisher=turns&&publicationEnabled?createAutonomousPublication({turns,sceneStore,audiences:createDiscordAudienceReader({client}),readGmRoleId:c=>readPolicy(c).gmRoleId,resolveChannel:async(c,id)=>{const guild=await client.guilds.fetch({guild:c,force:true});return guild.channels.fetch(id,{force:true});}}):null;
    observer=createDiscordMessageObserver({client,sceneStore,readOwnerSession,intake,turns,allowedGuildIds,onDraft:async(result,request,{signal}={})=>{const delivery=publisher&&result.publication?await publisher.publish(result.publication.id,{signal}):null;if(delivery?.status==='published')npcSpeech.capture(request.guildId,delivery.sourceRef);await onDraft?.({...result,...(delivery?{delivery}:{})},request);},onError});
    return Object.freeze({router,costs:router.costs,turns,npcPlanning,director,publisher,rulings,npcSpeech,knowledgeStore,recallStore,privateHookStore,readOwnerRoute:route,sceneStore,actionStore,async drain(){await observer.drain();await npcPlanning?.drain();const result=await router.drain();await director?.drain();await publisher?.drain();return result;},close(){if(closed)return;closed=true;observer.close();publisher?.close();router.close();npcPlanning?.close();director?.close();for(const store of opened.reverse())store.close();}});
  }catch(error){observer?.close();publisher?.close();router?.close();npcPlanning?.close();director?.close();for(const store of opened.reverse())try{store.close();}catch{}throw error;}
}
