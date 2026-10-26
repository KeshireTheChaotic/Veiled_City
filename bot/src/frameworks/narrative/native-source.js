/** One Narrative-owned grant store; context composition is supplied once by its native caller. */
import {createNativeAudienceGrantAdapter} from './native-audience-grant.js';

export function createNativeNarrativeSource(){
  let contextFactory=null,source=null;
  return Object.freeze({
    provideContext(factory){
      if(typeof factory!=='function')throw new TypeError('Native narrative context factory required.');
      if(contextFactory&&contextFactory!==factory)throw new Error('Native narrative context replacement forbidden.');
      contextFactory=factory;
    },
    nativeSource(){
      if(!contextFactory)throw Object.assign(new Error('Native narrative context has not been composed.'),{code:'NARRATIVE_SOURCE_COMPOSITION'});
      if(!source){
        const context=contextFactory();
        if(typeof context?.narrativeSourceVisible!=='function')throw new TypeError('Native narrative source visibility required.');
        source=Object.freeze({...createNativeAudienceGrantAdapter(context),narrativeSourceVisible:context.narrativeSourceVisible,fail:context.sceneFictionFailure});
      }
      return source;
    }
  });
}
export const nativeNarrativeSource=createNativeNarrativeSource();
