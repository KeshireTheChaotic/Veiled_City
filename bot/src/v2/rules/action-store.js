import {DatabaseSync} from 'node:sqlite';
import {pcEffectResource} from './pc-resources.js';
const graphs={ordinary_roll:{pending:['awaiting_notice','cancelled'],awaiting_notice:['awaiting_player_roll','cancelled'],awaiting_player_roll:['ready_to_resolve','cancelled'],ready_to_resolve:['cancelled']},hope_cost:{pending:['awaiting_consent','cancelled'],awaiting_consent:['ready_to_commit','cancelled'],ready_to_commit:['cancelled']}};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const decode=r=>r?JSON.parse(r.data):null;
/** Native control state only: cannot mark effects resolved or patch actor state. */
export function openActionStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_actions','vk3_action_events','vk3_action_hope','vk3_cost_terms','vk3_cost_consents'].includes(r.name)))throw new Error('Dedicated action database required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_actions(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id)); CREATE TABLE IF NOT EXISTS vk3_action_events(campaign TEXT,source TEXT,data TEXT,PRIMARY KEY(campaign,source));');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_action_hope(campaign TEXT,actor TEXT,data TEXT,PRIMARY KEY(campaign,actor))');
    db.exec('CREATE TABLE IF NOT EXISTS vk3_cost_terms(campaign TEXT,action TEXT,data TEXT,PRIMARY KEY(campaign,action)); CREATE TABLE IF NOT EXISTS vk3_cost_consents(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id));');
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
  function commitHopeCost(input,{readCost,check}){
    if(typeof readCost!=='function'||![input.campaignId,input.actionId,input.costRef].every(id)||![input.expectedActionRevision,input.expectedHopeRevision].every(Number.isSafeInteger))throw new Error('Native action-cost commit required');
    return tx(check,()=>{
      const action=read(input.campaignId,input.actionId),cost=structuredClone(readCost(input.campaignId,input.costRef)),hope=readHope(input.campaignId,action?.actorId);
      if(!action||action.kind!=='hope_cost'||!cost||cost.id!==input.costRef||cost.actionRef!==action.id||cost.campaignId!==input.campaignId||cost.actorId!==action.actorId||cost.ownerUserId!==action.ownerUserId
        ||cost.sourceRef!==action.sourceRef||cost.sourceRevision!==action.sourceRevision||cost.status!=='accepted'||cost.ownerConfirmed!==true||!Number.isSafeInteger(cost.amount)||cost.amount<1||hope?.ownerUserId!==action.ownerUserId)throw new Error('Native owner action cost required');
      const eventKey=`${action.id}:hope-committed`,previous=decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(input.campaignId,eventKey));
      if(previous){if(JSON.stringify(previous.request)!==JSON.stringify(input)||JSON.stringify(previous.cost)!==JSON.stringify(cost))throw new Error('Action outcome replay conflict');return previous;}
      if(action.status!=='ready_to_commit'||action.revision!==input.expectedActionRevision||hope.revision!==input.expectedHopeRevision)throw new Error('Action or Hope revision conflict');
      const change=pcEffectResource({resources:{hope:hope.hope,hope_max:hope.cap}},'hope',-cost.amount),afterHope={...hope,hope:change.after,revision:hope.revision+1},afterAction={...action,status:'resolved',revision:action.revision+1,effectsCommitted:true};
      const receipt={request:input,cost,beforeAction:action,afterAction,beforeHope:hope,afterHope,effectsCommitted:true};
      db.prepare('UPDATE vk3_action_hope SET data=? WHERE campaign=? AND actor=?').run(JSON.stringify(afterHope),input.campaignId,action.actorId);db.prepare('UPDATE vk3_actions SET data=? WHERE campaign=? AND id=?').run(JSON.stringify(afterAction),input.campaignId,action.id);db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(input.campaignId,eventKey,JSON.stringify(receipt));
      if(JSON.stringify(readCost(input.campaignId,input.costRef))!==JSON.stringify(cost))throw new Error('Cost evidence changed');return receipt;
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
  return Object.freeze({create,transition,read,initializeHope,readHope,commitHopeCost,registerHopeTerms,recordHopeConsent,readActionTerms,readConsent,
    readOutcome:(c,a)=>decode(db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(c,`${a}:hope-committed`)),close:()=>db.close()});
}
