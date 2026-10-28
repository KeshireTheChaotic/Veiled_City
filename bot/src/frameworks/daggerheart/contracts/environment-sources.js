/** Native environment rules reach other frameworks' original functions, and legacy native peers, only through these fixed ports. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const nativeWorldAuthoring=createFunctionPort(['verifiedWorldAuthoringContext','worldIdentityOrigin'],{code:'NATIVE_WORLD_AUTHORING_COMPOSITION',label:'Native World authoring context'});
export const nativeNarrativeAudience=createFunctionPort(['mintNarrativeAudience','revalidateNarrativeAudience'],{code:'NATIVE_NARRATIVE_AUDIENCE_COMPOSITION',label:'Native narrative audience'});
export const nativeArbitrationOrigin=createFunctionPort(['inspectArbitrationOrigin'],{code:'NATIVE_ARBITRATION_ORIGIN_COMPOSITION',label:'Native arbitration origin'});
/** Legacy native modules that stay at their root paths provide these when they load. */
export const nativeGmOpportunityPeer=createFunctionPort(['nativeGmOpportunity'],{code:'NATIVE_ENVIRONMENT_PEER_COMPOSITION',label:'Native GM opportunity peer'});
export const reservedCampaignFearPeer=createFunctionPort(['reservedCampaignFear'],{code:'NATIVE_ENVIRONMENT_PEER_COMPOSITION',label:'Native campaign Fear peer'});
export const doorChainSituationPeer=createFunctionPort(['nativeEnvironmentDoorChainSituation'],{code:'NATIVE_ENVIRONMENT_PEER_COMPOSITION',label:'Native door chain situation peer'});
export const imagingSituationPeer=createFunctionPort(['nativeEnvironmentImagingSituation'],{code:'NATIVE_ENVIRONMENT_PEER_COMPOSITION',label:'Native imaging situation peer'});
