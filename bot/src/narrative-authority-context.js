import {narrativeKnowledgeDisclosure} from './frameworks/narrative/public.js';
const {factVisibleTo,objectiveEvidence,evidenceType}=narrativeKnowledgeDisclosure;
/** Native creative-GM packet: camera != character position; no secrets, effects, or model-issued authority. */
import {narrativeSessionScene} from './frameworks/narrative/public.js';
const {currentScene,scenePresence,lastVerifiedCharacterPresence}=narrativeSessionScene;
import {narrativeSessionPrincipal} from './frameworks/narrative/public.js';
function conversationPrincipal(...args){return narrativeSessionPrincipal.conversationPrincipal(...args);}
import {narrativeBridgeSessionSources} from './frameworks/narrative/public.js';
function assemblyOrientation(...args){return narrativeBridgeSessionSources.assemblyOrientation(...args);}


import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './frameworks/narrative/public.js';
import {protectedPvpScope} from './pvp-output.js';
import {narrativeWorldConstraints} from './frameworks/narrative/public.js';
const {activeCityProxy}=narrativeWorldConstraints;
import {narrativeKnowledgeMemory} from './frameworks/narrative/public.js';
function selectDisclosedNarrativeMemory(...args){return narrativeKnowledgeMemory.selectDisclosedNarrativeMemory(...args);}
import {rankNarrativeMemory} from './narrative-salience.js';
import {speakerBrief} from './narrative-speakers.js';
import {directorBriefForAudience} from './narrative-director-source.js';
import {narrativeKnowledgeReaders} from './frameworks/narrative/public.js';
function mentionsPublicIdentity(...args){return narrativeKnowledgeReaders.mentionsPublicIdentity(...args);}
import {registerNarrativeContext} from './audience-native-v9.js';
function assemblyWriterBrief(...args){return narrativeBridgeSessionSources.assemblyWriterBrief(...args);}
import {narrativeWorldIdentityOrigin} from './frameworks/narrative/public.js';
function worldIdentityOrigin(...args){return narrativeWorldIdentityOrigin.worldIdentityOrigin(...args);}
import {narrativeWorldBackground} from './frameworks/narrative/public.js';
function backgroundIdentityContext(...args){return narrativeWorldBackground.backgroundIdentityContext(...args);}
function openingEntryProjection(...args){return narrativeOpeningCohort.openingEntryProjection(...args);}
import {narrativeNativeEnvironment} from './frameworks/narrative/public.js';
function nativeEnvironmentSituation(...args){return narrativeNativeEnvironment.nativeEnvironmentSituation(...args);}
import {narrativeOpeningCohort} from './frameworks/narrative/public.js';
function inspectOpeningCohortSource(...args){return narrativeOpeningCohort.inspectOpeningCohortSource(...args);}
import {createNarrativeContextBuilder} from './frameworks/narrative/public.js';
let contextBuilder;
function builder(){return contextBuilder??=createNarrativeContextBuilder({
 currentScene,scenePresence,lastVerifiedCharacterPresence,conversationPrincipal,assemblyOrientation,factVisibleTo,objectiveEvidence,evidenceType,
 sceneFictionHash:hash,sceneFictionFailure:fail,narrativeSourceVisible,protectedPvpScope,activeCityProxy,selectDisclosedNarrativeMemory,
 rankNarrativeMemory,speakerBrief,directorBriefForAudience,mentionsPublicIdentity,registerNarrativeContext,assemblyWriterBrief,
 worldIdentityOrigin,backgroundIdentityContext,openingEntryProjection,nativeEnvironmentSituation,inspectOpeningCohortSource
});}
export function narrativeVisible(...args){return builder().narrativeVisible(...args);}
export function buildNarrativeContext(...args){return builder().buildNarrativeContext(...args);}
import {narrativeAuthorityContextSource} from './frameworks/narrative/public.js';
// Provide this module's original narrative context functions to the fixed Narrative slot; no other authority is granted.
narrativeAuthorityContextSource.bind({narrativeVisible,buildNarrativeContext});
