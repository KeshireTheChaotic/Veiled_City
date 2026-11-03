import {DatabaseSync} from 'node:sqlite';
const graphs={ordinary_roll:{pending:['awaiting_notice','cancelled'],awaiting_notice:['awaiting_player_roll','cancelled'],awaiting_player_roll:['ready_to_resolve','cancelled'],ready_to_resolve:['cancelled']},hope_cost:{pending:['awaiting_consent','cancelled'],awaiting_consent:['ready_to_commit','cancelled'],ready_to_commit:['cancelled']}};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const decode=r=>r?JSON.parse(r.data):null;
/** Native control state only: cannot mark effects resolved or patch actor state. */
export function openActionStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk3_actions','vk3_action_events'].includes(r.name)))throw new Error('Dedicated action database required');
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS vk3_actions(campaign TEXT,id TEXT,data TEXT,PRIMARY KEY(campaign,id)); CREATE TABLE IF NOT EXISTS vk3_action_events(campaign TEXT,source TEXT,data TEXT,PRIMARY KEY(campaign,source));');
  }catch(e){db.close();throw e;}
  const read=(c,a)=>decode(db.prepare('SELECT data FROM vk3_actions WHERE campaign=? AND id=?').get(c,a));
  function tx(check,fn){if(typeof check!=='function')throw new Error('Native action authority required');db.exec('BEGIN IMMEDIATE');try{check();const r=fn();check();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
  function create(input,{check}){
    if(!input||Object.keys(input).sort().join(',')!=='actorId,campaignId,id,kind,ownerUserId,sceneId,sourceRef,sourceRevision'||!Object.hasOwn(graphs,input.kind)||!Object.values(input).every(id))throw new Error('Closed native action identity required');
    const row={...input,status:'pending',revision:1,effectsCommitted:false};return tx(check,()=>{const old=read(input.campaignId,input.id);if(old){if(JSON.stringify({...old,status:'pending',revision:1})!==JSON.stringify(row))throw new Error('Action identity conflict');return old;}db.prepare('INSERT INTO vk3_actions VALUES(?,?,?)').run(input.campaignId,input.id,JSON.stringify(row));return row;});
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
  return Object.freeze({create,transition,read,close:()=>db.close()});
}
