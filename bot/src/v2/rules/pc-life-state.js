import {createHash} from 'node:crypto';
import {d,dualityRoll} from './dice.js';
import {riskItAllOutcome,avoidDeathOutcome} from './pc-death-outcomes.js';
import {assertDeathEligibility} from './pc-death-eligibility.js';
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
  const outcome=(c,a)=>deathEvent(c,a,'outcome');
  function resolve(c,a,{check,sourceAuthority,readActorSnapshot,rng=d}){return tx(check,()=>{
    const choice=deathEvent(c,a,'choice'),review=deathEvent(c,a,'review'),cause=damageEvent(c,a),e=choice?.evidence;
    if(!choice||!review||choice.status!=='choice_saved'||choice.causeRef!==cause?.id||e.reviewRef!==review.evidence.id||typeof sourceAuthority?.inspectReference!=='function'||typeof readActorSnapshot!=='function'||typeof rng!=='function')throw new Error('Saved privately reviewed native owner death choice required');
    const inspect=()=>{
      const original=sourceAuthority.inspectReference(cause.attack.sourceRef,cause.attack.sourceRevision);
      if(original.campaign!==c||original.scene!==e.sceneId||original.principal!==e.ownerUserId||!original.actors.includes(e.actorId))throw new Error('Current native final-HP cause ancestry required');
      for(const evidence of [review.evidence,e]){const p=sourceAuthority.inspectReference(evidence.sourceRef,evidence.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||p.recipients?.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Current private owner death source required');}
    };inspect();
    const actor=structuredClone(readActorSnapshot(c,e.actorId));
    if(actor?.actorId!==e.actorId||actor.ownerUserId!==e.ownerUserId||actor.controlRevision!==e.controlRevision)throw new Error('Current affected-owner death actor required');
    const prior=outcome(c,a);if(prior){if(prior.choiceRef!==choice.id||prior.choiceHash!==hash(choice))throw new Error('Immutable death outcome choice conflict');return prior;}
    const before=read(c,e.actorId),r=actor.data?.resources;
    if(!before||before.life.ownerUserId!==e.ownerUserId||before.life.controlRevision!==e.controlRevision||before.defenses.ownerUserId!==e.ownerUserId||before.hope.ownerUserId!==e.ownerUserId||before.defenses.controlRevision!==e.controlRevision||JSON.stringify(before.defenses)!==JSON.stringify(cause.after)||cause.outcome?.deathChoiceRequired!==true||actor.status!==before.life.status||actor.data?.level!==before.life.level||hash(actor)!==e.actorSnapshotHash
      ||JSON.stringify(r?.hp)!==JSON.stringify(before.defenses.hp)||JSON.stringify(r?.armor)!==JSON.stringify(before.defenses.armorSlots)||JSON.stringify(r?.stress)!==JSON.stringify(before.life.stress)||r?.hope!==before.hope.hope||r?.hope_max!==before.hope.cap)throw new Error('Current canonical native death snapshot required');
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
    const receipt={id:`incoming-death-outcome:${a}`,requestRef:choice.requestRef,causeRef:cause.id,choiceRef:choice.id,choiceHash:hash(choice),move:e.move,status,result,scar,roll,before,after:{life,defenses,hope},effectsCommitted:true};
    db.prepare('UPDATE vk3_pc_life SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(life),c,e.actorId);
    if(defenses!==before.defenses)db.prepare('UPDATE vk3_pc_defenses SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(defenses),c,e.actorId);
    if(hope!==before.hope)db.prepare('UPDATE vk3_action_hope SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(hope),c,e.actorId);
    db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,receipt.id,JSON.stringify(receipt));return receipt;
  });}
  return Object.freeze({initializePcLife:initialize,readPcLife:read,resolveIncomingDeath:resolve,readIncomingDeathOutcome:outcome});
}
