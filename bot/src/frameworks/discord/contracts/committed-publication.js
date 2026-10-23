/** Inject the existing row-to-Discord transport callback; do not create a client, choose recipients or reinterpret errors. */
export function createDiscordPublicationCapability(transport){
  if(typeof transport!=='function')throw new TypeError('Discord publication requires a committed-row transport callback.');
  return Object.freeze({sendCommittedPublication:row=>transport(row)});
}
