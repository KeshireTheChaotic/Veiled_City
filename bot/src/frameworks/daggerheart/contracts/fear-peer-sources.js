import {createFunctionPort} from '../../../kernel/function-port.js';
/** Fixed original native callbacks while their implementations retain accountable migration paths. */
export const nativeFearRoundSource=createFunctionPort(["validatePvpRoundReceipt"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-rounds.js Fear source'});
export const nativeFearGateSource=createFunctionPort(["fearGateKey","pendingPvpFear"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-fear-gate.js Fear source'});
export const nativeFearTerminalSource=createFunctionPort(["settlePvpWindow"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-terminal.js Fear source'});
export const nativeFearAttackSource=createFunctionPort(["validatePvpAttackRoll"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-attacks.js Fear source'});
export const nativeFearDamageSource=createFunctionPort(["settlePvpDamageAction"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-damage.js Fear source'});
export const nativeFearBrawlSource=createFunctionPort(["assertBrawlFearOrder","orderedBrawlFear"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-brawl.js Fear source'});
export const nativeFearIncomingSource=createFunctionPort(["incomingAttackEvidence","rollAutonomousFearIncomingAttack"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pc-incoming.js Fear source'});
export const nativeFearSafetySource=createFunctionPort(["assertPvpSafety"],{code:'NATIVE_FEAR_PEER_COMPOSITION',label:'pvp-campaign-policy.js Fear source'});
