import {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
export {fearReservationHash,fearReservationFailure,inspectFearReservation,reservedCampaignFear} from './frameworks/daggerheart/public.js';
/** Native campaign Fear holds. Reserved funds remain in the capped pool until an acknowledged action commits. */
import {createHash} from 'node:crypto';
import {indexWorldEvent} from './city-calendar.js';
const ISSUER='native:pre-roll-fear';
export function writeFearReservation(db,guild,binding,status,prior=null){
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
