import {narrativeKnowledgeDisclosure} from './contracts/knowledge-disclosure.js';
const {factVisibleTo,objectiveEvidence,evidenceType}=narrativeKnowledgeDisclosure;
/** Native creative-GM packet: camera != character position; no secrets, effects, or model-issued authority. */
import {narrativeSessionScene} from './contracts/session-scene.js';
const {currentScene,scenePresence,lastVerifiedCharacterPresence}=narrativeSessionScene;
import {narrativeSessionPrincipal} from './contracts/session-principal.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {narrativeBridgeSessionSources} from './contracts/bridge-sources.js';
function assemblyOrientation(...args){return narrativeBridgeSessionSources.assemblyOrientation(...args);}


import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './scene-fiction-context.js';
import {narrativePublicationProtectedScope} from './contracts/publication-protected-scope.js';
const {protectedPvpScope}=narrativePublicationProtectedScope;
import {narrativeWorldConstraints} from './contracts/world-constraints.js';
const {activeCityProxy}=narrativeWorldConstraints;
import {narrativeKnowledgeMemory} from './contracts/knowledge-memory.js';
function selectDisclosedNarrativeMemory(...args){return narrativeKnowledgeMemory.selectDisclosedNarrativeMemory(...args);}
import {rankNarrativeMemory} from './memory-ranking.js';
import {speakerBrief} from './narrative-speakers.js';
import {directorBriefForAudience} from './narrative-director-source.js';
import {narrativeKnowledgeReaders} from './contracts/knowledge-readers.js';
function mentionsPublicIdentity(...args){return narrativeKnowledgeReaders.mentionsPublicIdentity(...args);}
import {registerNarrativeContext} from './audience-native-v9.js';
function assemblyWriterBrief(...args){return narrativeBridgeSessionSources.assemblyWriterBrief(...args);}
import {narrativeWorldIdentityOrigin} from './contracts/world-identity-origin.js';
function worldIdentityOrigin(...args){return narrativeWorldIdentityOrigin.worldIdentityOrigin(...args);}
import {narrativeWorldBackground} from './contracts/world-background.js';
function backgroundIdentityContext(...args){return narrativeWorldBackground.backgroundIdentityContext(...args);}
function openingEntryProjection(...args){return narrativeOpeningCohort.openingEntryProjection(...args);}
import {narrativeNativeEnvironment} from './contracts/environment-sources.js';
function nativeEnvironmentSituation(...args){return narrativeNativeEnvironment.nativeEnvironmentSituation(...args);}
import {narrativeOpeningCohort} from './contracts/opening-cohort.js';
function inspectOpeningCohortSource(...args){return narrativeOpeningCohort.inspectOpeningCohortSource(...args);}
import {createNarrativeContextBuilder} from './context-builder.js';
let contextBuilder;
function builder(){return contextBuilder??=createNarrativeContextBuilder({
 currentScene,scenePresence,lastVerifiedCharacterPresence,conversationPrincipal,assemblyOrientation,factVisibleTo,objectiveEvidence,evidenceType,
 sceneFictionHash:hash,sceneFictionFailure:fail,narrativeSourceVisible,protectedPvpScope,activeCityProxy,selectDisclosedNarrativeMemory,
 rankNarrativeMemory,speakerBrief,directorBriefForAudience,mentionsPublicIdentity,registerNarrativeContext,assemblyWriterBrief,
 worldIdentityOrigin,backgroundIdentityContext,openingEntryProjection,nativeEnvironmentSituation,inspectOpeningCohortSource
});}
export function narrativeVisible(...args){return builder().narrativeVisible(...args);}
export function buildNarrativeContext(...args){return builder().buildNarrativeContext(...args);}
import {narrativeAuthorityContextSource} from './contracts/root-sources.js';
// Provide this module's original narrative context functions to the fixed Narrative slot; no other authority is granted.
narrativeAuthorityContextSource.bind({narrativeVisible,buildNarrativeContext});
