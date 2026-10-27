import {connectCharacterWorldEvents} from '../../framework-to-framework/character--world/public.js';
/** Fixed bootstrap wiring of World's original event index into Character; no state writes. */
export function initializeCharacterWorldEvents(){return connectCharacterWorldEvents();}
