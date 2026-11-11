import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),textHash=v=>createHash('sha256').update(v).digest('hex');
/** Historical statement evidence only. No present actor control or truth/canon authority. */
export function createStatementLineage({sourceAuthority,sourceRegistry,readMessage,readChannel}){
 if(typeof sourceAuthority?.revalidate!=='function'||typeof sourceRegistry?.get!=='function'||[readMessage,readChannel].some(f=>typeof f!=='function'))throw new TypeError('Native statement lineage readers required');
 function validate(row){
  try{
   const o=row.origin;if(!o||Object.keys(o).sort().join(',')!=='channelId,channelRevision,messageId,messageRevision,sceneId,sourceRef,sourceRevision')return false;
   if(Object.values(o).some(v=>typeof v!=='string'||!v||v.length>256))return false;
   const saved=sourceRegistry.get(o.sourceRef),event=saved?.event,control=saved?.control;
   if(!event||event.campaignId!==row.campaignId||event.messageId!==o.messageId||control?.actorId!==event.actorId||!['owner','proxy'].includes(control.role))return false;
   const message=readMessage(row.campaignId,o.messageId),channel=readChannel(row.campaignId,o.channelId);
   if(!message||message.deleted!==false||message.campaignId!==row.campaignId||message.id!==o.messageId||message.userId!==event.userId||message.channelId!==o.channelId||message.revision!==o.messageRevision||typeof message.text!=='string'||!channel||channel.id!==o.channelId||channel.campaignId!==row.campaignId||channel.sceneId!==o.sceneId||channel.permissionsVerified!==true||channel.revision!==o.channelRevision)return false;
   if(row.kind!=='testimony'||row.visibility!=='recipients'||row.disclosure!=='observed'||!Array.isArray(row.recipientIds)||!Array.isArray(row.knownBy)||row.knownBy.length||!Array.isArray(row.sourceRefs)||row.sourceRefs.length||row.contentHash!==textHash(message.text))return false;
   const proof={id:o.sourceRef,principal:event.userId,campaign:row.campaignId,scene:o.sceneId,revision:o.sourceRevision,actors:[event.actorId],recipients:row.recipientIds,text:message.text};
   return hash(proof)===saved.fingerprint;
  }catch{return false;}
 }
 function capture(source){
  if(!sourceAuthority.revalidate(source))throw new Error('Current statement source required');const saved=sourceRegistry.get(source.id),message=saved&&readMessage(source.campaign,saved.event.messageId),channel=message&&readChannel(source.campaign,message.channelId);
  if(!message||!channel||hash(source)!==saved.fingerprint)throw new Error('Sealed statement source required');
  const metadata={status:'active',kind:'testimony',scope:'campaign',visibility:'recipients',disclosure:'observed',recipientIds:[...source.recipients],knownBy:[],sourceRefs:[],origin:{sourceRef:source.id,sourceRevision:source.revision,messageId:message.id,messageRevision:message.revision,channelId:channel.id,channelRevision:channel.revision,sceneId:source.scene}};
  if(!validate({...metadata,campaignId:source.campaign,contentHash:textHash(source.text)}))throw new Error('Statement source lineage changed');return {metadata,body:source.text};
 }
 return Object.freeze({capture,validate});
}
