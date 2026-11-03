import {DatabaseSync} from 'node:sqlite';
import {pcEffectResource} from './pc-resources.js';
import {incomingDamageOutcome} from './incoming-damage.js';
import {createHash} from 'node:crypto';
import {createPcLifeState} from './pc-life-state.js';
import {createPcBootstrap} from './pc-bootstrap.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const graphs={ordinary_roll:{pending:['awaiting_notice','cancelled'],awaiting_notice:['awaiting_player_roll','cancelled'],awaiting_player_roll:['ready_to_resolve','cancelled'],ready_to_resolve:['cancelled']},hope_cost:{pending:['awaiting_consent','cancelled'],awaiting_consent:['ready_to_commit','cancelled'],ready_to_commit:['cancelled']}};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const decode=r=>r?JSON.parse(r.data):null;
/** Native control state only: cannot mark effects resolved or patch actor state. */
export function openActionStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{db.exec('PRAGMA busy_timeout=5000;');
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_actions','vk3_action_events','vk3_action_hope','vk3_cost_terms','vk3_cost_consents','vk3_pc_defenses','vk3_pc_life'].includes(r.name)))throw new Error('Dedicated action database required');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_actions(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id)); CREATE TABLE IF NOT EXISTS vk3_action_events(campaign TEXT,source TEXT,data TEXT,PRIMARY KEY(campaign,source));');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_action_hope(campaign TEXT,actor TEXT,data TEXT,PRIMARY KEY(campaign,actor))');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_cost_terms(campaign TEXT,action TEXT,data TEXT,PRIMARY KEY(campaign,action)); CREATE TABLE IF NOT EXISTS vk3_cost_consents(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id));');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_pc_defenses(campaign TEXT,actor TEXT,data TEXT,PRIMARY KEY(campaign,actor));');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_pc_life(campaign TEXT,actor TEXT,data TEXT,PRIMARY KEY(campaign,actor));');
  }catch(e){db.close();throw e;}
  const read=(c,a)=>decode(db.prepare('SELECT data FROM vk3_actions WHERE campaign=? AND id=?').get(c,a));
  function tx(check,fn){if(typeof check!=='function')throw new Error('Native action authority required');db.exec('BEGIN IMMEDIATE');try{check();const r=fn();check();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  function create(input,{check}){
    if(!input||Object.keys(input).sort().join(',')!=='actorId,campaignId,id,kind,ownerUserId,sceneId,sourceRef,sourceRevision'||!Object.hasOwn(graphs,input.kind)||!Object.values(input).every(id))throw new Error('Closed native action identity required');
    const row={...input,status:'pending',revision:1,effectsCommitted:false};return tx(check,()=>{const old=read(input.campaignId,input.id);if(old){if(!Object.keys(input).every(key=>JSON.stringify(old[key])===JSON.stringify(input[key])))throw new Error('Action identity conflict');return old;}db.prepare('INSERT INTO vk3_actions VALUES(?,?,?)').run(input.campaignId,input.id,JSON.stringify(row));return row;});
  }
  function transition(input,{check}){
    if(!input||Object.keys(input).sort().join(',')!=='actionId,campaignId,expectedRevision,sourceRef,to'||![input.actionId,input.campaignId,input.sourceRef,input.to].every(id)||!Number.isSafeInteger(input.expectedRevision))throw new Error('Closed native action transition required');
    return tx(check,()=>{const prior=decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,input.sourceRef));
      if(prior){if(JSON.stringify(prior.request)!==JSON.stringify(input))throw new Error('Action event replay conflict');return prior;}
      const before=read(input.campaignId,input.actionId);if(!before||before.revision!==input.expectedRevision)throw new Error('Action revision conflict');
      if(!graphs[before.kind][before.status]?.includes(input.to))throw new Error('Unsupported native action transition');
      const after={...before,status:input.to,revision:before.revision+1},receipt={request:input,before,after,effectsCommitted:false};
      db.prepare('UPDATE vk3_actions SET data=? WHERE campaign=? AND id=?').run(JSON.stringify(after),input.campaignId,input.actionId);db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(input.campaignId,input.sourceRef,JSON.stringify(receipt));return receipt;});
  }
  const readHope=(c,a)=>decode(db.prepare('SELECT data FROM vk3_action_hope WHERE campaign=? AND actor=?').get(c,a));
  function initializeHope(input,{check}){
    if(![input.campaignId,input.actorId,input.ownerUserId].every(id)||!Number.isSafeInteger(input.hope)||!Number.isSafeInteger(input.cap)||input.cap<0||input.cap>6||input.hope<0||input.hope>input.cap)throw new Error('Native Hope bootstrap required');
    return tx(check,()=>{const row={...input,revision:1},old=readHope(input.campaignId,input.actorId);if(old){if(JSON.stringify(old)!==JSON.stringify(row))throw new Error('Hope already initialized');return old;}db.prepare('INSERT INTO vk3_action_hope VALUES(?,?,?)').run(input.campaignId,input.actorId,JSON.stringify(row));return row;});
  }
  function commitHopeCost(input,{readCost,check,inspectBlazeCost}){
    if(typeof readCost!=='function'||![input.campaignId,input.actionId,input.costRef].every(id)||![input.expectedActionRevision,input.expectedHopeRevision].every(Number.isSafeInteger))throw new Error('Native action-cost commit required');
    return tx(check,()=>{
      const action=read(input.campaignId,input.actionId),cost=structuredClone(readCost(input.campaignId,input.costRef)),hope=readHope(input.campaignId,action?.actorId);
      if(!action||action.kind!=='hope_cost'||!cost||cost.id!==input.costRef||cost.actionRef!==action.id||cost.campaignId!==input.campaignId||cost.actorId!==action.actorId||cost.ownerUserId!==action.ownerUserId
        ||cost.sourceRef!==action.sourceRef||cost.sourceRevision!==action.sourceRevision||cost.status!=='accepted'||cost.ownerConfirmed!==true||!Number.isSafeInteger(cost.amount)||cost.amount<1||hope?.ownerUserId!==action.ownerUserId)throw new Error('Native owner action cost required');
      const eventKey=`${action.id}:hope-committed`,previous=decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,eventKey));
      if(previous){if(JSON.stringify(previous.request)!==JSON.stringify(input)||JSON.stringify(previous.cost)!==JSON.stringify(cost))throw new Error('Action outcome replay conflict');return previous;}
      const life=decode(db.prepare('SELECT data FROM vk3_pc_life WHERE campaign=? AND actor=?').get(input.campaignId,action.actorId));
      const registeredTerms=readActionTerms(input.campaignId,action.id);
      if(registeredTerms?.blaze!==undefined&&(life?.status!=='active'||life.deathState?.status!=='blaze_pending'))throw new Error('Blaze-linked cost requires its pending native final action');
      let blazeAuthorization=null;
      if(life&&(life.status!=='active'||life.deathState&&life.deathState.status!=='recovered'||readPcDefenses(input.campaignId,action.actorId)?.hp.current>=readPcDefenses(input.campaignId,action.actorId)?.hp.max)){
        if(life.status!=='active'||life.deathState?.status!=='blaze_pending'||typeof inspectBlazeCost!=='function')throw new Error('PC lifecycle requires native recovery before an ordinary Hope action');
        const terms=registeredTerms,proof=structuredClone(inspectBlazeCost(input.campaignId,action.id));
        const plan=proof&&decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,proof.planRef));
        const approval=proof&&decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,proof.approvalRef));
        const critical=proof&&decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,proof.criticalRef));
        const slot=plan?.plan?.costs?.find(slot=>slot.actionRef===action.id);
        if(!proof||proof.campaignId!==input.campaignId||proof.requestRef!==life.deathState.request||proof.actorId!==action.actorId||proof.ownerUserId!==action.ownerUserId||proof.controlRevision!==life.controlRevision||proof.costActionRef!==action.id||proof.costSlot!==cost.costSlot||proof.amount!==cost.amount||proof.sourceRef!==action.sourceRef||proof.sourceRevision!==action.sourceRevision||!terms?.blaze||terms.blaze.attackRef!==proof.attackRef||terms.blaze.approvalRef!==proof.approvalRef||terms.blaze.planRef!==proof.planRef||terms.blaze.parentActionRef!==proof.parentActionRef||!plan||hash(plan)!==proof.planHash||!approval||hash(approval)!==proof.approvalHash||!critical||hash(critical)!==proof.criticalHash||approval.binding.action.id!==proof.parentActionRef||hash(approval.binding.action)!==proof.parentActionHash||!slot||slot.slot!==cost.costSlot||slot.amount!==cost.amount)throw new Error('Exact stored approved Blaze cost authorization required');
        blazeAuthorization=proof;
      }
      if(action.status!=='ready_to_commit'||action.revision!==input.expectedActionRevision||hope.revision!==input.expectedHopeRevision)throw new Error('Action or Hope revision conflict');
      const change=pcEffectResource({resources:{hope:hope.hope,hope_max:hope.cap}},'hope',-cost.amount),afterHope={...hope,hope:change.after,revision:hope.revision+1},afterAction={...action,status:'resolved',revision:action.revision+1,effectsCommitted:true};
      const receipt={request:input,cost,beforeAction:action,afterAction,beforeHope:hope,afterHope,effectsCommitted:true,...(blazeAuthorization?{blazeAuthorization}:{})};
      db.prepare('UPDATE vk3_action_hope SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(afterHope),input.campaignId,action.actorId);db.prepare('UPDATE vk3_actions SET data=? WHERE campaign=? AND id=?').run(JSON.stringify(afterAction),input.campaignId,action.id);db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(input.campaignId,eventKey,JSON.stringify(receipt));
      if(JSON.stringify(readCost(input.campaignId,input.costRef))!==JSON.stringify(cost)||blazeAuthorization&&hash(inspectBlazeCost(input.campaignId,action.id))!==hash(blazeAuthorization))throw new Error('Cost evidence changed');return receipt;
    });
  }
  const readActionTerms=(c,a)=>decode(db.prepare('SELECT data FROM vk3_cost_terms WHERE campaign=? AND action=?').get(c,a));
  const readConsent=(c,id)=>decode(db.prepare('SELECT data FROM vk3_cost_consents WHERE campaign=? AND id=?').get(c,id));
  function registerHopeTerms(input,{check}){return tx(check,()=>{
    const action=read(input.campaignId,input.id);
    if(!action||action.kind!=='hope_cost'||['id','campaignId','actorId','ownerUserId','sceneId','sourceRef','sourceRevision'].some(k=>action[k]!==input[k])
      ||!id(input.revision)||!id(input.controlRevision)||input.cost?.resource!=='hope'||!id(input.cost.slot)||!Number.isSafeInteger(input.cost.amount)||input.cost.amount<1)throw new Error('Native immutable Hope action terms required');
    const old=readActionTerms(input.campaignId,input.id);if(old){if(JSON.stringify(old)!==JSON.stringify(input))throw new Error('Immutable action terms conflict');return old;}
    if(!['pending','awaiting_consent'].includes(action.status))throw new Error('Action terms window closed');
    db.prepare('INSERT INTO vk3_cost_terms VALUES(?,?,?)').run(input.campaignId,input.id,JSON.stringify(input));return input;
  });}
  function recordHopeConsent(input,{check}){return tx(check,()=>{
    const terms=readActionTerms(input.campaignId,input.actionRef),action=read(input.campaignId,input.actionRef),old=readConsent(input.campaignId,input.id);
    if(old){if(JSON.stringify(old)!==JSON.stringify(input))throw new Error('Immutable owner consent conflict');return old;}
    if(!terms||action?.status!=='awaiting_consent'||!id(input.id)||!id(input.revision)||!['accepted','rejected'].includes(input.status)
      ||['campaignId','sceneId','actorId','ownerUserId','sourceRef','sourceRevision'].some(k=>input[k]!==terms[k])||input.actionRevision!==terms.revision||input.amount!==terms.cost.amount||input.costSlot!==terms.cost.slot)throw new Error('Exact native owner action consent required');
    db.prepare('INSERT INTO vk3_cost_consents VALUES(?,?,?)').run(input.campaignId,input.id,JSON.stringify(input));
    const after={...action,status:input.status==='accepted'?'ready_to_commit':'cancelled',revision:action.revision+1};db.prepare('UPDATE vk3_actions SET data=? WHERE campaign=? AND id=?').run(JSON.stringify(after),input.campaignId,input.actionRef);return input;
  });}
  const readPcDefenses=(c,a)=>decode(db.prepare('SELECT data FROM vk3_pc_defenses WHERE campaign=? AND actor=?').get(c,a));
  const damageEvent=(c,a)=>decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`incoming-damage:${a}`));
  function initializePcDefenses(input,{check}){
    if(!input||Object.keys(input).sort().join(',')!=='actorId,armorSlots,campaignId,controlRevision,hp,ownerUserId'||!['campaignId','actorId','ownerUserId','controlRevision'].every(k=>id(input[k])))throw new Error('Closed native PC defense bootstrap required');
    if([input.hp,input.armorSlots].some(r=>!r||Object.keys(r).sort().join(',')!=='current,max'))throw new Error('Closed native marked resource values required');
    incomingDamageOutcome({damage:0,major:1,severe:2,hp:input.hp,armorSlots:input.armorSlots,defenses:{resistance:'none',armorReduction:1,armorAllowed:true},useArmor:false});
    return tx(check,()=>{const row={...structuredClone(input),revision:1},old=readPcDefenses(input.campaignId,input.actorId);if(old){if(JSON.stringify(old)!==JSON.stringify(row))throw new Error('PC defenses already initialized');return old;}
      db.prepare('INSERT INTO vk3_pc_defenses VALUES(?,?,?)').run(input.campaignId,input.actorId,JSON.stringify(row));return row;});
  }
  function commitIncomingDamage(input,{check,readAttack,readArmorChoice}){
    if(!input||Object.keys(input).sort().join(',')!=='attackRef,campaignId,expectedRevision'||![input.campaignId,input.attackRef].every(id)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||typeof readAttack!=='function'||typeof readArmorChoice!=='function')throw new Error('Closed native incoming damage operation required');
    return tx(check,()=>{
      const attack=structuredClone(readAttack(input.campaignId,input.attackRef)),choice=structuredClone(readArmorChoice(input.campaignId,input.attackRef));
      if(attack?.id!==input.attackRef||Object.keys(attack).sort().join(',')!=='actorId,campaignId,controlRevision,damage,defenses,id,major,ownerUserId,resultHash,resultRef,sceneId,severe,sourceRef,sourceRevision,termsHash'||attack.campaignId!==input.campaignId||!['actorId','ownerUserId','controlRevision','sceneId','resultRef','resultHash','termsHash','sourceRef','sourceRevision'].every(k=>id(attack[k]))
        ||choice?.kind!=='incoming_armor_choice'||Object.keys(choice).sort().join(',')!=='actorId,attackRef,campaignId,controlRevision,id,kind,ownerUserId,resultHash,resultRef,sceneId,sourceRef,sourceRevision,termsHash,useArmor'||choice.campaignId!==input.campaignId||choice.attackRef!==input.attackRef||choice.actorId!==attack.actorId||choice.ownerUserId!==attack.ownerUserId||choice.controlRevision!==attack.controlRevision||choice.sceneId!==attack.sceneId||choice.resultRef!==attack.resultRef||choice.resultHash!==attack.resultHash||choice.termsHash!==attack.termsHash||typeof choice.useArmor!=='boolean'||!['id','sourceRef','sourceRevision'].every(k=>id(choice[k])))throw new Error('Exact native hit and affected-owner Armor choice required');
      const prior=damageEvent(input.campaignId,input.attackRef);if(prior){if(prior.kind!=='incoming_damage'||JSON.stringify(prior.request)!==JSON.stringify(input)||JSON.stringify(prior.attack)!==JSON.stringify(attack)||JSON.stringify(prior.ownerChoice)!==JSON.stringify(choice))throw new Error('Incoming damage replay conflict');return prior;}
      const before=readPcDefenses(input.campaignId,attack.actorId);
      if(!before||before.revision!==input.expectedRevision||before.ownerUserId!==attack.ownerUserId||before.controlRevision!==attack.controlRevision)throw new Error('Current native PC defense revision required');
      const outcome=incomingDamageOutcome({damage:attack.damage,major:attack.major,severe:attack.severe,hp:before.hp,armorSlots:before.armorSlots,defenses:attack.defenses,useArmor:choice.useArmor}),after={...before,hp:outcome.hp,armorSlots:outcome.armorSlots,revision:before.revision+1};
      const receipt={kind:'incoming_damage',id:`incoming-damage:${input.attackRef}`,request:input,attack,ownerChoice:choice,before,after,outcome:{...outcome,effectsCommitted:true}};
      if(JSON.stringify(readAttack(input.campaignId,input.attackRef))!==JSON.stringify(attack)||JSON.stringify(readArmorChoice(input.campaignId,input.attackRef))!==JSON.stringify(choice))throw new Error('Incoming damage authority changed');
      db.prepare('UPDATE vk3_pc_defenses SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(after),input.campaignId,attack.actorId);
      db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(input.campaignId,receipt.id,JSON.stringify(receipt));
      if(outcome.deathChoiceRequired){const eligibility={id:`incoming-death:${input.attackRef}`,status:'awaiting_owner',campaignId:input.campaignId,sceneId:attack.sceneId,actorId:attack.actorId,ownerUserId:attack.ownerUserId,controlRevision:attack.controlRevision,causeRef:receipt.id,sourceRef:attack.sourceRef,sourceRevision:attack.sourceRevision};db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(input.campaignId,eligibility.id,JSON.stringify(eligibility));}
      return receipt;
    });
  }
  const deathEvent=(c,a,kind)=>decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`incoming-death-${kind}:${a}`));
  function recordDeathEvidence(c,a,kind,{check,readEvidence,sourceAuthority}){return tx(check,()=>{
    if(typeof readEvidence!=='function'||typeof sourceAuthority?.inspectReference!=='function')throw new Error('Native private death evidence readers required');
    const cause=damageEvent(c,a),eligibility=decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`incoming-death:${a}`)),state=readPcDefenses(c,cause?.attack?.actorId);
    if(eligibility?.status!=='awaiting_owner'||cause?.outcome?.deathChoiceRequired!==true||cause.outcome.effectsCommitted!==true||eligibility.causeRef!==cause.id||!state||state.hp.current!==state.hp.max||JSON.stringify(state)!==JSON.stringify(cause.after))throw new Error('Current native final-HP death cause required');
    const e=structuredClone(readEvidence(c,a));
    if(e?.kind!==`incoming_death_${kind}`||e.campaignId!==c||e.sceneId!==eligibility.sceneId||e.actorId!==eligibility.actorId||e.ownerUserId!==eligibility.ownerUserId||e.controlRevision!==eligibility.controlRevision||e.requestRef!==eligibility.id||e.eligibilityHash!==hash(eligibility)||e.resourceRevision!==state.revision
      ||!['id','sourceRef','sourceRevision'].every(k=>id(e[k]))||typeof e.actorSnapshotHash!=='string'||!/^[a-f0-9]{64}$/.test(e.actorSnapshotHash)||!Number.isSafeInteger(e.sequence)||e.sequence<1)throw new Error('Exact current affected-owner death evidence required');
    const inspect=()=>{const p=sourceAuthority.inspectReference(e.sourceRef,e.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||!Array.isArray(p.recipients)||p.recipients.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Private affected-owner death source required');};inspect();
    if(kind==='choice'){
      const review=deathEvent(c,a,'review');
      if(!review||e.reviewRef!==review.evidence.id||e.sequence<=review.evidence.sequence||e.actorSnapshotHash!==review.evidence.actorSnapshotHash||!['risk_it_all','avoid_death','blaze_of_glory'].includes(e.move))throw new Error('Privately reviewed ordered owner death choice required');
      const p=sourceAuthority.inspectReference(review.evidence.sourceRef,review.evidence.sourceRevision);if(p.campaign!==c||p.scene!==e.sceneId||p.principal!==e.ownerUserId||!p.actors.includes(e.actorId)||p.recipients?.length!==1||p.recipients[0]!==e.ownerUserId)throw new Error('Current private death review source required');
    }
    const old=deathEvent(c,a,kind);if(old){if(JSON.stringify(old.evidence)!==JSON.stringify(e))throw new Error('Immutable owner death evidence conflict');return old;}
    const receipt={id:`incoming-death-${kind}:${a}`,status:kind==='review'?'reviewed':'choice_saved',requestRef:eligibility.id,causeRef:cause.id,evidence:e,effectsCommitted:false};
    if(JSON.stringify(readEvidence(c,a))!==JSON.stringify(e))throw new Error('Owner death evidence changed');inspect();
    db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(c,receipt.id,JSON.stringify(receipt));return receipt;
  });}
  const pcLife=createPcLifeState({db,tx,readPcDefenses,readHope,damageEvent,deathEvent});
  return Object.freeze({...pcLife,...createPcBootstrap({db,tx}),create,transition,read,initializeHope,readHope,commitHopeCost,registerHopeTerms,recordHopeConsent,readActionTerms,readConsent,initializePcDefenses,readPcDefenses,commitIncomingDamage,readIncomingDamage:damageEvent,
    recordIncomingDeathReview:(c,a,options)=>recordDeathEvidence(c,a,'review',options),recordIncomingDeathChoice:(c,a,options)=>recordDeathEvidence(c,a,'choice',options),
    readIncomingDeathReview:(c,a)=>deathEvent(c,a,'review'),readIncomingDeathChoice:(c,a)=>deathEvent(c,a,'choice'),
    readIncomingDeath:(c,a)=>decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`incoming-death:${a}`)),
    readOutcome:(c,a)=>decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`${a}:hope-committed`)),close:()=>db.close()});
}
