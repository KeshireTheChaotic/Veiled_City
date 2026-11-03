import {dualityRoll} from './dice.js';
import {riskItAllOutcome,avoidDeathOutcome} from './pc-death-outcomes.js';
/** Native read-only death evidence. No model-selected move or character fate writes. */
export function createDeathChoiceEvidence({sourceAuthority,readActor,readEligibility,readCause,readChoice,readRoll}){
  if(typeof sourceAuthority?.revalidate!=='function'||[readActor,readEligibility,readCause,readChoice,readRoll].some(f=>typeof f!=='function'))throw new TypeError('Native death evidence readers required');
  function inspect(source,{actorId,eligibilityRef,choiceRef,rollRef}){
    const pc=readActor(source.campaign,actorId),eligible=readEligibility(source.campaign,eligibilityRef),choice=readChoice(source.campaign,choiceRef),roll=readRoll(source.campaign,rollRef),cause=readCause(source.campaign,eligible?.causeRef);
    const snapshot=JSON.stringify([pc,eligible,choice,roll,cause]);
    const ordered=[cause?.sequence,eligible?.sequence,choice?.sequence,roll?.sequence];
    if(!ordered.every(n=>Number.isSafeInteger(n)&&n>=0)||!ordered.every((n,i)=>i===0||n>ordered[i-1]))throw new Error('Ordered native consequence, eligibility, owner choice and dice required');
    if(!sourceAuthority.revalidate(source)||!source.actors.includes(actorId)||pc?.id!==actorId||pc.kind!=='pc'||pc.status!=='active'||pc.campaignId!==source.campaign||pc.sceneId!==source.scene
      ||pc.ownerUserId!==source.principal||pc.controllerUserId!==source.principal||pc.controlRole!=='owner'||typeof pc.controlRevision!=='string'||!pc.controlRevision
      ||eligible?.id!==eligibilityRef||eligible.status!=='eligible'||eligible.actorId!==actorId||eligible.campaignId!==source.campaign||eligible.sceneId!==source.scene||eligible.controlRevision!==pc.controlRevision
      ||cause?.id!==eligible.causeRef||cause.campaignId!==source.campaign||cause.sceneId!==source.scene||cause.affectedActorId!==actorId||cause.effects_committed!==true||cause.deathEligible!==true
      ||choice?.id!==choiceRef||choice.status!=='accepted'||choice.ownerUserId!==source.principal||choice.actorId!==actorId||choice.eligibilityRef!==eligibilityRef
      ||choice.campaignId!==source.campaign||choice.sceneId!==source.scene||choice.sourceRef!==source.id||choice.sourceRevision!==source.revision||!['risk_it_all','avoid_death'].includes(choice.move)
      ||roll?.id!==rollRef||roll.choiceRef!==choiceRef||roll.sceneId!==source.scene||roll.move!==choice.move||roll.ownerUserId!==source.principal||roll.actorId!==actorId||roll.campaignId!==source.campaign||roll.authenticated!==true||roll.origin!=='owner_roll')throw new Error('Eligible native consequence and explicit owner death choice required');
    let outcome;
    if(choice.move==='risk_it_all'){let n=0;const faces=[roll.hope,roll.fear],result=dualityRoll({},()=>faces[n++]);outcome={result:riskItAllOutcome(result.duality),duality:result.duality};}
    else{
      if(!Number.isInteger(roll.hope)||roll.hope<1||roll.hope>12||!Number.isInteger(pc.data?.level)||pc.data.level<1||pc.data.level>10)throw new Error('Actual death die and native level required');
      outcome=avoidDeathOutcome(pc.data,roll.hope,pc.data.level);
    }
    if(!sourceAuthority.revalidate(source)||JSON.stringify([readActor(source.campaign,actorId),readEligibility(source.campaign,eligibilityRef),readChoice(source.campaign,choiceRef),readRoll(source.campaign,rollRef),readCause(source.campaign,eligible.causeRef)])!==snapshot)throw new Error('Death evidence changed');
    return Object.freeze({...outcome,actorId,eligibilityRef,choiceRef,rollRef,effectsCommitted:false});
  }
  return Object.freeze({inspect});
}
