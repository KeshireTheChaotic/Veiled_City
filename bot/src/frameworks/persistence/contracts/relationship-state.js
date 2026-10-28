import {createFunctionPort} from '../../../kernel/function-port.js';

/** Persistence delegates relationship keys, state updates and projections to Knowledge. */
export const persistenceRelationshipState=createFunctionPort(['updateRelationshipDimensions','relationshipPairKey','relationshipProjection'],{
 code:'PERSISTENCE_RELATIONSHIP_STATE_COMPOSITION',label:'Persistence Knowledge relationship state'
});
