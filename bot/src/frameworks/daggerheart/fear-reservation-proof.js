/** Native reservation ancestry and funds projections. Read-only repository port; no publication or choice authority. */
import {createHash} from 'node:crypto';
const ISSUER='native:pre-roll-fear';
export const fearReservationHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function fearReservationFailure(reason){return Object.assign(new Error(`Pre-roll Fear held: ${reason}`),{code:'PRE_ROLL_FEAR',expected:true});}
export function inspectFearReservation(db,guild,key){
  const row=db.getCityRecord(guild,'pre_roll_fear_interrupt',key),binding=row?.data.binding;
  if(!binding||row.visibility!=='gm'||row.subject_key!==null||row.actor_key!==binding.npc||binding.base_cost!==1
    ||row.record_key!==`pre-roll-fear:${binding.request}`||row.data.version!==1)throw fearReservationFailure('invalid native reservation');
  let eventKey=row.data.state_source,expectedStatus=row.status,steps=0;
  const seen=new Set();
  while(eventKey){
    if(seen.has(eventKey)||++steps>4)throw fearReservationFailure('invalid transition ancestry');seen.add(eventKey);
    const e=db.getWorldEvent(guild,eventKey),m=e?.source_kind==='mutation'&&db.getMutation(guild,e.source_id);
    let after;try{after=JSON.parse(m?.after_json||'null');}catch{throw fearReservationFailure('invalid mutation payload');}
    const s=after?.state;
    if(e?.status!=='active'||e.kind!=='native_pre_roll_fear_state'||e.visibility!=='gm'||e.scene!==binding.scene
      ||e.session_id!==binding.session||e.details.issuer!==ISSUER||m?.actor_type!=='ai'||m.actor_id!==ISSUER
      ||m.source_layer!=='native'||m.session_id!==binding.session||m.mutation_type!=='pre_roll_fear_state'||m.entity_key!==key
      ||m.visibility!=='gm'||fearReservationHash(after?.binding)!==fearReservationHash(binding)
      ||e.details.payload_hash!==fearReservationHash(after)||s?.version!==1||s.issuer!==ISSUER||s.key!==key
      ||s.binding_hash!==fearReservationHash(binding)||s.status!==expectedStatus)throw fearReservationFailure('invalid native mutation ancestry');
    if(expectedStatus==='awaiting_announcement'){
      if(s.previous!==null||row.source_event!==e.event_key)throw fearReservationFailure('reservation origin changed');
      return {row,binding};
    }
    if(!['executing','completed','cancelled'].includes(expectedStatus)||!s.previous)throw fearReservationFailure('unsupported transition');
    expectedStatus=expectedStatus==='completed'?'executing':'awaiting_announcement';eventKey=s.previous;
  }
  throw fearReservationFailure('missing reservation origin');
}
/** Deliberately includes invalid pending projections as a hold, never as funds or permission. */
export function reservedCampaignFear(db,guild){
  return db.pendingFearReservationKeys(guild).reduce((sum,key)=>{
    const {row,binding}=inspectFearReservation(db,guild,key);
    return sum+(row.status==='awaiting_announcement'?binding.base_cost:0);
  },0);
}
