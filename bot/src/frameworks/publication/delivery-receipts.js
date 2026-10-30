/** Original Publication delivery certainty, exact transport acknowledgment and stored status projection. */
export function notSent(message){return Object.assign(new Error(message),{deliveryCertainty:"not_sent"});}

export function validatePublicationAcknowledgement(row,receipt){
  if(!receipt||receipt.ok===false||typeof receipt.messageId!=='string'||!receipt.messageId.trim()
    ||typeof receipt.channelId!=='string'||!receipt.channelId.trim()
    ||row.channel_id&&receipt.channelId!==row.channel_id)
    throw Object.assign(new Error('Delivery needs an exact acknowledged Discord message/channel receipt.'),
      {deliveryCertainty:'uncertain'});
  return receipt;
}

export function outboxSummary(row){
  return {id:row.id,turn_id:row.turn_id,surface:row.surface,ordinal:row.ordinal,visibility:row.visibility,
    status:row.status,attempts:row.attempt_count,discord_message_id:row.discord_message_id||null,
    uncertain:row.status==="uncertain",last_failure:row.last_failure||""};
}
