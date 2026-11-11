import {createHash} from 'node:crypto';
import {createAtomicHopeCostAuthority} from './rules/hope-cost-authority.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;

/** Fixed native engine bridge. A reference is not consent, a cost, or a state patch.
 * Resource receipt projections are owner-private; public disclosure needs its own authority.
 */
export function createNativeActionAuthority({sourceAuthority,readActor,actionStore,inspectBlazeCost}){
  if(typeof sourceAuthority?.inspectReference!=='function'||typeof sourceAuthority?.revalidate!=='function'||typeof readActor!=='function'||typeof actionStore?.readOutcome!=='function')throw new TypeError('Native source, actor and action store required');
  const costs=createAtomicHopeCostAuthority({sourceAuthority,readActor,readActionTerms:actionStore.readActionTerms,readConsent:actionStore.readConsent,actionStore,inspectBlazeCost});
  function owner(source,action){
    if(!sourceAuthority.revalidate(source)||source.recipients.length!==1||source.recipients[0]!==source.principal||!action||action.campaignId!==source.campaign||action.ownerUserId!==source.principal||!source.actors.includes(action.actorId)||action.kind!=='hope_cost')throw new Error('Current owner-private native action required');
    const actor=readActor(source.campaign,action.actorId);
    if(actor?.id!==action.actorId||actor.campaignId!==source.campaign||actor.sceneId!==source.scene||actor.kind!=='pc'||actor.status!=='active'||actor.ownerUserId!==source.principal||actor.controllerUserId!==source.principal||actor.controlRole!=='owner')throw new Error('Current native PC owner required');
  }
  function privateSource(source){if(!sourceAuthority.revalidate(source)||source.recipients.length!==1||source.recipients[0]!==source.principal)throw new Error('Owner-private action inspection required');}
  function inspect(source,ref){
    privateSource(source);if(!id(ref))throw new Error('Native receipt reference required');
    const action=actionStore.read(source.campaign,ref);owner(source,action);
    const receipt=actionStore.readOutcome(source.campaign,ref),terms=actionStore.readActionTerms(source.campaign,ref),consent=receipt&&actionStore.readConsent(source.campaign,receipt.cost?.id);
    if(action.status!=='resolved'||action.effectsCommitted!==true||receipt?.effectsCommitted!==true||JSON.stringify(receipt.afterAction)!==JSON.stringify(action)||receipt.request?.actionId!==ref||receipt.request.campaignId!==source.campaign||!terms||!consent||consent.status!=='accepted'||receipt.cost?.ownerConfirmed!==true)throw new Error('Committed native action receipt required');
    for(const key of ['id','campaignId','sceneId','actorId','ownerUserId','sourceRef','sourceRevision'])if(terms[key]!==action[key])throw new Error('Native receipt identity mismatch');
    for(const key of ['campaignId','sceneId','actorId','ownerUserId','sourceRef','sourceRevision'])if(consent[key]!==action[key]||key!=='sceneId'&&receipt.cost[key]!==action[key])throw new Error('Native consent identity mismatch');
    if(consent.actionRevision!==terms.revision||receipt.cost.revision!==consent.revision||receipt.cost.operation!=='spend_hope'||receipt.cost.status!=='accepted'||receipt.cost.choiceSourceRef!==consent.choiceSourceRef||receipt.cost.choiceSourceRevision!==consent.choiceSourceRevision)throw new Error('Native consent lineage mismatch');
    if(terms.cost?.resource!=='hope'||!Number.isSafeInteger(terms.cost.amount)||terms.cost.amount<1||consent.actionRef!==ref||consent.amount!==terms.cost.amount||consent.costSlot!==terms.cost.slot||receipt.cost.amount!==terms.cost.amount||receipt.cost.actionRef!==ref||receipt.cost.costSlot!==terms.cost.slot||receipt.cost.ownerUserId!==action.ownerUserId||receipt.beforeHope?.actorId!==action.actorId||receipt.afterHope?.actorId!==action.actorId||receipt.beforeHope.ownerUserId!==action.ownerUserId||receipt.afterHope.ownerUserId!==action.ownerUserId||receipt.afterHope.hope!==receipt.beforeHope.hope-terms.cost.amount||receipt.afterHope.revision!==receipt.beforeHope.revision+1)throw new Error('Exact native Hope outcome required');
    privateSource(source);
    return Object.freeze({receipt_ref:ref,receipt_hash:hash([action,receipt,terms,consent]),status:'resolved',operation:'hope_cost',actor_ref:action.actorId,source_ref:action.sourceRef,source_revision:action.sourceRevision,effects_committed:true,disclosure:Object.freeze({recipient_ids:Object.freeze([source.principal]),npc_knowledge:false}),effects:Object.freeze([Object.freeze({kind:'resource_spent',resource:'hope',amount:terms.cost.amount})])});
  }
  function propose(source,input){
    privateSource(source);
    const parameters=input.action?.parameters;
    if(input.action?.kind!=='hope_cost.commit'||!parameters||Object.keys(parameters).sort().join(',')!=='action_ref,consent_ref'||![parameters.action_ref,parameters.consent_ref].every(id))throw new Error('Native action and consent references required');
    const action=actionStore.read(source.campaign,parameters.action_ref);owner(source,action);
    if(action.actorId!==input.actor_ref)throw new Error('Native action actor mismatch');
    const consent=actionStore.readConsent(source.campaign,parameters.consent_ref);
    if(!consent||(action.sourceRef!==source.id||action.sourceRevision!==source.revision)&&(consent.choiceSourceRef!==source.id||consent.choiceSourceRevision!==source.revision))throw new Error('Original action or exact owner choice source required');
    const original=sourceAuthority.inspectReference(action.sourceRef,action.sourceRevision);
    if(original.campaign!==source.campaign||original.scene!==source.scene||original.principal!==source.principal||!original.actors.includes(action.actorId))throw new Error('Current native original action required');
    const prior=actionStore.readOutcome(source.campaign,action.id),revision=prior?.request.expectedHopeRevision??actionStore.readHope(source.campaign,action.actorId)?.revision;
    costs.commit(original,action.actorId,parameters,revision);
    return inspect(source,action.id);
  }
  function verifyDependencies(source,entries){
    if(!sourceAuthority.revalidate(source)||!Array.isArray(entries)||entries.length>16)throw new Error('Saved native receipt lineage required');
    const refs=new Set();
    for(const entry of entries){
      if(!entry||Object.keys(entry).sort().join(',')!=='receiptHash,receiptRef'||!id(entry.receiptRef)||refs.has(entry.receiptRef)||typeof entry.receiptHash!=='string'||!/^[a-f0-9]{64}$/.test(entry.receiptHash))throw new Error('Native receipt dependency required');
      refs.add(entry.receiptRef);if(inspect(source,entry.receiptRef).receipt_hash!==entry.receiptHash)throw new Error('Native receipt lineage changed');
    }
    return true;
  }
  // Exact factual recap only. This is not approval of arbitrary prose or a new effect.
  function authorizeMaterial(candidate){
    try{
      if(!['pc_agency','mechanical_result'].includes(candidate?.kind)||typeof candidate.text!=='string')return false;
      const match=/^You spent ([1-9]\d*) Hope\.$/.exec(candidate.text);
      if(!match||!Number.isSafeInteger(Number(match[1])))return false;
      const {audience,receiptDependencies}=candidate;
      if(!audience||!Array.isArray(receiptDependencies)||receiptDependencies.length!==1)return false;
      const source=sourceAuthority.inspectReference(audience.source_ref,audience.revision);
      if(source.campaign!==audience.campaign||source.scene!==audience.scene||JSON.stringify(source.recipients)!==JSON.stringify(audience.recipients))return false;
      verifyDependencies(source,receiptDependencies);
      const receipt=inspect(source,receiptDependencies[0].receiptRef);
      return receipt.effects.length===1&&receipt.effects[0].kind==='resource_spent'&&receipt.effects[0].resource==='hope'&&receipt.effects[0].amount===Number(match[1]);
    }catch{return false;}
  }
  return Object.freeze({authorizeMaterial,verifyDependencies,supports:kind=>kind==='hope_cost.commit',propose,inspect,describe:()=>[{kind:'hope_cost.commit',version:'1'}]});
}
