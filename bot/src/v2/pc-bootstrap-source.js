import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Native persisted sheet only. Prepared imports/exports are not this repository. */
export function createPcBootstrapSource({sceneStore,characterRepository}){
  if(typeof sceneStore?.readers?.readActor!=='function'||typeof characterRepository?.getCharacter!=='function')throw new TypeError('Native actor registration and character repository required');
  return (campaignId,actorId)=>{
    const a=sceneStore.readers.readActor(campaignId,actorId),c=characterRepository.getCharacter(actorId),d=c?.data,r=d?.resources;
    if(a?.id!==actorId||a.campaignId!==campaignId||a.kind!=='pc'||a.status!=='active'||a.controlRole!=='owner'||a.ownerUserId!==a.controllerUserId||c?.id!==actorId||c.guild_id!==campaignId||c.owner_user_id!==a.ownerUserId||!['active','reserve','guest'].includes(c.status)||!d||!r)throw new Error('Registered owner and native character source required');
    return {kind:'native_character_snapshot',campaignId,actorId,ownerUserId:a.ownerUserId,controlRevision:a.controlRevision,sourceRef:`native-character:${hash([campaignId,actorId])}`,sourceRevision:hash([a,c]),status:'active',deathState:d.death_state??null,level:d.level,hp:structuredClone(r.hp),armorSlots:structuredClone(r.armor),stress:structuredClone(r.stress),hope:r.hope,hopeCap:r.hope_max};
  };
}
