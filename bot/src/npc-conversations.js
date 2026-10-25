/** Original fixed source composition for autonomous NPC conversations. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { activeCityProxy, assertNpcAvailability } from "./city-constraints.js";
import { actorState, submitNpcAction } from "./simulation.js";
import { ContextPlanner } from "./context-planner.js";
import { sceneAccess } from "./scene-continuity.js";
import {createNpcConversations} from './frameworks/npc/public.js';
let conversationRules;
function conversations(){return conversationRules??=createNpcConversations({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args),activeCityProxy:(...args)=>activeCityProxy(...args),assertNpcAvailability:(...args)=>assertNpcAvailability(...args),actorState:(...args)=>actorState(...args),submitNpcAction:(...args)=>submitNpcAction(...args),ContextPlanner,sceneAccess:(...args)=>sceneAccess(...args)});}
export function resolveNpcConversation(...args){return conversations().resolveNpcConversation(...args);}
