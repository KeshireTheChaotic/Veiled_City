import {nativeWorldAuthoring} from '../../frameworks/daggerheart/public.js';
import {worldAuthoringContext} from '../../frameworks/world/public.js';
/** Native environment provenance reads World's original verified authoring context; World keeps every authorship rule. */
export function connectNativeWorldAuthoring(){return nativeWorldAuthoring.bind({verifiedWorldAuthoringContext:worldAuthoringContext.verifiedWorldAuthoringContext});}

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

import {nativeWorldEvents} from '../../frameworks/daggerheart/public.js';
import {indexWorldEvent,cityAudit,cityKey,cityObject} from '../../frameworks/world/public.js';
export function connectNativeWorldEvents(){return nativeWorldEvents.bind({indexWorldEvent,cityAudit,cityKey,cityObject});}
import {nativeWorldSource} from '../../frameworks/daggerheart/public.js';
import {requireCitySource} from '../../frameworks/world/public.js';
export function connectNativeWorldSource(){return nativeWorldSource.bind({requireCitySource});}

import {nativeNpcAvailability} from '../../frameworks/daggerheart/public.js';
import {assertNpcAvailability} from '../../frameworks/world/public.js';
export function connectNativeNpcAvailability(){return nativeNpcAvailability.bind(assertNpcAvailability);}

import {nativeWorldAutonomy} from '../../frameworks/daggerheart/public.js';
import {worldAutonomousSource} from '../../frameworks/world/public.js';
/** Pass World's original autonomous authority, entity creation and input key to native rules unchanged. */
export function connectNativeWorldAutonomy(){return nativeWorldAutonomy.bind({worldAuthority:worldAutonomousSource.worldAuthority,establishNarrativeEntity:worldAutonomousSource.establishNarrativeEntity,worldInputKey:worldAutonomousSource.worldInputKey});}
