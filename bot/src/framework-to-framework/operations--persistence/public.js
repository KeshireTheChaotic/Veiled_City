import {persistenceOperations} from '../../frameworks/persistence/public.js';
import {validateChannelRouting,instrumentSqlReads} from '../../frameworks/operations/public.js';
export function connectPersistenceOperations(){return persistenceOperations.bind({validateChannelRouting,instrumentSqlReads});}
