/** Current campaign source and record qualification; never an actor knowledge or mechanical grant. */
import {cityKey} from './city-calendar.js';
export const requireCitySource=(db,guildId,key)=>{
  const event=db.getWorldEvent(guildId,cityKey(key));
  if(!event||event.status!=="active") throw new Error("An active source event in this campaign is required.");
  return event;
};
export const cityStrings=(value,max=30)=>{
  if(!Array.isArray(value)||value.length>max||value.some(item=>typeof item!=="string"||item.length>500)) throw new Error("Invalid bounded string list.");
  return value;
};
export function requireCityRecord(db,guildId,kind,key){
  const row=db.getCityRecord(guildId,kind,cityKey(key));
  if(!row||row.status!=="active") throw new Error(`Active ${kind} not found in this campaign.`);
  return row;
}

export const requireWorldLocation=(db,guildId,key)=>{
  if(!db.getSimulationEntity(guildId,"location",key)) throw new Error("Location is not established in this campaign.");
};
