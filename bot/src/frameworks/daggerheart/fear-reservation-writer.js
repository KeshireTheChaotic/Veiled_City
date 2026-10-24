/** Native pre-roll Fear policy; explicit source/publication ports, unchanged receipts and owner choices. */
import {fearReservationHash,fearReservationFailure} from './fear-reservation-proof.js';
export function createFearReservationWriter({indexWorldEvent}){
if([indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native Fear capabilities required.');
const ISSUER='native:pre-roll-fear';
function writeFearReservation(db,guild,binding,status,prior=null){
  const key=`pre-roll-fear:${binding.request}`,previous=prior?.data.state_source||null,
    state={version:1,issuer:ISSUER,key,binding_hash:fearReservationHash(binding),status,previous},
    eventKey=`${key}:state:${status}`;
  if(db.getWorldEvent(guild,eventKey))throw fearReservationFailure('immutable transition already exists');
  const mutation=db.recordMutation(guild,{actorType:'ai',actorId:ISSUER,sourceLayer:'native',
    sessionId:binding.session,mutationType:'pre_roll_fear_state',entityKey:key,visibility:'gm',after:{binding,state}});
  const source=indexWorldEvent(db,guild,{key:eventKey,kind:'native_pre_roll_fear_state',source_kind:'mutation',source_id:mutation.id,
    title:'Native pre-roll Fear lifecycle',session_id:binding.session,scene:binding.scene,visibility:'gm',
    details:{issuer:ISSUER,payload_hash:fearReservationHash({binding,state})}},ISSUER);
  return db.saveCityRecord(guild,{kind:'pre_roll_fear_interrupt',key,status,source_event:prior?.source_event||source.event_key,
    visibility:'gm',actor_key:binding.npc,subject_key:null,data:{version:1,binding,state_source:source.event_key}});
}

return Object.freeze({writeFearReservation});
}
