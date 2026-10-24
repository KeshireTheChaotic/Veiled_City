import {createEnvironmentProposalContracts} from './frameworks/daggerheart/public.js';
/** Code-owned proposal contracts only. Caller fields, printed text and this metadata grant no execution. */
import {environmentContracts as contracts} from './frameworks/daggerheart/environment-capability-catalog.js';


const {environmentProposalContract}=createEnvironmentProposalContracts(contracts);
export {environmentProposalContract};
