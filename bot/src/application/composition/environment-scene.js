import {connectEnvironmentScene} from '../../framework-to-framework/daggerheart--world/public.js';
import {environmentSceneConsumer} from '../../frameworks/world/public.js';
let composed=null;
/** Bootstrap-only fixed native/world composition. Constructs no database, provider, scene or client. */
export function initializeEnvironmentScene(){
 return composed??=connectEnvironmentScene({consumer:environmentSceneConsumer,capabilities:environmentSceneConsumer.sourceCapabilities()});
}
