import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Read-only GM policy from the campaign record. Only the configured GM role counts;
 * administrator fallback and user lists are never inferred from the legacy row.
 */
export function createCampaignGmPolicyReader({repository}){
  if(typeof repository?.getCampaign!=='function')throw new TypeError('Campaign repository required');
  return campaignId=>{const row=repository.getCampaign(campaignId);if(!row||row.guild_id!==campaignId||!id(row.gm_role_id))throw new Error('Configured campaign GM role required');return {campaignId,revision:hash([campaignId,row.gm_role_id]),gmRoleId:row.gm_role_id,gmUserIds:[],allowAdministrators:false};};
}
/** Resolves the owner's registered PC in the single active native session. The query is a
 * character id or exact name; absent, ambiguous or unregistered matches are refused, never guessed.
 */
export function createOwnerSessionReader({sceneStore,repository,readPolicy}){
  if(typeof sceneStore?.activeSessions!=='function'||typeof repository?.listCharacters!=='function'||typeof readPolicy!=='function')throw new TypeError('Native scene store, character repository and policy required');
  return (campaignId,userId,query='')=>{
    const sessions=sceneStore.activeSessions(campaignId);if(sessions.length!==1)return null;
    const matches=repository.listCharacters(campaignId,userId,{includeClosed:false}).filter(c=>query?c.id===query||c.name===query:true);if(matches.length!==1)return null;
    const actor=sceneStore.readers.readActor(campaignId,matches[0].id),scene=actor&&sceneStore.readers.readScene(campaignId,actor.sceneId);
    if(actor?.ownerUserId!==userId||scene?.sessionId!==sessions[0].id)return null;
    return {campaignId,ownerUserId:userId,actorId:actor.id,sessionId:scene.sessionId,sceneId:scene.id,gmRoleId:readPolicy(campaignId).gmRoleId};
  };
}
