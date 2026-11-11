const normalized=v=>JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>[k,Array.isArray(value)?[...value].sort():value])));
/** Fresh read-only Discord proof for already-entitled statement origins. No source issuance or state mutation. */
export function createStatementOriginRefresh({contextAuthority,records,sourceRegistry,sceneStore,messageReader,readGmRoleId}){
 if(typeof contextAuthority?.entitled!=='function'||typeof records?.metadata!=='function'||typeof sourceRegistry?.get!=='function'||typeof sceneStore?.readers?.readChannel!=='function'||typeof messageReader?.read!=='function'||typeof readGmRoleId!=='function')throw new TypeError('Native origin refresh authorities required');
 async function refresh(source,references,{signal}={}){
  if(!Array.isArray(references)||references.length>16384||references.some(r=>typeof r!=='string'||!r||r.length>256))throw new Error('Bounded native origin references required');
  const rows=new Map();
  function visit(ref){if(rows.has(ref))return;if(rows.size>=16384||!contextAuthority.entitled(source,ref))throw new Error('Entitled complete origin source required');const row=records.metadata(source.campaign,ref);if(!row)throw new Error('Native origin metadata missing');rows.set(ref,row);for(const parent of row.sourceRefs)visit(parent);}
  for(const ref of new Set(references))visit(ref);
  signal?.throwIfAborted();
  if(new Set([...rows.values()].filter(row=>row.origin).map(row=>JSON.stringify(row.origin))).size>64)throw new Error('Origin refresh proof limit requires narrower context');
  const seen=new Set();
  for(const row of rows.values()){
   signal?.throwIfAborted();if(!row.origin)continue;const o=row.origin,key=JSON.stringify(o);if(seen.has(key))continue;seen.add(key);
   if(records.validateOrigin?.(row)!==true)throw new Error('Current native statement origin required');
   const event=sourceRegistry.get(o.sourceRef)?.event,channel=sceneStore.readers.readChannel(source.campaign,o.channelId);if(!event||!channel)throw new Error('Native origin lookup unavailable');
   const before=normalized([row,channel]);
   const live=await messageReader.read({guildId:source.campaign,channelId:o.channelId,messageId:o.messageId,userId:event.userId,sceneId:o.sceneId,mode:channel.kind,ownerUserId:channel.ownerUserId??null,gmRoleId:readGmRoleId(source.campaign)??null,participantIds:channel.kind==='party'?channel.recipientIds:[]},{signal});
   signal?.throwIfAborted();const current=records.metadata(source.campaign,row.id),currentChannel=sceneStore.readers.readChannel(source.campaign,o.channelId);
   if(!contextAuthority.entitled(source,row.id)||!current||!currentChannel||normalized([current,currentChannel])!==before||records.validateOrigin(current)!==true)throw new Error('Statement origin changed during refresh');
   const expectedMessage=sceneStore.readers.readMessage(source.campaign,o.messageId),{revision:mr,...message}=expectedMessage,{revision:cr,...channelRecord}=channel;
   if(normalized(live.messageRecord)!==normalized(message)||normalized(live.audience.channelRecord)!==normalized(channelRecord))throw new Error('Live statement origin differs from native lineage');
  }
 }
 return Object.freeze({refresh});
}
