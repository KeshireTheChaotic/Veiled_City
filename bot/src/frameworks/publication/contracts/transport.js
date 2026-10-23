/**
 * Publication-owned callback port used by deliverTurnOutbox: transport(row).
 * @typedef {{id:string,guild_id:string,turn_id:string,payload:string,payload_hash:string,
 * visibility:string,target_user_id:string|null,target_character_id:string|null,channel_id:string|null}} CommittedPublication
 * @typedef {{messageId:string,channelId:string,ok?:boolean,certainty?:string}} PublicationAcknowledgment
 * Native validators and the outbox own entitlement/claims; this boundary forwards the exact row and receipt.
 */
export function createPublicationTransportPort(transport){
  if(typeof transport!=='function')throw new TypeError('Publication delivery requires a transport callback.');
  return row=>transport(row);
}
