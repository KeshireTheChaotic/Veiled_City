import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {SESSION_ASSEMBLIES} from './session-occasions.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const ids=v=>Array.isArray(v)&&v.length<=256&&v.every(id)&&new Set(v).size===v.length;
const fields={message:['id','campaignId','userId','channelId','deleted','text','origin'],channel:['id','campaignId','sceneId','kind','permissionsVerified','recipientIds','writerIds','ownerUserId'],
  scene:['id','campaignId','sessionId','status','participants'],session:['id','campaignId','status','title','assembly','setup'],actor:['id','campaignId','sceneId','status','kind','ownerUserId','controllerUserId','controlRole','proxyAuthorized','delegationRef','name']};
const decode=r=>r?JSON.parse(r.data):null;
function valid(kind,d){
  if(!d||typeof d!=='object'||Array.isArray(d)||!fields[kind]||Object.keys(d).some(k=>!fields[kind].includes(k))||!id(d.id)||!id(d.campaignId))return false;
  if(kind==='message')return id(d.userId)&&id(d.channelId)&&typeof d.deleted==='boolean'&&typeof d.text==='string'&&d.text.length<=16000&&(d.origin===undefined||['discord_message','discord_component'].includes(d.origin));
  if(kind==='channel')return id(d.sceneId)&&['party','private'].includes(d.kind)&&typeof d.permissionsVerified==='boolean'&&ids(d.recipientIds)&&ids(d.writerIds)&&(d.ownerUserId==null||id(d.ownerUserId));
  if(kind==='session')return ['active','ended'].includes(d.status)&&(d.title===undefined||typeof d.title==='string'&&d.title.length<=256)&&(d.assembly===undefined||SESSION_ASSEMBLIES.includes(d.assembly))&&(d.setup===undefined||d.setup&&Object.keys(d.setup).sort().join(',')==='interactionId,principal,snapshotHash,sourceRef,sourceRevision'&&Object.values(d.setup).every(id)&&/^[a-f0-9]{64}$/.test(d.setup.snapshotHash));
  if(kind==='scene')return id(d.sessionId)&&['active','closed'].includes(d.status)&&Array.isArray(d.participants)&&d.participants.length<=256&&d.participants.every(p=>p&&Object.keys(p).sort().join(',')==='actorId,presence,userId'&&id(p.actorId)&&id(p.userId)&&['present','late','guest','absent'].includes(p.presence))&&new Set(d.participants.map(p=>p.actorId)).size===d.participants.length;
  return id(d.sceneId)&&['active','closed'].includes(d.status)&&['pc','npc'].includes(d.kind)&&[null,undefined,'owner','proxy'].includes(d.controlRole)
    &&[d.ownerUserId,d.controllerUserId,d.delegationRef].every(v=>v==null||id(v))&&(d.proxyAuthorized===undefined||typeof d.proxyAuthorized==='boolean')&&(d.name===undefined||id(d.name));
}
/** Native source snapshots only. No gameplay state or AI-callable mutation API.
 * check must validate the originating transport/admin evidence inside the transaction.
 */
export function openSceneStore(filename=':memory:'){
  const db=new DatabaseSync(filename);
  try{
    if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>!['vk2_scene_heads','vk2_scene_history','vk2_scene_receipts'].includes(r.name)))throw new Error('Dedicated scene database required');
    db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS vk2_scene_heads(campaign TEXT,kind TEXT,id TEXT,revision INTEGER,PRIMARY KEY(campaign,kind,id));
      CREATE TABLE IF NOT EXISTS vk2_scene_history(campaign TEXT,kind TEXT,id TEXT,revision INTEGER,data TEXT NOT NULL,source TEXT NOT NULL,PRIMARY KEY(campaign,kind,id,revision));
      CREATE TABLE IF NOT EXISTS vk2_scene_receipts(campaign TEXT,source TEXT,data TEXT NOT NULL,PRIMARY KEY(campaign,source));`);
  }catch(e){db.close();throw e;}
  function read(kind,campaign,id){return decode(db.prepare('SELECT r.data FROM vk2_scene_history r JOIN vk2_scene_heads h USING(campaign,kind,id,revision) WHERE r.campaign=? AND r.kind=? AND r.id=?').get(campaign,kind,id));}
  function commitSnapshot(input,{check}){
    if(typeof check!=='function'||!input||Object.keys(input).sort().join(',')!=='campaignId,principal,records,sourceRef'||![input.campaignId,input.principal,input.sourceRef].every(id)
      ||!Array.isArray(input.records)||!input.records.length||input.records.length>256)throw new Error('Bounded authenticated native snapshot required');
    const snapshot=JSON.parse(JSON.stringify(input)),fingerprint=hash(snapshot),seen=new Set();
    for(const item of snapshot.records){
      if(!item||Object.keys(item).sort().join(',')!=='data,expectedRevision,kind'||!valid(item.kind,item.data)||item.data.campaignId!==snapshot.campaignId
        ||item.expectedRevision!==null&&(!Number.isSafeInteger(item.expectedRevision)||item.expectedRevision<1))throw new Error('Closed native scene record required');
      const identity=`${item.kind}:${item.data.id}`;if(seen.has(identity))throw new Error('Duplicate snapshot record');seen.add(identity);
    }
    db.exec('BEGIN IMMEDIATE');try{
      check();const old=decode(db.prepare('SELECT data FROM vk2_scene_receipts WHERE campaign=? AND source=?').get(snapshot.campaignId,snapshot.sourceRef));
      if(old){if(old.fingerprint!==fingerprint)throw new Error('Native source replay conflict');check();db.exec('COMMIT');return old;}
      const records=[];
      for(const {kind,data,expectedRevision} of snapshot.records){
        const current=read(kind,snapshot.campaignId,data.id);
        if((current?Number(current.revision):null)!==expectedRevision)throw new Error('Native scene revision conflict');
        const revision=(expectedRevision??0)+1,row={...data,revision:String(revision),...(kind==='actor'?{controlRevision:String(revision)}:{})};
        if(kind==='scene'){
          row.authorityRevision=current&&current.status===data.status&&current.sessionId===data.sessionId?current.authorityRevision??current.revision:String(revision);
          row.participantRevisions=Object.fromEntries(data.participants.map(p=>{const before=current?.participants.find(v=>v.actorId===p.actorId);const unchanged=before&&before.userId===p.userId&&before.presence===p.presence;return [p.actorId,unchanged?current.participantRevisions?.[p.actorId]??current.revision:String(revision)];}));
        }
        db.prepare('INSERT INTO vk2_scene_history VALUES(?,?,?,?,?,?)').run(snapshot.campaignId,kind,data.id,revision,JSON.stringify(row),snapshot.sourceRef);
        db.prepare('INSERT INTO vk2_scene_heads VALUES(?,?,?,?) ON CONFLICT(campaign,kind,id) DO UPDATE SET revision=excluded.revision').run(snapshot.campaignId,kind,data.id,revision);
        records.push({kind,id:data.id,revision});
      }
      const receipt={sourceRef:snapshot.sourceRef,campaignId:snapshot.campaignId,principal:snapshot.principal,fingerprint,status:'recorded',records};
      db.prepare('INSERT INTO vk2_scene_receipts VALUES(?,?,?)').run(snapshot.campaignId,snapshot.sourceRef,JSON.stringify(receipt));check();db.exec('COMMIT');return receipt;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  const readers=Object.freeze({readMessage:(c,id)=>read('message',c,id),readChannel:(c,id)=>read('channel',c,id),readScene:(c,id)=>read('scene',c,id),readSession:(c,id)=>read('session',c,id),readActor:(c,id)=>read('actor',c,id)});
  return Object.freeze({readers,commitSnapshot,activeSessions:campaign=>db.prepare("SELECT r.data FROM vk2_scene_history r JOIN vk2_scene_heads h USING(campaign,kind,id,revision) WHERE r.campaign=? AND r.kind='session' AND json_extract(r.data,'$.status')='active'").all(campaign).map(decode),activeScenes:(campaign,sessionId)=>db.prepare("SELECT r.data FROM vk2_scene_history r JOIN vk2_scene_heads h USING(campaign,kind,id,revision) WHERE r.campaign=? AND r.kind='scene' AND json_extract(r.data,'$.sessionId')=? AND json_extract(r.data,'$.status')='active'").all(campaign,sessionId).map(decode),sessionScenes:(campaign,sessionId)=>db.prepare("SELECT r.data FROM vk2_scene_history r JOIN vk2_scene_heads h USING(campaign,kind,id,revision) WHERE r.campaign=? AND r.kind='scene' AND json_extract(r.data,'$.sessionId')=?").all(campaign,sessionId).map(decode),ownerPrivateChannel:(campaign,sceneId,ownerUserId)=>{const rows=db.prepare("SELECT r.data FROM vk2_scene_history r JOIN vk2_scene_heads h USING(campaign,kind,id,revision) WHERE r.campaign=? AND r.kind='channel' AND json_extract(r.data,'$.sceneId')=? AND json_extract(r.data,'$.kind')='private' AND json_extract(r.data,'$.ownerUserId')=?").all(campaign,sceneId,ownerUserId).map(decode);return rows.length===1&&rows[0].permissionsVerified===true?rows[0]:null;},history:(campaign,kind,id)=>db.prepare('SELECT data,source FROM vk2_scene_history WHERE campaign=? AND kind=? AND id=? ORDER BY revision').all(campaign,kind,id).map(r=>({record:decode(r),sourceRef:r.source})),close:()=>db.close()});
}
