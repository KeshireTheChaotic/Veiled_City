/** Typed subscriptions to committed world sources; pending effects never spend, disclose, or fan out without review. */
import { cityInteger } from './frameworks/world/public.js';
import { requireCitySource } from "./city-core.js";
import { changeCityService, transmitCityBelief } from "./frameworks/world/public.js";
import {worldNpcEvidence,worldNpcGoalProposal} from "./frameworks/world/public.js";
import {jsonKey32 as motivationKey} from "./kernel/json-key32.js";
const {actorSource}=worldNpcEvidence;
const {proposeGoalTransition}=worldNpcGoalProposal;
import { StateConflictError } from "./kernel/errors.js";
import {nativeWorldCoordinatorReady,nativeWorldOperationAllows} from './frameworks/world/public.js';
const handlers={
  goal:(db,guild,row,actor)=>proposeGoalTransition(db,guild,{...row.data.payload,key:row.record_key,source_event:row.source_event},actor),
  service:(db,guild,row,actor)=>{
    const service=db.getCityRecord(guild,"infrastructure",row.data.entity_key),event=requireCitySource(db,guild,row.source_event);
    if(!service||service.status!=="active"||!event.location_key||!service.data.locations.includes(event.location_key))
      throw new StateConflictError("Source has no established physical path to this service.");
    const delta=cityInteger(row.data.payload.delta,-10,10);
    if(!["infrastructure_damage","infrastructure_repair"].includes(event.kind)
      ||event.kind==="infrastructure_damage"&&delta>0||event.kind==="infrastructure_repair"&&delta<0)
      throw new StateConflictError("Consequence does not match its committed source class.");
    const result=changeCityService(db,guild,{key:service.record_key,source_event:row.source_event,
      condition:Math.max(0,Math.min(100,service.data.native_condition+delta))},actor);
    if(result.kind==="change") throw new StateConflictError("Significant service consequence requires dedicated civic review.");return result;
  },
  transmit:(db,guild,row,actor)=>{
    const payload=row.data.payload;
    if(["npc","institution"].includes(payload.from_type)) actorSource(db,guild,{actor_type:payload.from_type,actor_key:payload.from_key,
      information_key:payload.information_key,source_event:row.source_event});
    else{
      const message=db.getCityRecord(guild,"message",payload.information_key);
      if(message?.source_event!==row.source_event||message.actor_key!==`${payload.from_type}:${payload.from_key}`)
        throw new StateConflictError("Transmission source has no knowledge path from the causal event.");
    }
    return transmitCityBelief(db,guild,{...payload,key:row.record_key,source_event:row.source_event},actor);
  }
};
export function subscribeConsequence(...args){return consequences().subscribeConsequence(...args);}
export function coordinateConsequences(...args){return consequences().coordinateConsequences(...args);}
export function reviewConsequence(...args){return consequences().reviewConsequence(...args);}

import {createWorldConsequences} from './frameworks/world/public.js';
let worldConsequences;
function consequences(){return worldConsequences??=createWorldConsequences({handlers,motivationKey,nativeWorldCoordinatorReady:(...args)=>nativeWorldCoordinatorReady(...args),nativeWorldOperationAllows:(...args)=>nativeWorldOperationAllows(...args)});}
