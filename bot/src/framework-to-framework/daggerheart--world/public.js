import {createEnvironmentSceneRules} from '../../frameworks/daggerheart/public.js';
import {createEnvironmentSceneConsumer} from '../../frameworks/world/public.js';
/** Exact world/source capabilities feed native rules; world receives only their original checked service API. */
export function connectEnvironmentScene({capabilities,consumer=createEnvironmentSceneConsumer()}){
 const native=createEnvironmentSceneRules({capabilities});
 return consumer.bind(native);
}

import {nativeActorControl,nativeWorldProxy} from '../../frameworks/daggerheart/public.js';
import {activeCityProxy,worldNativeActorControl} from '../../frameworks/world/public.js';
/** Native classification and read-only current proxy evidence retain their original owners. */
export function connectWorldActorControl(){
 nativeWorldProxy.bind(activeCityProxy);
 return worldNativeActorControl.bind(nativeActorControl);
}

import {hasOwnerConsent} from '../../frameworks/daggerheart/public.js';
import {worldOwnerConsent} from '../../frameworks/world/public.js';
export function connectWorldOwnerConsent(){return worldOwnerConsent.bind(hasOwnerConsent);}

import {nativeWorldEstablishedEvidence} from '../../frameworks/daggerheart/public.js';
import {nativeEstablishedFact} from '../../frameworks/world/public.js';
export function connectNativeWorldEstablishedEvidence(){return nativeWorldEstablishedEvidence.bind(nativeEstablishedFact);}
