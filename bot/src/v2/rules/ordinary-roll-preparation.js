import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Generic dispatcher preparation only. Native adjudication supplies all terms;
 * the model supplies a reference, never faces, Difficulty or modifier patches.
 */
export function createOrdinaryRollPreparation({sourceAuthority,readAdjudication,readActor,rollStore}){
  if(typeof sourceAuthority?.revalidate!=='function'||typeof readAdjudication!=='function'||typeof readActor!=='function'||typeof rollStore?.createRequest!=='function')throw new TypeError('Native roll preparation dependencies required');
  function terms(source,actorId,parameters){
    if(!parameters||Object.keys(parameters).join(',')!=='adjudication_ref'||typeof parameters.adjudication_ref!=='string'||!sourceAuthority.revalidate(source))throw new Error('Native adjudication reference required');
    const a=readAdjudication(source.campaign,parameters.adjudication_ref),pc=readActor(source.campaign,actorId);
    if(!a||a.id!==parameters.adjudication_ref||a.status!=='accepted'||a.sourceRef!==source.id||a.sourceRevision!==source.revision||a.actorId!==actorId
      ||a.campaignId!==source.campaign||a.sceneId!==source.scene||typeof a.revision!=='string'||!a.revision
      ||!source.actors.includes(actorId)||pc?.kind!=='pc'||pc.id!==actorId||pc.campaignId!==source.campaign||pc.sceneId!==source.scene
      ||pc.status!=='active'||pc.ownerUserId!==source.principal||pc.controllerUserId!==source.principal||pc.controlRole!=='owner'||typeof pc.controlRevision!=='string'
      ||!Number.isSafeInteger(a.difficulty)||a.difficulty<0||typeof a.stakes!=='string'||!a.stakes.trim()
      ||['modifier','experience','advantage','disadvantage'].some(k=>a[k]!==0))throw new Error('Current native ordinary roll adjudication required');
    const id=`roll-request:${hash([source.id,source.revision,a.id,a.revision,actorId])}`;
    return {id,campaignId:source.campaign,sceneId:source.scene,actorId,ownerUserId:source.principal,controlRevision:pc.controlRevision,noticeRef:`${id}:notice`,
      stakes:a.stakes,difficulty:a.difficulty,modifier:0,experience:0,advantage:0,disadvantage:0,sourceRef:source.id,sourceRevision:source.revision,adjudicationRef:a.id,adjudicationRevision:a.revision};
  }
  const definition=Object.freeze({kind:'ordinary_roll.prepare',version:'1',validate({source,proposal}){try{terms(source,proposal.actorRef,proposal.parameters);return true;}catch{return false;}},prepare:()=>({status:'pending'})});
  function commitRequest(source,actorId,parameters){
    const request=terms(source,actorId,parameters),fingerprint=hash(request);
    return rollStore.createRequest(request,{check(){if(hash(terms(source,actorId,parameters))!==fingerprint)throw new Error('Roll adjudication changed');}});
  }
  return Object.freeze({definition,commitRequest});
}
