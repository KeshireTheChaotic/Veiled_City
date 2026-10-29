/** Original fixed Session/native owner-source composition for Knowledge semantic candidates. */
function conversationPrincipal(...args){return knowledgeSessionScene.conversationPrincipal(...args);}
import {knowledgeSessionScene} from './contracts/session-scene.js';
function currentScene(...args){return knowledgeSessionScene.currentScene(...args);}
import {knowledgeSessionOwnerTerminal} from './contracts/session-owner-terminal.js';
function overlapsOwnerActionTerminal(...args){return knowledgeSessionOwnerTerminal.overlapsOwnerActionTerminal(...args);}
import {knowledgeIntentAuthoredTurn} from './contracts/intent-authored-turn.js';
function authoredTurnEnvelope(...args){return knowledgeIntentAuthoredTurn.authoredTurnEnvelope(...args);}
import {createSemanticCandidateProof} from './semantic-candidate-source.js';
let candidateRules;
function candidates(){return candidateRules??=createSemanticCandidateProof({conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args),authoredTurnEnvelope:(...args)=>authoredTurnEnvelope(...args)});}
export const semanticCandidateOperations=candidates().semanticCandidateOperations;
export const semanticCandidateHash=candidates().semanticCandidateHash;
export function ownerSemanticSource(...args){return candidates().ownerSemanticSource(...args);}
export function assertSemanticCandidateProof(...args){return candidates().assertSemanticCandidateProof(...args);}
export function assertCanonProposalProof(...args){return candidates().assertCanonProposalProof(...args);}
