/** Shared post-commit pipeline for slash and component native roll operations. Never repeats effects. */
import {queueRollAmendment,publishRollAmendment} from './roll-requests.js';
import {publishRollPartyDisclosure,queueRollPartyDisclosure} from './roll-sharing.js';
import {sendPlayerPrivate,postPlayMessage} from './publishing.js';
export async function finishRollOperation(db,interaction,row,respond){
  queueRollAmendment(db,interaction.guildId,row);
  queueRollPartyDisclosure(db,interaction.guildId,row);
  await respond();
  if(!interaction.guild)return;
  const results=await Promise.allSettled([
    publishRollAmendment(db,interaction.guildId,row,(userId,content,sessionId,characterId,meta)=>
      sendPlayerPrivate({db,guild:interaction.guild,userId,content,sessionId,characterId,...meta})),
    publishRollPartyDisclosure(db,interaction.guildId,row,(content,sessionId,meta)=>
      postPlayMessage({db,guild:interaction.guild,content,sessionId,...meta}))]);
  const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
}
