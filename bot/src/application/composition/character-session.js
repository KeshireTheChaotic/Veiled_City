import {connectCharacterSession} from '../../framework-to-framework/character--session/public.js';
/** Fixed bootstrap wiring of Session's original scene and principal readers into Character; no state writes. */
export function initializeCharacterSession(){return connectCharacterSession();}
