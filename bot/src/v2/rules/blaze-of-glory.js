import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Native human review and no-dice Critical only. No effect/consent grant and
 * no final death without a separately verified terminal action.
 */
export function createBlazeOfGlory({db,tx,readPcLife,rawOutcome,deathEvent,damageEvent}){
  function binding(c,a,{sourceAuthority,readActorSnapshot,readOwnerAction,inspectGmApproval,actionRef,approvalRef}){
    if(typeof sourceAuthority?.inspectReference!=='function'||[readActorSnapshot,readOwnerAction,inspectGmApproval].some(f=>typeof f!=='function')||!id(actionRef)||!id(approvalRef))throw new Error('Native owner action and authenticated GM review readers required');
    const initial=rawOutcome(c,a),choice=deathEvent(c,a,'choice'),review=deathEvent(c,a,'review'),cause=damageEvent(c,a),e=choice?.evidence;
    if(initial?.move!=='blaze_of_glory'||initial.result!=='blaze_pending'||initial.status!=='awaiting_final_action'||initial.choiceHash!==hash(choice)||!e||!review)throw new Error('Saved owner Blaze choice awaiting final action required');
    if(!initial.actorAfter)throw new Error('Saved native Blaze frame requires reviewed migration');
    const actor=readActorSnapshot(c,e.actorId),state=readPcLife(c,e.actorId);
    if(actor?.actorId!==e.actorId||actor.ownerUserId!==e.ownerUserId||actor.controlRevision!==e.controlRevision||hash(actor)!==hash(initial.actorAfter)||hash(state)!==hash(initial.after))throw new Error('Current native Blaze actor snapshot required');
    const original=sourceAuthority.inspectReference(cause.attack.sourceRef,cause.attack.sourceRevision);if(original.campaign!==c||original.scene!==e.sceneId||original.principal!==e.ownerUserId||!original.actors.includes(e.actorId))throw new Error('Current native Blaze cause ancestry required');
    for(const source of [review.evidence,e]){const p=sourceAuthority.inspectReference(source.sourceRef,source.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||p.recipients?.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Private owner Blaze selection source required');}
    const raw=structuredClone(readOwnerAction(c,actionRef));
    if(!raw||Object.keys(raw).sort().join(',')!=='actorId,campaignId,controlRevision,id,kind,ownerUserId,parametersHash,revision,sceneId,sourceRef,sourceRevision,status'||!Object.values(raw).every(id)||raw.id!==actionRef||raw.campaignId!==c||raw.sceneId!==e.sceneId||raw.actorId!==e.actorId||raw.ownerUserId!==e.ownerUserId||raw.controlRevision!==e.controlRevision||raw.status!=='accepted'||!['ordinary_action','pvp_attack'].includes(raw.kind)||!/^[a-f0-9]{64}$/.test(raw.parametersHash))throw new Error('Exact independently owner-authored native final action required');
    const p=sourceAuthority.inspectReference(raw.sourceRef,raw.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId))throw new Error('Final action must retain its actual owner source');
    const approval=structuredClone(inspectGmApproval(c,approvalRef));
    if(approval?.id!==approvalRef||approval.kind!=='human_gm_blaze_approval'||approval.status!=='approved'||approval.campaignId!==c||approval.sceneId!==e.sceneId||approval.requestRef!==initial.requestRef||approval.actionRef!==actionRef||approval.actionRevision!==raw.revision||approval.actionHash!==hash(raw)||approval.outcomeHash!==hash(initial)||!['revision','reviewerUserId','rulingRef','rulingRevision','sourceRef','sourceRevision'].every(k=>id(approval[k])))throw new Error('Authenticated human GM approval of the exact final action required');
    return {campaignId:c,sceneId:e.sceneId,requestRef:initial.requestRef,actorId:e.actorId,ownerUserId:e.ownerUserId,controlRevision:e.controlRevision,outcomeHash:hash(initial),actorSnapshotHash:hash(actor),stateHash:hash(state),action:raw,gmApproval:approval};
  }
  function approve(c,a,options){return tx(options.check,()=>{
    const b=binding(c,a,options),prior=deathEvent(c,a,'blaze-approval');
    if(prior){if(prior.id!==`incoming-death-blaze-approval:${a}`||prior.status!=='approved'||!prior.binding||hash(prior.binding)!==hash(b))throw new Error('One immutable Blaze final action only');return prior;}
    if(hash(binding(c,a,options))!==hash(b))throw new Error('Blaze approval authority changed');
    const row={id:`incoming-death-blaze-approval:${a}`,status:'approved',binding:b,effectsCommitted:false};db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,row.id,JSON.stringify(row));return row;
  });}
  function critical(c,a,options){return tx(options.check,()=>{
    const approved=deathEvent(c,a,'blaze-approval');if(!approved)throw new Error('Saved native Blaze approval required');
    const b=binding(c,a,{...options,actionRef:approved.binding.action.id,approvalRef:approved.binding.gmApproval.id});if(hash(b)!==hash(approved.binding))throw new Error('Frozen Blaze approval changed');
    const row={id:`incoming-death-blaze-critical:${a}`,family:'blaze_auto_critical',rule:'srd_blaze_of_glory',duality:'Critical',total:null,campaignId:c,sceneId:b.sceneId,actorId:b.actorId,ownerUserId:b.ownerUserId,actionRef:b.action.id,actionRevision:b.action.revision,actionHash:hash(b.action),approvalRef:approved.id,approvalHash:hash(approved),effectsCommitted:false};
    const prior=deathEvent(c,a,'blaze-critical');if(prior){if(hash(prior)!==hash(row))throw new Error('Exact saved native Blaze Critical required');return prior;}
    if(hash(binding(c,a,{...options,actionRef:b.action.id,approvalRef:b.gmApproval.id}))!==hash(b))throw new Error('Blaze Critical authority changed');
    db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,row.id,JSON.stringify(row));return row;
  });}
  return Object.freeze({approveIncomingBlaze:approve,createIncomingBlazeCritical:critical,readIncomingBlazeApproval:(c,a)=>deathEvent(c,a,'blaze-approval'),readIncomingBlazeCritical:(c,a)=>deathEvent(c,a,'blaze-critical')});
}
