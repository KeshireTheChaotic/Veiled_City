/** Intent's original authored-text interpretation and declaration capture, provided by its composing module at load; Intent keeps every language rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentPlayerLanguage=createFunctionPort(['interpretAuthoredText','captureDeclaration'],{code:'INTENT_PLAYER_LANGUAGE_COMPOSITION',label:'Intent player language'});
