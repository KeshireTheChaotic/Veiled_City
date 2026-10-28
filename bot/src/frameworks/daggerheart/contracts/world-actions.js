import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native rules ask World to run its original project, observation, simulation and identity functions; World keeps every rule. */
export const nativeWorldActions=createFunctionPort(['manageLongProject','projectPhaseRevision','renderWorldObservation','configureSimulationEntity','submitNpcAction','validateMinorIdentity','preflightNpcIdentity'],{code:'NATIVE_WORLD_ACTIONS_COMPOSITION',label:'Native world actions'});
