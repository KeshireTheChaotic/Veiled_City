/** Original fixed Session/native owner-source composition for Knowledge semantic candidates. */
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {overlapsOwnerActionTerminal} from './owner-action-terminal.js';
import {authoredTurnEnvelope} from './authored-turn-envelope.js';
import {createSemanticCandidateProof} from './frameworks/knowledge/public.js';
let candidateRules;
function candidates(){return candidateRules??=createSemanticCandidateProof({conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),overlapsOwnerActionTerminal:(...args)=>overlapsOwnerActionTerminal(...args),authoredTurnEnvelope:(...args)=>authoredTurnEnvelope(...args)});}
export const semanticCandidateOperations=candidates().semanticCandidateOperations;
export const semanticCandidateHash=candidates().semanticCandidateHash;
export function ownerSemanticSource(...args){return candidates().ownerSemanticSource(...args);}
export function assertSemanticCandidateProof(...args){return candidates().assertSemanticCandidateProof(...args);}
export function assertCanonProposalProof(...args){return candidates().assertCanonProposalProof(...args);}
