import {createSessionWorldEventConsumer} from '../../frameworks/session/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
/** Pass the native issuer without changing source, audience, transaction, result or error. */
export function connectSessionWorldEvents({consumer=createSessionWorldEventConsumer(),source=indexWorldEvent}={}){return consumer.bind(source);}
