/** Existing exact stakes projection for already supported native feature reactions. */
import {nativeArbitrationFailure} from './native-failure.js';

const FEEDBACK='adversary:static-wraith:feedback';
const FEEDBACK_STAKES='On a failed Instinct reaction, mark 1 Stress and the electronic device shuts down until repaired or reset. On success it does not. Your roll is not assumed.';

export function createFeatureReactionStakes({isGroupFeature,groupFeatureStakes}){
  if(typeof isGroupFeature!=='function'||typeof groupFeatureStakes!=='function')throw new TypeError('Native group feature contract required.');
  return feature=>{
    if(isGroupFeature(feature))return groupFeatureStakes(feature);
    if(feature!==FEEDBACK)throw nativeArbitrationFailure('feature_reaction_stakes_adapter');
    return FEEDBACK_STAKES;
  };
}
