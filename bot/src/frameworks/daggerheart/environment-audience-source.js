/** One original native audience service; no DB, provider or world mutation during composition. */
import {createEnvironmentAudienceRules} from './environment-audience-rules.js';
import {nativeEnvironmentNarrative} from './contracts/environment-narrative.js';
import {nativeEnvironmentSession} from './contracts/environment-session.js';
export const {assertEnvironmentAudience}=createEnvironmentAudienceRules({capabilities:{narrativeSourceVisible:(...args)=>nativeEnvironmentNarrative.narrativeSourceVisible(...args),conversationPrincipal:(...args)=>nativeEnvironmentSession.conversationPrincipal(...args),currentScene:(...args)=>nativeEnvironmentSession.currentScene(...args),scenePresence:(...args)=>nativeEnvironmentSession.scenePresence(...args)}});
