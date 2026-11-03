import {createHash} from 'node:crypto';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
import {createDiscordDeathDecisions} from './discord-death-decisions.js';
import {createComponentChoiceSources} from './component-choice-sources.js';
import {createDeathDecisionIngress} from './rules/death-decision-ingress.js';
import {createDiscordDeathPrompts} from './discord-death-prompts.js';
import {createDiscordDeathDispatcher} from './discord-death-dispatcher.js';
import {inspectOwnerReceiptSource} from './rules/owner-receipt-source.js';
import {createDeathInteractionReconciliation} from './death-interaction-reconciliation.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Native composition only. No model capabilities, legacy routing or database
 * bootstrap. Callers supply already authenticated native stores/rule readers.
 */
export function createNativeDeathWorkflow({client,actionStore,sceneStore,sourceAuthority,readActorSnapshot,readRoute,promptStore,decisionStore,interactionReceipts,clock=()=>Date.now(),rng,onError=()=>{}}){
  if(typeof promptStore?.ensure!=='function'||typeof actionStore?.resolveIncomingDeath!=='function'||typeof readRoute!=='function'||typeof clock!=='function'||rng!==undefined&&typeof rng!=='function')throw new TypeError('Native death workflow dependencies required');
  let closed=false,choiceSources;const controller=new AbortController();
  const ingress=createDeathDecisionIngress({actionStore,sourceAuthority,readActorSnapshot,readDecision:ref=>choiceSources.readDecision(ref)});
  const audienceReader=createDiscordAudienceReader({client});
  const decisions=createDiscordDeathDecisions({client,promptStore,readTerms:ingress.readTerms,audienceReader,decisionStore});
  choiceSources=createComponentChoiceSources({decisionReader:decisions,sceneStore,sourceAuthority,audienceReader});
  const routeForPrompt=ref=>{const row=promptStore.read(ref);if(!row||!row.terms.requestRef.startsWith('incoming-death:'))throw new Error('Saved native death prompt route required');return readRoute(row.terms.campaignId,row.terms.requestRef.slice('incoming-death:'.length));};
  const publisher=createDiscordDeathPrompts({client,promptStore,readTerms:ingress.readTerms,readRoute:routeForPrompt});
  const reconciliation=createDeathInteractionReconciliation({interactionReceipts,decisionStore,promptStore,actionStore,sourceAuthority,readActorSnapshot});
  async function present(campaignId,attackRef,{check,signal}={}){
    if(typeof check!=='function')throw new Error('Native owner workflow authorization required');
    const workSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    const current=()=>{workSignal.throwIfAborted();if(closed)throw new Error('Native death workflow closed');check();};current();
    let outcome=actionStore.readIncomingDeathOutcome(campaignId,attackRef);
    if(!outcome&&actionStore.readIncomingDeathChoice(campaignId,attackRef))outcome=actionStore.resolveIncomingDeath(campaignId,attackRef,{check:current,sourceAuthority,readActorSnapshot,...(rng?{rng}:{})});
    if(outcome&&outcome.status!=='awaiting_allocation')return {status:outcome.status,requestRef:outcome.requestRef};
    const purpose=outcome?'death_allocation':actionStore.readIncomingDeathReview(campaignId,attackRef)?'death_choice':'death_review';
    const terms=ingress.readTerms(campaignId,`incoming-death:${attackRef}`,purpose),route=structuredClone(readRoute(campaignId,attackRef));
    if(route?.guildId!==campaignId||route.sceneId!==terms.sceneId||route.ownerUserId!==terms.ownerUserId||typeof route.channelId!=='string'||!route.channelId)throw new Error('Exact native owner death workflow route required');
    const stable=()=>{current();if(hash(ingress.readTerms(campaignId,terms.requestRef,purpose))!==hash(terms)||JSON.stringify(readRoute(campaignId,attackRef))!==JSON.stringify(route))throw new Error('Native death workflow changed');};
    const row=promptStore.ensure({terms,channelId:route.channelId,expiresAt:clock()+600000},{check:stable});
    if(['expired','revoked'].includes(row.status)||['delivering','uncertain'].includes(row.status)&&!row.publication?.response)return {status:'native_review_required',promptRef:row.id,reason:row.status};
    const delivered=row.status==='awaiting_delivery'?await publisher.publish(row.id,{check:stable,signal:workSignal}):await publisher.reconcile(row.id,{check:stable,signal:workSignal});
    return {status:'presented',promptRef:delivered.id,purpose,messageId:delivered.messageId};
  }
  async function refresh(campaignId,attackRef,promptRef,{check,interactionId,signal}={}){
    if(typeof check!=='function')throw new Error('Native owner refresh caller authorization required');
    const requestRef=`incoming-death:${attackRef}`,old=promptStore.read(promptRef);
    function purpose(){const o=actionStore.readIncomingDeathOutcome(campaignId,attackRef);if(o?.status==='awaiting_allocation')return 'death_allocation';if(o||actionStore.readIncomingDeathChoice(campaignId,attackRef))throw new Error('Saved native choice/outcome cannot be replaced by refreshing controls');return actionStore.readIncomingDeathReview(campaignId,attackRef)?'death_choice':'death_review';}
    const stage=purpose(),terms=ingress.readTerms(campaignId,requestRef,stage),route=structuredClone(readRoute(campaignId,attackRef));
    if(!old||old.terms.campaignId!==campaignId||old.terms.requestRef!==requestRef||old.terms.purpose!==stage||old.terms.actorId!==terms.actorId||old.terms.ownerUserId!==terms.ownerUserId||route?.guildId!==campaignId||route.sceneId!==terms.sceneId||route.ownerUserId!==terms.ownerUserId)throw new Error('Exact stale owner controls required');
    const approval=()=>{
      controller.signal.throwIfAborted();signal?.throwIfAborted();check();const row=interactionReceipts.read(interactionId),b=row?.binding;
      if(closed||row?.ack!=='deferred'||!['pending','held','committed'].includes(row.processing)||b?.kind!=='discord_command'||b.operation!=='death-refresh'||b.id!==interactionId||b.promptRef!==promptRef||b.requestRef!==requestRef||b.campaignId!==campaignId||b.sceneId!==terms.sceneId||b.actorId!==terms.actorId||b.principal!==terms.ownerUserId||row.bindingHash!==hash(b)||purpose()!==stage||hash(ingress.readTerms(campaignId,requestRef,stage))!==hash(terms)||JSON.stringify(readRoute(campaignId,attackRef))!==JSON.stringify(route))throw new Error('Observed explicit owner refresh command required');
      return {kind:'owner_requested_death_prompt_refresh',interactionId,promptRef,requestRef,campaignId,sceneId:terms.sceneId,actorId:terms.actorId,ownerUserId:terms.ownerUserId,oldTermsHash:old.termsHash,termsHash:hash(terms),commandHash:b.commandHash};
    };approval();
    promptStore.refresh(promptRef,{terms,channelId:route.channelId,expiresAt:clock()+600000},{check:()=>{approval();},readApproval:approval});
    return present(campaignId,attackRef,{check:()=>{approval();},signal});
  }
  const dispatcher=createDiscordDeathDispatcher({client,promptStore,decisionReader:decisions,choiceSources,ingress,receipts:interactionReceipts,onError,async onCommitted({decision,source},{signal}){
    const attackRef=decision.requestRef.slice('incoming-death:'.length),scope={campaignId:decision.campaignId,sceneId:decision.sceneId,actorId:decision.actorId,ownerUserId:decision.principal};
    const check=()=>{controller.signal.throwIfAborted();signal.throwIfAborted();inspectOwnerReceiptSource(sourceAuthority,{sourceRef:source.id,sourceRevision:source.revision},scope,{privateAudience:true});};check();
    const next=await present(decision.campaignId,attackRef,{check,signal});if(next.status==='native_review_required')throw new Error('Native death prompt progression requires reconciliation');
  }});
  return Object.freeze({present,refresh,reconcile(ref,{check}={}){if(typeof check!=='function')throw new Error('Native reconciliation caller authorization required');return reconciliation.reconcile(ref,{check:()=>{controller.signal.throwIfAborted();if(closed)throw new Error('Native death workflow closed');check();}});},drain:()=>dispatcher.drain(),close(){if(closed)return;closed=true;controller.abort();dispatcher.close();decisions.close();}});
}
