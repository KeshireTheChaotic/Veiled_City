/** Native creative-GM packet: camera != character position; no secrets, effects, or model-issued authority. */
import {currentScene,scenePresence,lastVerifiedCharacterPresence} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {assemblyOrientation} from './assembly-state.js';
import {factVisibleTo} from './disclosure-authority.js';
import {objectiveEvidence,evidenceType} from './epistemic.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail,narrativeSourceVisible} from './scene-fiction-context.js';
import {protectedPvpScope} from './pvp-output.js';
import {activeCityProxy} from './city-constraints.js';
import {selectDisclosedNarrativeMemory} from './narrative-memory.js';
import {rankNarrativeMemory} from './narrative-salience.js';
import {speakerBrief} from './narrative-speakers.js';
import {directorBriefForAudience} from './narrative-director-source.js';
import {narrativeKnowledgeReaders} from './frameworks/narrative/public.js';
function mentionsPublicIdentity(...args){return narrativeKnowledgeReaders.mentionsPublicIdentity(...args);}
import {registerNarrativeContext} from './audience-native-v9.js';
import {assemblyWriterBrief} from './assembly-context.js';
import {worldIdentityOrigin} from './world-authorship.js';
import {backgroundIdentityContext} from './world-background-identities.js';
import {openingEntryProjection} from './opening-entry-context.js';
import {narrativeNativeEnvironment} from './frameworks/narrative/public.js';
function nativeEnvironmentSituation(...args){return narrativeNativeEnvironment.nativeEnvironmentSituation(...args);}
import {inspectOpeningCohortSource} from './opening-cohort-state.js';
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
