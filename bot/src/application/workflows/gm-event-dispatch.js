import {appendNativeResourceGmEvent} from '../../frameworks/daggerheart/public.js';
import {appendWorldGmEvent} from '../../frameworks/world/public.js';
import {appendKnowledgeGmEvent,gmEventVisibility} from '../../frameworks/knowledge/public.js';
import {assertProtectedModelEvents} from '../../frameworks/publication/public.js';
function fail(message){ throw new Error(message); }

/** Apply structured GM events while enforcing private-scene scope boundaries. */
export function applyGMEvents(db,guildId,sessionId,events=[],scope={mode:"party",actorUserId:null,actorCharacterId:null},provenance={}){
  assertProtectedModelEvents(db,guildId,events,scope);
  const results=[];
  for(const e of events||[]){
    try{
      if(!e?.type) fail("GM event is missing type.");
      const vis=gmEventVisibility(e,scope);
      switch(e.type){
        case "fact":
        case "clue":
        case "thread":
        case "canon":{
          appendKnowledgeGmEvent(db,guildId,sessionId,e,scope,provenance,vis,results);
          break;
        }
        case "clock_delta":
        case "veil_exposure_delta":{
          appendWorldGmEvent(db,guildId,e,scope,results);
          break;
        }
        case "resource_delta":{
          appendNativeResourceGmEvent(db,guildId,sessionId,e,scope,provenance,results);
          break;
        }
        case "npc_update":
        case "location_update":{
          appendKnowledgeGmEvent(db,guildId,sessionId,e,scope,provenance,vis,results);
          break;
        }
        case "relationship":
        case "log_only":{
          db.audit(guildId,sessionId,"ai","gm",e.type,e);
          results.push({type:e.type,ok:true});
          break;
        }
        default:
          fail(`Unsupported GM event type: ${e.type}.`);
      }
    }catch(err){
      results.push({type:e?.type||"unknown",ok:false,error:String(err.message||err),event:e});
    }
  }
  return results;
}
