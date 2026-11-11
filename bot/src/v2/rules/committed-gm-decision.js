import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>new Error(code);
/** Immutable provenance for an already committed NPC operation only.
 * Never a current action, publication, controller or paid-cost authorization.
 */
export function inspectCommittedGmDecision(db,guild,key){
  const row=db.getCityRecord(guild,'gm_arbitration_decision',key),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event),
    board=d&&db.getCityRecord(guild,'scene_intent_board',d.board),boardSource=board&&db.getWorldEvent(guild,board.source_event);
  if(!d||row.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_gm_arbitration'||source.source_id!=='native:unified-gm'
    ||source.details.payload_hash!==hash(d)||boardSource?.status!=='active'||boardSource.kind!=='native_scene_intent_board'
    ||boardSource.source_id!=='native:unified-gm'||boardSource.details.payload_hash!==hash(board.data)
    ||d.proposal_hash!==hash(d.proposal))throw fail('native_decision_provenance');
  const entry=board.data.entries.find(e=>e.intent_ref===d.entry);
  if(!entry||d.entry_hash!==hash(entry)||hash(board.data.origin)!==hash(d.origin))throw fail('decision_entry_provenance');
  if(board.data.version===2&&entry.actor.owner_control_type!==(entry.actor.type==='npc'?'ai_world':'player'))throw fail('decision_actor_control_class');
  const proposalSource=db.getWorldEvent(guild,entry.source_ref),{source_ref:ignoredRef,source_hash:ignoredHash,...material}=entry;
  if(entry.actor.type!=='npc'||proposalSource?.status!=='active'||proposalSource.kind!=='native_npc_scene_intent'
    ||proposalSource.source_id!=='native:unified-gm'||hash(proposalSource.details)!==entry.source_hash
    ||proposalSource.details.entry_hash!==hash(material)||proposalSource.details.input_source!==d.origin.source
    ||db.getWorldEvent(guild,d.origin.source)?.status!=='active')throw fail('committed_npc_source_provenance');
  return {row,entry,board};
}
