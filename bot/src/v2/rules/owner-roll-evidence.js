import {dualityRoll} from './dice.js';
/** Native read-only validation for ordinary, unmodified owner Duality rolls.
 * Requests/results are loaded by reference. No model-provided faces, RNG or
 * successful game effects are accepted by this interface.
 */
export function createOwnerRollEvidence({sourceAuthority,readRequest,readRoll,readDelivery,readActor,termReader=null,readAdjudication=null}){
  if(typeof sourceAuthority?.revalidate!=='function'||[readRequest,readRoll,readDelivery,readActor].some(f=>typeof f!=='function'))throw new TypeError('Native owner roll evidence readers required');
  function inspect(source,{requestRef,rollRef}){
    if(!sourceAuthority.revalidate(source))throw new Error('Current roll source required');
    const request=readRequest(source.campaign,requestRef),roll=readRoll(source.campaign,rollRef);
    const actor=readActor(source.campaign,request?.actorId),delivery=readDelivery(source.campaign,request?.noticeRef);
    const evidence=JSON.stringify([request,roll,actor,delivery]);
    if(!request||request.id!==requestRef||request.campaignId!==source.campaign||request.sceneId!==source.scene||request.status!=='awaiting_player_roll'
      ||request.ownerUserId!==source.principal||!source.actors.includes(request.actorId)||actor?.id!==request.actorId||actor.kind!=='pc'
      ||actor.ownerUserId!==source.principal||actor.controllerUserId!==source.principal||actor.controlRole!=='owner'||actor.status!=='active'
      ||actor.controlRevision!==request.controlRevision||actor.sceneId!==source.scene||actor.campaignId!==source.campaign
      ||!Number.isSafeInteger(request.difficulty)||request.difficulty<0||typeof request.stakes!=='string'||!request.stakes.trim()
      ||!request.termProof&&(request.modifier!==0||request.experience!==0||request.advantage!==0||request.disadvantage!==0))throw new Error('Current ordinary owner roll request required');
    if(!delivery||delivery.status!=='delivered'||delivery.requestRef!==requestRef||delivery.difficulty!==request.difficulty||delivery.stakes!==request.stakes
      ||!Array.isArray(delivery.recipientIds)||!source.recipients.every(id=>delivery.recipientIds.includes(id))||!Number.isSafeInteger(delivery.sequence)
      ||!roll||roll.id!==rollRef||roll.campaignId!==source.campaign||roll.sceneId!==source.scene||roll.requestRef!==requestRef
      ||roll.actorId!==request.actorId||roll.ownerUserId!==source.principal||roll.authenticated!==true||roll.origin!=='owner_roll'
      ||!Number.isSafeInteger(roll.sequence)||roll.sequence<=delivery.sequence)throw new Error('Delivered stakes before authenticated owner dice required');
    let values={};
    if(request.termProof){
      if(typeof termReader?.inspect!=='function'||typeof readAdjudication!=='function')throw new Error('Current native roll term authority required');
      values=termReader.inspect(source,readAdjudication(source.campaign,request.adjudicationRef));
      if(JSON.stringify(values.termProof)!==JSON.stringify(request.termProof)||['modifier','experience','advantage','disadvantage'].some(k=>values[k]!==request[k])||roll.termHash!==request.termProof.hash||delivery.termHash!==request.termProof.hash||JSON.stringify(delivery.odds)!==JSON.stringify({modifier:request.modifier,experience:request.experience,advantage:request.advantage,disadvantage:request.disadvantage}))throw new Error('Native roll terms changed');
    }
    if(!Array.isArray(roll.advDice??[])||(roll.advDice??[]).length!==(request.advantage===request.disadvantage?0:1))throw new Error('Exact native contextual dice required');
    const faces=[roll.hope,roll.fear,...(roll.advDice??[])];let index=0;const result=dualityRoll(values,()=>faces[index++]);
    if(!sourceAuthority.revalidate(source))throw new Error('Roll source changed');
    if(JSON.stringify([readRequest(source.campaign,requestRef),readRoll(source.campaign,rollRef),readActor(source.campaign,request.actorId),readDelivery(source.campaign,request.noticeRef)])!==evidence)throw new Error('Native roll evidence changed');
    if(request.termProof&&JSON.stringify(termReader.inspect(source,readAdjudication(source.campaign,request.adjudicationRef)))!==JSON.stringify(values))throw new Error('Native roll term evidence changed');
    return Object.freeze({...result,id:roll.id,requestRef,difficulty:request.difficulty,success:result.duality==='Critical'||result.total>=request.difficulty,effectsCommitted:false});
  }
  return Object.freeze({inspect});
}
