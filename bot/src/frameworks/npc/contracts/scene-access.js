/** Fixed original source capability; no new evidence, awareness or disclosure entitlement. */
export function createNpcSceneAccessConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native sceneAccess function required.');if(source&&source!==native)throw new Error('NPC sceneAccess replacement forbidden.');source=native;return this;},
 sceneAccess(...args){if(!source)throw Object.assign(new Error('NPC sceneAccess source has not been composed.'),{code:'NPC_OBSERVATION_COMPOSITION'});return source(...args);}
});}
export const npcSceneAccess=createNpcSceneAccessConsumer();
