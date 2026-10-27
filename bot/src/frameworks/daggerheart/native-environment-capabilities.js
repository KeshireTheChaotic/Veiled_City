import {createEnvironmentProposalContracts} from './environment-capabilities.js';
/** Code-owned proposal contracts only. Caller fields, printed text and this metadata grant no execution. */
import {environmentContracts as contracts} from './environment-capability-catalog.js';


const {environmentProposalContract}=createEnvironmentProposalContracts(contracts);
export {environmentProposalContract};
