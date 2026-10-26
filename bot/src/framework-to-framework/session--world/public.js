import {createSessionWorldEventConsumer} from '../../frameworks/session/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
/** Pass the native issuer without changing source, audience, transaction, result or error. */
export function connectSessionWorldEvents({consumer=createSessionWorldEventConsumer(),source=indexWorldEvent}={}){return consumer.bind(source);}

import {conversationPrincipal} from '../../frameworks/session/public.js';
import {worldConversationPrincipal} from '../../frameworks/world/public.js';
export function connectWorldPrincipal(){return worldConversationPrincipal.bind(conversationPrincipal);}

import {sessionSceneWorldSources} from '../../frameworks/session/public.js';
import {cityObject,cityKey,cityVisibility,cityAudit,requireCitySource,activeCityProxy} from '../../frameworks/world/public.js';
export function connectSessionSceneWorld(){return sessionSceneWorldSources.bind({cityObject,cityKey,cityVisibility,cityAudit,requireCitySource,activeCityProxy});}
