import {join} from 'node:path';
import {openSceneStore} from './scene-store.js';
import {openSourceRegistry} from './source-registry.js';
import {createSourceAuthority} from './source-authority.js';
import {openActionStore} from './rules/action-store.js';
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
      promptStore=open(openDeathPromptStore,join(directory,'prompts.sqlite'),{clock}),decisionStore=open(openComponentDecisionStore,join(directory,'decisions.sqlite')),interactionReceipts=open(openInteractionReceipts,join(directory,'interactions.sqlite'));
    const canonical=createCanonicalActorReaders({sceneStore,actionStore,characterRepository}),sourceAuthority=createSourceAuthority({...canonical.readers,sourceRegistry:registry}),readPolicy=createCampaignGmPolicyReader({repository:campaignRepository,...gmPolicy});
    const route=(campaignId,actorId)=>{const actor=sceneStore.readers.readActor(campaignId,actorId),channel=actor?.kind==='pc'&&actor.ownerUserId?sceneStore.ownerPrivateChannel(campaignId,actor.sceneId,actor.ownerUserId):null;if(!channel)throw new Error('Verified owner private channel required');return {guildId:campaignId,channelId:channel.id,sceneId:actor.sceneId,ownerUserId:actor.ownerUserId};};
    const conversationReaders={...canonical.readers,sourceRegistry:registry},conversationAuthority=createSourceAuthority(conversationReaders);
    const turnStore=provider?open(openTurnStore,join(directory,'turns.sqlite')):null,knowledgeStore=provider?open(openKnowledgeStore,join(directory,'knowledge.sqlite')):null;
    const readOwnerSession=createOwnerSessionReader({sceneStore,repository:characterRepository,readPolicy});
    const intake=createDiscordIntake({messageReader:createDiscordMessageReader({client}),sceneStore});
    router=createDiscordInteractionRouter({client,
      nativeDeath:{actionStore,sceneStore,sourceAuthority,readActorSnapshot:canonical.readActorSnapshot,readRoute:route,readOwnerRoute:route,promptStore,decisionStore,interactionReceipts,clock,rng},
      nativeSession:{readOwnerSession,readCharacter:createCharacterIdentityReader({repository:characterRepository})},
      nativeGm:{readPolicy,drafts:turnStore?{refreshSource:async(c,s,r,{signal})=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c)throw new Error('Draft campaign mismatch');const event=conversationAuthority.eventForReference(s),channel=sceneStore.readers.readChannel(c,sceneStore.readers.readMessage(c,event.messageId).channelId);await intake.ingest({guildId:c,channelId:channel.id,messageId:event.messageId,userId:event.userId,actorId:event.actorId,sceneId:proof.scene,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:readPolicy(c).gmRoleId??null,participantIds:channel.kind==='party'?channel.recipientIds:[]},{signal});},inspectSource:(c,s,r)=>{const proof=conversationAuthority.inspectReference(s,r);if(proof.campaign!==c)throw new Error('Draft campaign mismatch');return proof;},recent:(c,n)=>turnStore.recentDrafts(c,n),begin:(c,s,o)=>turnStore.beginPublication(c,s,o),finish:(c,s,m)=>turnStore.finishPublication(c,s,m),uncertain:(c,s,r)=>turnStore.markPublicationUncertain(c,s,r)}:null,bootstrap:{readSource:createPcBootstrapSource({sceneStore,characterRepository}),actionStore},characters:characterRepository},
      allowedGuildIds,handleOtherCommand,handleOtherComponent,onError});
    // The records store is real but empty and nothing selects references yet, so context stays empty;
    // turns are withheld drafts and are never sent.
    const turns=provider?createDiscordTurnRunner({intake,provider,turnStore,applicationOptions:{readers:conversationReaders,records:knowledgeStore}}):null;
    observer=createDiscordMessageObserver({client,sceneStore,readOwnerSession,intake,turns,allowedGuildIds,onDraft,onError});
    return Object.freeze({router,turns,knowledgeStore,readOwnerRoute:route,sceneStore,actionStore,async drain(){await observer.drain();return router.drain();},close(){if(closed)return;closed=true;observer.close();router.close();for(const store of opened.reverse())store.close();}});
  }catch(error){observer?.close();router?.close();for(const store of opened.reverse())try{store.close();}catch{}throw error;}
}
