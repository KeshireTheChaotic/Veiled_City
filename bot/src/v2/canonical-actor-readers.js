import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
/** Native-only sheet/rules projection. Never expose full actor snapshots through
 * inference, player RPCs or unscoped exports. No import, bootstrap or state write.
 */
export function createCanonicalActorReaders({sceneStore,actionStore,characterRepository}){
  if(typeof sceneStore?.readers?.readActor!=='function'||typeof actionStore?.readPcLife!=='function'||typeof characterRepository?.getCharacter!=='function')throw new TypeError('Native scene, lifecycle and character readers required');
  function inputs(campaignId,actorId){return {control:sceneStore.readers.readActor(campaignId,actorId),character:characterRepository.getCharacter(actorId),state:actionStore.readPcLife(campaignId,actorId)};}
  function readActorSnapshot(campaignId,actorId){
    const before=inputs(campaignId,actorId),{control:a,character:c,state:s}=before,d=c?.data;
    if(a?.id!==actorId||a.campaignId!==campaignId||a.kind!=='pc'||a.status!=='active'||a.controlRole!=='owner'||a.controllerUserId!==a.ownerUserId||c?.id!==actorId||c.guild_id!==campaignId||c.owner_user_id!==a.ownerUserId||!['active','reserve','guest','dead'].includes(c.status)||!object(d)||!object(d.resources)||!s||!['active','dead'].includes(s.life.status)||[s.life,s.defenses,s.hope].some(r=>r.campaignId!==campaignId||r.actorId!==actorId||r.ownerUserId!==a.ownerUserId)||s.life.controlRevision!==a.controlRevision||s.defenses.controlRevision!==a.controlRevision||d.level!==s.life.level||c.status==='dead'&&s.life.status!=='dead'||d.death_state!=null&&s.life.deathState==null||s.hope.cap===0&&s.life.status!=='dead')throw new Error('Canonical owner actor migration or identity review required; no healthy defaults');
    const snapshot={actorId,ownerUserId:a.ownerUserId,controlRevision:a.controlRevision,status:s.life.status,data:{...structuredClone(d),level:s.life.level,death_state:structuredClone(s.life.deathState),resources:{...structuredClone(d.resources),hp:structuredClone(s.defenses.hp),armor:structuredClone(s.defenses.armorSlots),stress:structuredClone(s.life.stress),hope:s.hope.hope,hope_max:s.hope.cap}}};
    if(hash(inputs(campaignId,actorId))!==hash(before))throw new Error('Native actor projection changed during read');return snapshot;
  }
  function readActor(campaignId,actorId){
    const control=sceneStore.readers.readActor(campaignId,actorId);if(!control)return null;
    if(control.kind!=='pc'||control.status!=='active')return structuredClone(control);
    const snapshot=readActorSnapshot(campaignId,actorId);if(snapshot.ownerUserId!==control.ownerUserId||snapshot.controlRevision!==control.controlRevision||hash(sceneStore.readers.readActor(campaignId,actorId))!==hash(control))throw new Error('Native actor control changed during projection');return {...structuredClone(control),status:snapshot.status};
  }
  const readers=Object.freeze({...sceneStore.readers,readActor});
  return Object.freeze({readers,readActor,readActorSnapshot});
}
