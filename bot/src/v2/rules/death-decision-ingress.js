import {createHash} from 'node:crypto';
import {assertDeathEligibility} from './pc-death-eligibility.js';
import {inspectOwnerReceiptSource} from './owner-receipt-source.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const moves=['risk_it_all','avoid_death','blaze_of_glory'];
/** Native bridge from observed private owner components to fixed death operations.
 * No dice, effects or model-selected moves. readDecision must be the authenticated
 * component-source bridge; readActorSnapshot must project current native rules.
 */
export function createDeathDecisionIngress({actionStore,sourceAuthority,readActorSnapshot,readDecision}){
  if(typeof actionStore?.recordIncomingDeathChoice!=='function'||typeof sourceAuthority?.inspectControl!=='function'||typeof readActorSnapshot!=='function'||typeof readDecision!=='function')throw new TypeError('Native death ingress dependencies required');
  function readTerms(campaignId,requestRef,purpose){
    if(!['death_review','death_choice'].includes(purpose)||typeof requestRef!=='string'||!requestRef.startsWith('incoming-death:'))throw new Error('Native death request and purpose required');
    const attackRef=requestRef.slice('incoming-death:'.length),eligible=actionStore.readIncomingDeath(campaignId,attackRef),cause=actionStore.readIncomingDamage(campaignId,attackRef);
    if(!eligible||eligible.id!==requestRef||eligible.campaignId!==campaignId||eligible.status!=='awaiting_owner'||eligible.causeRef!==cause?.id||cause.outcome?.deathChoiceRequired!==true||cause.outcome.effectsCommitted!==true||actionStore.readIncomingDeathOutcome(campaignId,attackRef))throw new Error('Pending canonical final-HP cause required');
    const state=actionStore.readPcLife(campaignId,eligible.actorId),actor=readActorSnapshot(campaignId,eligible.actorId),r=actor?.data?.resources;
    if(!state||state.life.status!=='active'||state.life.ownerUserId!==eligible.ownerUserId||state.life.controlRevision!==eligible.controlRevision||state.defenses.ownerUserId!==eligible.ownerUserId||state.defenses.controlRevision!==eligible.controlRevision||state.hope.ownerUserId!==eligible.ownerUserId||JSON.stringify(state.defenses)!==JSON.stringify(cause.after)||actor?.actorId!==eligible.actorId||actor.ownerUserId!==eligible.ownerUserId||actor.controlRevision!==eligible.controlRevision||actor.status!==state.life.status||actor.data?.level!==state.life.level||JSON.stringify(actor.data?.death_state)!==JSON.stringify(state.life.deathState)||JSON.stringify(r?.hp)!==JSON.stringify(state.defenses.hp)||JSON.stringify(r?.armor)!==JSON.stringify(state.defenses.armorSlots)||JSON.stringify(r?.stress)!==JSON.stringify(state.life.stress)||r?.hope!==state.hope.hope||r?.hope_max!==state.hope.cap)throw new Error('Current canonical native death actor required');
    inspectOwnerReceiptSource(sourceAuthority,cause.attack,{campaignId,sceneId:eligible.sceneId,actorId:eligible.actorId,ownerUserId:eligible.ownerUserId});
    const allowedMoves=moves.filter(move=>{try{assertDeathEligibility(actor,move);return true;}catch(error){if(error.message.includes('Owned death feature requires'))return false;throw error;}});
    const terms={purpose,campaignId,sceneId:eligible.sceneId,actorId:eligible.actorId,ownerUserId:eligible.ownerUserId,controlRevision:eligible.controlRevision,requestRef,attackRef,eligibilityHash:hash(eligible),resourceRevision:state.defenses.revision,stateHash:hash(state),actorSnapshotHash:hash(actor),level:state.life.level,hopeCap:state.hope.cap,allowedMoves};
    if(purpose==='death_choice'){
      const review=actionStore.readIncomingDeathReview(campaignId,attackRef);
      if(review?.status!=='reviewed'||review.evidence.actorSnapshotHash!==terms.actorSnapshotHash)throw new Error('Current saved owner risk review required');
      inspectOwnerReceiptSource(sourceAuthority,review.evidence,{campaignId,sceneId:eligible.sceneId,actorId:eligible.actorId,ownerUserId:eligible.ownerUserId},{privateAudience:true});
      terms.reviewRef=review.evidence.id;terms.reviewHash=hash(review);
    }
    return terms;
  }
  function record(source){
    let expected;
    function inspect(){
      if(!sourceAuthority.revalidate(source))throw new Error('Current authenticated owner death source required');
      const control=sourceAuthority.inspectControl(source),decision=readDecision(source.id);
      if(control.kind!=='pc'||control.role!=='owner'||!decision||decision.sourceRef!==source.id||decision.sourceRevision!==source.revision||decision.principal!==source.principal||decision.campaignId!==source.campaign||decision.sceneId!==source.scene||!source.actors.includes(decision.actorId)||source.recipients.length!==1||source.recipients[0]!==source.principal)throw new Error('Exact private observed PC owner death decision required');
      const terms=readTerms(source.campaign,decision.requestRef,decision.purpose);
      if(decision.actorId!==terms.actorId||source.principal!==terms.ownerUserId||decision.termsHash!==hash(terms)||!Number.isSafeInteger(decision.sequence)||decision.sequence<1||decision.purpose==='death_review'&&decision.decision!=='reviewed'||decision.purpose==='death_choice'&&!terms.allowedMoves.includes(decision.decision))throw new Error('Exact displayed native death terms required');
      const evidence={id:decision.interactionId,kind:decision.purpose==='death_review'?'incoming_death_review':'incoming_death_choice',campaignId:terms.campaignId,sceneId:terms.sceneId,actorId:terms.actorId,ownerUserId:terms.ownerUserId,controlRevision:terms.controlRevision,requestRef:terms.requestRef,eligibilityHash:terms.eligibilityHash,resourceRevision:terms.resourceRevision,actorSnapshotHash:terms.actorSnapshotHash,sourceRef:source.id,sourceRevision:source.revision,sequence:decision.sequence,promptRef:decision.promptRef,payloadHash:decision.payloadHash,messageId:decision.messageId};
      if(decision.purpose==='death_choice'){evidence.reviewRef=terms.reviewRef;evidence.move=decision.decision;}
      const snapshot=hash([decision,terms,evidence]);if(expected&&snapshot!==expected)throw new Error('Native death decision changed');expected=snapshot;return {evidence,terms};
    }
    const {terms}=inspect(),options={check:()=>{inspect();},sourceAuthority,readEvidence:()=>inspect().evidence};
    return terms.purpose==='death_review'?actionStore.recordIncomingDeathReview(source.campaign,terms.attackRef,options):actionStore.recordIncomingDeathChoice(source.campaign,terms.attackRef,options);
  }
  return Object.freeze({readTerms,record});
}
