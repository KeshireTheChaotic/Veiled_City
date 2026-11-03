import {createHash} from 'node:crypto';
import {d,dualityRoll} from './dice.js';
import {riskItAllOutcome,avoidDeathOutcome} from './pc-death-outcomes.js';
import {assertDeathEligibility} from './pc-death-eligibility.js';
import {createBlazeOfGlory} from './blaze-of-glory.js';
import {inspectOwnerReceiptSource} from './owner-receipt-source.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),decode=r=>r?JSON.parse(r.data):null;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Fixed native lifecycle operations sharing the action-store transaction.
 * HP/Armor and Hope stay in their existing authoritative tables, never copied.
 */
export function createPcLifeState({db,tx,readPcDefenses,readHope,damageEvent,deathEvent}){
  const profile=(c,a)=>decode(db.prepare('SELECT data FROM vk3_pc_life WHERE campaign=? AND actor=?').get(c,a));
  function read(c,a){const life=profile(c,a),defenses=readPcDefenses(c,a),hope=readHope(c,a);return life&&defenses&&hope?{life,defenses,hope}:null;}
  function initialize(input,{check}){
    if(!input||Object.keys(input).sort().join(',')!=='actorId,campaignId,controlRevision,level,ownerUserId,sourceRef,sourceRevision,stress'||!['campaignId','actorId','ownerUserId','controlRevision','sourceRef','sourceRevision'].every(k=>id(input[k]))||!Number.isSafeInteger(input.level)||input.level<1||input.level>10||!input.stress||Object.keys(input.stress).sort().join(',')!=='current,max'||![input.stress.current,input.stress.max].every(Number.isSafeInteger)||input.stress.max<1||input.stress.current<0||input.stress.current>input.stress.max)throw new Error('Closed native PC lifecycle bootstrap required');
    return tx(check,()=>{
      const defenses=readPcDefenses(input.campaignId,input.actorId),hope=readHope(input.campaignId,input.actorId);
      if(defenses?.ownerUserId!==input.ownerUserId||defenses.controlRevision!==input.controlRevision||hope?.ownerUserId!==input.ownerUserId)throw new Error('Existing native PC defense and Hope ownership required');
      const row={...structuredClone(input),status:'active',deathState:null,revision:1},old=profile(input.campaignId,input.actorId);
      if(old){if(JSON.stringify(old)!==JSON.stringify(row))throw new Error('PC lifecycle already initialized');return old;}
      db.prepare('INSERT INTO vk3_pc_life VALUES(?,?,?)').run(input.campaignId,input.actorId,JSON.stringify(row));return row;
    });
  }
  const rawOutcome=(c,a)=>deathEvent(c,a,'outcome');
  function outcome(c,a){
    const initial=rawOutcome(c,a),allocation=deathEvent(c,a,'allocation'),blazeFinal=deathEvent(c,a,'blaze-final');
    if(allocation&&(!initial||allocation.id!==`incoming-death-allocation:${a}`||allocation.outcomeHash!==hash(initial)||allocation.effectsCommitted!==true||!allocation.evidence||!allocation.after||!allocation.actorAfter))throw new Error('Exact saved native recovery receipt required');
    if(blazeFinal){if(!initial||initial.move!=='blaze_of_glory'||blazeFinal.id!==`incoming-death-blaze-final:${a}`||blazeFinal.outcomeHash!==hash(initial)||blazeFinal.effectsCommitted!==true||!blazeFinal.after||!blazeFinal.actorAfter)throw new Error('Exact saved native Blaze completion required');return {...initial,status:'resolved',after:blazeFinal.after,actorAfter:blazeFinal.actorAfter,blazeFinal};}
    return initial&&allocation?{...initial,status:'resolved',after:allocation.after,actorAfter:allocation.actorAfter,allocation}:initial;
  }
  const actorAfter=(actor,state)=>({...actor,status:state.life.status,data:{...actor.data,death_state:state.life.deathState,resources:{...actor.data.resources,hp:state.defenses.hp,armor:state.defenses.armorSlots,stress:state.life.stress,hope:state.hope.hope,hope_max:state.hope.cap}}});
  function resolve(c,a,{check,sourceAuthority,readActorSnapshot,rng=d}){return tx(check,()=>{
    const choice=deathEvent(c,a,'choice'),review=deathEvent(c,a,'review'),cause=damageEvent(c,a),e=choice?.evidence;
    if(!choice||!review||choice.status!=='choice_saved'||choice.causeRef!==cause?.id||e.reviewRef!==review.evidence.id||typeof sourceAuthority?.inspectReference!=='function'||typeof readActorSnapshot!=='function'||typeof rng!=='function')throw new Error('Saved privately reviewed native owner death choice required');
    const prior=outcome(c,a);
    const inspect=()=>{
      if(prior){const scope={campaignId:c,sceneId:e.sceneId,actorId:e.actorId,ownerUserId:e.ownerUserId};inspectOwnerReceiptSource(sourceAuthority,cause.attack,scope);for(const source of [review.evidence,e])inspectOwnerReceiptSource(sourceAuthority,source,scope,{privateAudience:true});return;}
      const original=sourceAuthority.inspectReference(cause.attack.sourceRef,cause.attack.sourceRevision);
      if(original.campaign!==c||original.scene!==e.sceneId||original.principal!==e.ownerUserId||!original.actors.includes(e.actorId))throw new Error('Current native final-HP cause ancestry required');
      for(const evidence of [review.evidence,e]){const p=sourceAuthority.inspectReference(evidence.sourceRef,evidence.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||p.recipients?.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Current private owner death source required');}
    };inspect();
    const actor=structuredClone(readActorSnapshot(c,e.actorId));
    if(actor?.actorId!==e.actorId||actor.ownerUserId!==e.ownerUserId||actor.controlRevision!==e.controlRevision)throw new Error('Current affected-owner death actor required');
    if(prior){if(prior.choiceRef!==choice.id||prior.choiceHash!==hash(choice))throw new Error('Immutable death outcome choice conflict');return prior;}
    const before=read(c,e.actorId),r=actor.data?.resources;
    if(!before||before.life.status!=='active'||before.life.ownerUserId!==e.ownerUserId||before.life.controlRevision!==e.controlRevision||before.defenses.ownerUserId!==e.ownerUserId||before.hope.ownerUserId!==e.ownerUserId||before.defenses.controlRevision!==e.controlRevision||JSON.stringify(before.defenses)!==JSON.stringify(cause.after)||cause.outcome?.deathChoiceRequired!==true||actor.status!==before.life.status||actor.data?.level!==before.life.level||hash(actor)!==e.actorSnapshotHash
      ||JSON.stringify(actor.data?.death_state)!==JSON.stringify(before.life.deathState)||JSON.stringify(r?.hp)!==JSON.stringify(before.defenses.hp)||JSON.stringify(r?.armor)!==JSON.stringify(before.defenses.armorSlots)||JSON.stringify(r?.stress)!==JSON.stringify(before.life.stress)||r?.hope!==before.hope.hope||r?.hope_max!==before.hope.cap)throw new Error('Current canonical native death snapshot required');
    assertDeathEligibility(actor,e.move);
    let roll=null,result,status='resolved',scar=false,avoid=null;
    if(e.move==='risk_it_all'){roll=dualityRoll({},rng);result=riskItAllOutcome(roll.duality);if(result==='allocate_recovery')status='awaiting_allocation';}
    else if(e.move==='avoid_death'){const hope=rng(12);if(!Number.isSafeInteger(hope)||hope<1||hope>12)throw new Error('Native death Hope die out of range');roll={hope};avoid=avoidDeathOutcome(actor.data,hope,before.life.level);result=avoid.result;scar=avoid.scar;}
    else if(e.move==='blaze_of_glory'){result='blaze_pending';status='awaiting_final_action';}
    else throw new Error('Supported explicit owner death move required');
    if(hash(readActorSnapshot(c,e.actorId))!==hash(actor))throw new Error('Native death snapshot changed');inspect();
    const life={...before.life,status:['dead','journey_ended'].includes(result)?'dead':before.life.status,deathState:{request:choice.requestRef,status:result},stress:result==='recovered'?{...before.life.stress,current:0}:before.life.stress,revision:before.life.revision+1};
    const defenses=result==='recovered'?{...before.defenses,hp:{...before.defenses.hp,current:0},revision:before.defenses.revision+1}:before.defenses;
    const hope=avoid?{...before.hope,cap:avoid.hope_max,hope:Math.min(before.hope.hope,avoid.hope_max),revision:before.hope.revision+1}:before.hope;
    const after={life,defenses,hope},receipt={id:`incoming-death-outcome:${a}`,requestRef:choice.requestRef,causeRef:cause.id,choiceRef:choice.id,choiceHash:hash(choice),move:e.move,status,result,scar,roll,before,after,actorBefore:actor,actorAfter:actorAfter(actor,after),effectsCommitted:true};
    db.prepare('UPDATE vk3_pc_life SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(life),c,e.actorId);
    if(defenses!==before.defenses)db.prepare('UPDATE vk3_pc_defenses SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(defenses),c,e.actorId);
    if(hope!==before.hope)db.prepare('UPDATE vk3_action_hope SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(hope),c,e.actorId);
    db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,receipt.id,JSON.stringify(receipt));return receipt;
  });}
  function allocate(c,a,{check,sourceAuthority,readActorSnapshot,readEvidence}){return tx(check,()=>{
    const initial=rawOutcome(c,a),choice=deathEvent(c,a,'choice'),review=deathEvent(c,a,'review'),cause=damageEvent(c,a);
    if(initial?.move!=='risk_it_all'||initial.result!=='allocate_recovery'||initial.status!=='awaiting_allocation'||!choice||initial.choiceHash!==hash(choice)||typeof sourceAuthority?.inspectReference!=='function'||typeof readActorSnapshot!=='function'||typeof readEvidence!=='function')throw new Error('Saved native Hope recovery outcome required');
    if(!initial.actorAfter)throw new Error('Saved native recovery frame requires reviewed migration');
    const e=structuredClone(readEvidence(c,a)),owner=choice.evidence;
    if(!e||Object.keys(e).sort().join(',')!=='actorId,campaignId,controlRevision,hp,id,kind,outcomeHash,ownerUserId,requestRef,sceneId,sequence,sourceRef,sourceRevision,stress'||e.kind!=='incoming_death_allocation'||e.campaignId!==c||e.sceneId!==owner.sceneId||e.actorId!==owner.actorId||e.ownerUserId!==owner.ownerUserId||e.controlRevision!==owner.controlRevision||e.requestRef!==initial.requestRef||e.outcomeHash!==hash(initial)||!['id','sourceRef','sourceRevision'].every(k=>id(e[k]))||!Number.isSafeInteger(e.sequence)||e.sequence<=owner.sequence)throw new Error('Exact native affected-owner recovery allocation required');
    const inspect=()=>{
      const p=sourceAuthority.inspectReference(cause.attack.sourceRef,cause.attack.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId))throw new Error('Current recovery cause ancestry required');
      for(const source of [review?.evidence,owner,e]){if(!source)throw new Error('Saved private death review required');const p=sourceAuthority.inspectReference(source.sourceRef,source.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||p.recipients?.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Current private owner recovery source required');}
    };inspect();
    const actor=structuredClone(readActorSnapshot(c,e.actorId));if(actor?.actorId!==e.actorId||actor.ownerUserId!==e.ownerUserId||actor.controlRevision!==e.controlRevision)throw new Error('Current recovery owner required');
    const prior=deathEvent(c,a,'allocation');if(prior){if(JSON.stringify(prior.evidence)!==JSON.stringify(e))throw new Error('Immutable recovery allocation replay conflict');return outcome(c,a);}
    const before=read(c,e.actorId),hp=initial.after.defenses.hp.current,stress=initial.after.life.stress.current,budget=Math.min(initial.roll.hope,hp+stress);
    if(![e.hp,e.stress].every(n=>Number.isSafeInteger(n)&&n>=0)||e.hp>hp||e.stress>stress||e.hp+e.stress!==budget)throw new Error('Exact owner allocation of native Hope across marked HP and Stress required');
    if(hash(before)!==hash(initial.after)||hash(actor)!==hash(initial.actorAfter))throw new Error('Recovery compare-and-set is stale; native review required');
    const life={...before.life,stress:{...before.life.stress,current:stress-e.stress},deathState:{...before.life.deathState,status:'recovered'},revision:before.life.revision+1},defenses={...before.defenses,hp:{...before.defenses.hp,current:hp-e.hp},revision:before.defenses.revision+1},after={life,defenses,hope:before.hope};
    const receipt={id:`incoming-death-allocation:${a}`,outcomeHash:hash(initial),evidence:e,budget,before,after,actorAfter:actorAfter(actor,after),effectsCommitted:true};
    if(hash(readActorSnapshot(c,e.actorId))!==hash(actor)||JSON.stringify(readEvidence(c,a))!==JSON.stringify(e))throw new Error('Owner recovery evidence changed');inspect();
    db.prepare('UPDATE vk3_pc_life SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(life),c,e.actorId);db.prepare('UPDATE vk3_pc_defenses SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(defenses),c,e.actorId);db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,receipt.id,JSON.stringify(receipt));return outcome(c,a);
  });}
  const blaze=createBlazeOfGlory({db,tx,readPcLife:read,rawOutcome,deathEvent,damageEvent});
  return Object.freeze({...blaze,initializePcLife:initialize,readPcLife:read,resolveIncomingDeath:resolve,readIncomingDeathOutcome:outcome,allocateIncomingDeathRecovery:allocate});
}
