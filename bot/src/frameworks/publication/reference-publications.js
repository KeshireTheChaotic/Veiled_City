/** Original reference record publication; root supplies unchanged output validation/quarantine callbacks. */
import {createHash} from 'node:crypto';
import {upsertBotMessage} from './reference-delivery.js';
export function createReferencePublications({prepareStoredOutput,quarantineGeneratedOutput}){
  if(typeof prepareStoredOutput!=='function'||typeof quarantineGeneratedOutput!=='function')throw new TypeError('Reference publications require original output validation and quarantine callbacks.');
function recordText(db,guild,kind,row){
  const ref=createHash('sha256').update(JSON.stringify([kind,row.id||row.entity_key])).digest('hex').slice(0,16);
  const candidate=kind==='thread'?row.notes:row.summary,scope={mode:'party',actorUserId:null,actorCharacterId:null};
  let body='Description pending source review.';
  if(candidate){
    try{prepareStoredOutput(db,guild,candidate,scope);body=candidate;}
    catch(error){
      if(error.code!=='NARRATIVE_PVP')throw error;
      quarantineGeneratedOutput(db,guild,'reference-publication',{kind,ref,candidate,label:row.label||row.display_name});
    }
  }
  const status=kind==='thread'&&['active','resolved','failed','dormant'].includes(row.status)?`\nRecord status: ${row.status}`:'';
  // Native record metadata is UI, not fiction or proof of any PC outcome. Unproven labels are not safe headings.
  return `**${kind==='thread'?'CASE THREAD':kind==='npc'?'NPC':'LOCATION'} RECORD — ${ref}**${status}\n${body}`;
}

function publishRecord({db,guild,channelId,surface,key,kind,row}){
  const content=recordText(db,guild.id,kind,row),beforeWrite=()=>{
    const current=kind==='thread'?db.getThread(guild.id,row.id):db.getReference(guild.id,kind,row.entity_key);
    if(!current||!['public','party'].includes(current.visibility)||recordText(db,guild.id,kind,current)!==content)
      throw Object.assign(new Error('Current source-bound reference output required.'),{code:'NARRATIVE_PVP'});
  };
  return upsertBotMessage({db,guild,channelId,surface,key,content,beforeWrite});
}

async function publishEventResults({db,guild,results=[]}){
  const c=db.getCampaign(guild.id);
  for(const r of results){
    if(!r?.publish||!r.row) continue;
    if(r.type==="thread" && c?.case_board_channel_id){
      await publishRecord({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:r.row.id,kind:'thread',row:r.row});
    } else if(r.kind==="npc" && c?.known_npcs_channel_id){
      await publishRecord({db,guild,channelId:c.known_npcs_channel_id,surface:"npc",key:r.row.entity_key,kind:'npc',row:r.row});
    } else if(r.kind==="location" && c?.known_locations_channel_id){
      await publishRecord({db,guild,channelId:c.known_locations_channel_id,surface:"location",key:r.row.entity_key,kind:'location',row:r.row});
    }
  }
}

async function syncConfiguredSurfaces({db,guild}){
  const c=db.getCampaign(guild.id);
  if(c?.case_board_channel_id){
    const rows=db.listPublicPartyThreads(guild.id);
    for(const row of rows) await publishRecord({db,guild,channelId:c.case_board_channel_id,surface:"caseboard",key:row.id,kind:'thread',row});
  }
  for(const [kind,col] of [["npc","known_npcs_channel_id"],["location","known_locations_channel_id"]]){
    if(!c?.[col]) continue;
    for(const row of db.listReferences(guild.id,kind,{publicOnly:true})){
      await publishRecord({db,guild,channelId:c[col],surface:kind,key:row.entity_key,kind,row});
    }
  }
}
  return Object.freeze({publishEventResults,syncConfiguredSurfaces});
}
