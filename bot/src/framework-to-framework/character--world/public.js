import {characterWorldEvents} from '../../frameworks/character/public.js';
import {indexWorldEvent} from '../../frameworks/world/public.js';
/** Pass World's original event index to Character unchanged. */
export function connectCharacterWorldEvents(){return characterWorldEvents.bind(indexWorldEvent);}
