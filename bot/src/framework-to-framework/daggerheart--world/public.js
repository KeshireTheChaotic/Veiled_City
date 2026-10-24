import {createEnvironmentSceneRules} from '../../frameworks/daggerheart/public.js';
import {createEnvironmentSceneConsumer} from '../../frameworks/world/public.js';
/** Exact world/source capabilities feed native rules; world receives only their original checked service API. */
export function connectEnvironmentScene({capabilities,consumer=createEnvironmentSceneConsumer()}){
 const native=createEnvironmentSceneRules({capabilities});
 return consumer.bind(native);
}
