/** Original native World actor state and explicit GM configuration; no player-character effects. */
import {normalizeEntityKey as normalizeNpcKey} from '../../kernel/entity-key.js';
const bounded=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const text=(value)=>String(value||"").trim();
const RESOURCE_KEYS=["influence","materials","information","manpower","leverage","wounds","stress","favors"];
const DEFAULT_RESOURCES={influence:4,materials:4,information:2,manpower:2,leverage:1,wounds:0,stress:0,favors:0};
export function actorState(db,guildId,type,key){
  const row=db.getSimulationEntity(guildId,type,key);
  return {activity_tier:"supporting",location_key:"",preparation:0,position:0,traits:0,voice:{},personality:{},
    ...row?.state,resources:{...DEFAULT_RESOURCES,...row?.state?.resources}};
}

/** GM configuration is explicit; the AI cannot grant itself new resources. */
export function configureSimulationEntity(db,guildId,type,key,patch){
  if(!["npc","faction","location"].includes(type)||!text(key)) throw new Error("Use an npc, faction, or location with a nonempty key.");
  if(type!=="location") key=normalizeNpcKey(key);
  if(!key) throw new Error("Entity key must contain letters or numbers.");
  if(!patch||typeof patch!=="object"||Array.isArray(patch)) throw new Error("State must be a JSON object.");
  const old=type==="location"?(db.getSimulationEntity(guildId,type,key)?.state||{}):actorState(db,guildId,type,key);
  const next={...old,...patch};
  if(type!=="location"){
    if(!["active","supporting","background","dormant"].includes(next.activity_tier)) throw new Error("Invalid activity tier.");
    next.resources={...old.resources,...patch.resources};
    for(const resource of RESOURCE_KEYS){
      const value=next.resources[resource];
      if(!Number.isInteger(value)||value<0||value>100) throw new Error(`${resource} must be an integer from 0 to 100.`);
    }
    for(const resource of Object.keys(next.resources)) if(!RESOURCE_KEYS.includes(resource)) throw new Error(`Unknown resource: ${resource}`);
    for(const name of ["preparation","position","traits"]) next[name]=bounded(next[name],0,5);
  }
  return db.setSimulationEntity(guildId,type,key,next);
}

