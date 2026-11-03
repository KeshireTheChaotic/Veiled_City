import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Only fixed native Hope cost slots. The supplied plan inspector must validate
 * current printed/house-rule costs; neither model text nor approval invents them.
 */
export function createBlazeCosts({db,tx,readPcLife,rawOutcome,deathEvent,binding}){
  function planFor(c,b,inspectCostPlan){
    if(typeof inspectCostPlan!=='function')throw new Error('Native Blaze cost rules inspector required');
    const plan=structuredClone(inspectCostPlan(c,b.action.id));
    if(!plan||Object.keys(plan).sort().join(',')!=='actionHash,actionRef,actionRevision,costs,id,revision,ruleFingerprint'||!id(plan.id)||!id(plan.revision)||plan.actionRef!==b.action.id||plan.actionRevision!==b.action.revision||plan.actionHash!==hash(b.action)||typeof plan.ruleFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(plan.ruleFingerprint)||!Array.isArray(plan.costs)||!plan.costs.length)throw new Error('Exact inspected native Blaze cost plan required');
    const actions=new Set(),slots=new Set();
    for(const cost of plan.costs){
      if(!cost||Object.keys(cost).sort().join(',')!=='actionRef,amount,resource,slot,sourceRef,sourceRevision'||!id(cost.actionRef)||!id(cost.slot)||cost.resource!=='hope'||!Number.isSafeInteger(cost.amount)||cost.amount<1||cost.sourceRef!==b.action.sourceRef||cost.sourceRevision!==b.action.sourceRevision||actions.has(cost.actionRef)||slots.has(cost.slot))throw new Error('Unique native Hope cost actions and slots required');actions.add(cost.actionRef);slots.add(cost.slot);
    }
    return plan;
  }
  function proofFor(c,a,approved,critical,planned,cost){const b=approved.binding;return {campaignId:c,attackRef:a,requestRef:b.requestRef,actorId:b.actorId,ownerUserId:b.ownerUserId,controlRevision:b.controlRevision,parentActionRef:b.action.id,parentActionHash:hash(b.action),approvalRef:approved.id,approvalHash:hash(approved),criticalRef:critical.id,criticalHash:hash(critical),planRef:planned.id,planHash:hash(planned),costActionRef:cost.actionRef,costSlot:cost.slot,amount:cost.amount,sourceRef:cost.sourceRef,sourceRevision:cost.sourceRevision};}
  function prepare(c,a,options){return tx(options.check,()=>{
    const approved=deathEvent(c,a,'blaze-approval'),critical=deathEvent(c,a,'blaze-critical');if(!approved||!critical||deathEvent(c,a,'blaze-final'))throw new Error('Unconsumed native Blaze approval and Critical required');
    const b=binding(c,a,{...options,actionRef:approved.binding.action.id,approvalRef:approved.binding.gmApproval.id});if(hash(b)!==hash(approved.binding)||critical.approvalHash!==hash(approved))throw new Error('Frozen Blaze cost approval required');
    const plan=planFor(c,b,options.inspectCostPlan),old=deathEvent(c,a,'blaze-cost-plan');
    if(old){if(hash(old.plan)!==hash(plan)||old.approvalHash!==hash(approved)||old.criticalHash!==hash(critical))throw new Error('Immutable Blaze cost plan conflict');return old;}
    if(hash(planFor(c,b,options.inspectCostPlan))!==hash(plan))throw new Error('Native Blaze cost plan changed');
    const row={id:`incoming-death-blaze-cost-plan:${a}`,approvalHash:hash(approved),criticalHash:hash(critical),plan};db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,row.id,JSON.stringify(row));return row;
  });}
  function inspect(c,a,costActionRef,options){
    const approved=deathEvent(c,a,'blaze-approval'),critical=deathEvent(c,a,'blaze-critical'),planned=deathEvent(c,a,'blaze-cost-plan'),initial=rawOutcome(c,a);
    if(!approved||!critical||!planned||deathEvent(c,a,'blaze-final'))throw new Error('Current unconsumed native Blaze cost plan required');
    const b=binding(c,a,{...options,actionRef:approved.binding.action.id,approvalRef:approved.binding.gmApproval.id},true);
    if(hash(b)!==hash(approved.binding)||planned.approvalHash!==hash(approved)||planned.criticalHash!==hash(critical)||hash(planFor(c,b,options.inspectCostPlan))!==hash(planned.plan)||options.readOwnerAction(c,b.action.id)?.status!=='accepted')throw new Error('Current approved final-action cost rules required');
    const cost=planned.plan.costs.find(cost=>cost.actionRef===costActionRef);if(!cost)throw new Error('Cost action is outside the approved Blaze plan');
    const receipts=[];
    for(const slot of planned.plan.costs){const raw=db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`${slot.actionRef}:hope-committed`);if(raw){const receipt=JSON.parse(raw.data),expected=proofFor(c,a,approved,critical,planned,slot);if(receipt.effectsCommitted!==true||receipt.request?.actionId!==slot.actionRef||receipt.cost?.amount!==slot.amount||receipt.cost.costSlot!==slot.slot||!receipt.blazeAuthorization||!receipt.beforeHope||!receipt.afterHope||hash(receipt.blazeAuthorization)!==hash(expected))throw new Error('Exact committed Blaze cost receipt required');receipts.push(receipt);}}
    let hope=initial.after.hope;
    receipts.sort((x,y)=>x.beforeHope.revision-y.beforeHope.revision);
    for(const receipt of receipts){if(hash(receipt.beforeHope)!==hash(hope))throw new Error('Blaze cost resource lineage changed');const expected={...hope,hope:hope.hope-receipt.cost.amount,revision:hope.revision+1};if(expected.hope<0||hash(expected)!==hash(receipt.afterHope))throw new Error('Native Blaze Hope debit mismatch');hope=receipt.afterHope;}
    const expected={...initial.after,hope};if(hash(readPcLife(c,b.actorId))!==hash(expected))throw new Error('Blaze state changed outside approved cost receipts');
    return proofFor(c,a,approved,critical,planned,cost);
  }
  return Object.freeze({prepareIncomingBlazeCosts:prepare,inspectIncomingBlazeCost:inspect});
}
