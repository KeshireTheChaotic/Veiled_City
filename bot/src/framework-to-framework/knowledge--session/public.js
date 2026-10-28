import {knowledgeSessionScene,knowledgeSessionOwnerTerminal} from '../../frameworks/knowledge/public.js';
import {currentScene,sceneView,scenePresence,conversationPrincipal,overlapsOwnerActionTerminal} from '../../frameworks/session/public.js';
/** Pass Session's original scene and principal readers to Knowledge unchanged. */
export function connectKnowledgeSessionScene(){return knowledgeSessionScene.bind({currentScene,sceneView,scenePresence,conversationPrincipal});}
export function connectKnowledgeSessionOwnerTerminal(){return knowledgeSessionOwnerTerminal.bind({overlapsOwnerActionTerminal});}

import {knowledgePersonalContinuity,personalCharacter} from '../../frameworks/knowledge/public.js';
import {sessionPersonalContinuity} from '../../frameworks/session/public.js';
export function connectSessionPersonalContinuity(){return sessionPersonalContinuity.bind({personalCharacter,personalInbox:knowledgePersonalContinuity.personalInbox});}

import {factVisibleTo,mentionsPublicIdentity,evidenceType,activeEvidence,knowledgeHistoryReconciliationSource} from '../../frameworks/knowledge/public.js';
import {sessionKnowledgeSources} from '../../frameworks/session/public.js';
/** Pass Knowledge's original visibility, referent, evidence and history functions to Session unchanged. */
export function connectSessionKnowledgeSources(){return sessionKnowledgeSources.bind({factVisibleTo,mentionsPublicIdentity,evidenceType,activeEvidence,reconcileHistory:knowledgeHistoryReconciliationSource.reconcileHistory});}
