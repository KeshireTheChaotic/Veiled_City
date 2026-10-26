/** One original autonomous conversation service; no eager DB/provider or gameplay work. */
import {createNpcConversations} from './conversations.js';
import {npcWorldConversations as world} from './contracts/world-conversations.js';
import {npcKnowledgePlanner} from './contracts/knowledge-planner.js';
import {npcSceneAccess} from './contracts/scene-access.js';
let rules;
function conversations(){return rules??=createNpcConversations({cityObject:(...args)=>world.cityObject(...args),cityKey:(...args)=>world.cityKey(...args),cityAudit:(...args)=>world.cityAudit(...args),requireCitySource:(...args)=>world.requireCitySource(...args),activeCityProxy:(...args)=>world.activeCityProxy(...args),assertNpcAvailability:(...args)=>world.assertNpcAvailability(...args),actorState:(...args)=>world.actorState(...args),submitNpcAction:(...args)=>world.submitNpcAction(...args),ContextPlanner:npcKnowledgePlanner.plannerClass(),sceneAccess:(...args)=>npcSceneAccess.sceneAccess(...args)});}
export function resolveNpcConversation(...args){return conversations().resolveNpcConversation(...args);}
