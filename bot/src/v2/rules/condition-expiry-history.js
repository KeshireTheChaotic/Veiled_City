import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Historical duration proof only, after original condition/effect validation.
 * Reads the already committed next-spotlight transition; never advances time or ends a condition.
 */
export function inspectNativeConditionExpiryAncestry(db,guild,condition){
  const key=condition?.record_key,row=key&&db.getCityRecord(guild,'pc_native_condition',key),v=row?.data;
  if(!row||row.status!=='expired'||hash(row)!==hash(condition))throw new Error('native_condition_expiry_identity');
  const r=db.getCityRecord(guild,'pc_native_condition_expiry',key),source=r&&db.getWorldEvent(guild,r.source_event),spotlight=r&&db.getWorldEvent(guild,r.data.spotlight);
  if(r?.status!=='resolved'||source?.status!=='active'||source.kind!=='native_condition_expiry'||source.source_id!=='native:unified-gm'||hash(source.details)!==hash(r.data)
    ||r.data.condition_hash!==hash(v)||spotlight?.status!=='active'||spotlight.kind!=='native_gm_spotlight'||spotlight.source_id!=='native:unified-gm'
    ||spotlight.details.payload_hash!==r.data.spotlight_hash||v.expiry!=='next_spotlight'||r.data.condition!==key||r.data.character!==v.character
    ||r.visibility!=='character'||r.subject_key!==v.character||source.visibility!=='character'||source.subject_key!==v.character
    ||hash(r.data.after)!==hash(r.data.before.map(c=>c.native_ref===key?{...c,active:false}:c)))throw new Error('native_condition_expiry_source');
  const cost=db.getCityRecord(guild,'gm_action_cost_receipt',spotlight.event_key.slice(0,-10)),sv=cost?.data.spotlight;
  if(!cost||hash(sv)!==r.data.spotlight_hash||hash(cost)!==spotlight.details.cost_hash||sv.actor!==v.actor||sv.scene!==v.scene
    ||sv.index<=v.cast_spotlight||cost.status!=='committed')throw new Error('native_condition_expiry_spotlight_cost');
  return r;
}
