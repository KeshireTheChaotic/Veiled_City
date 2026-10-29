import {createFunctionPort} from '../../../kernel/function-port.js';

/** Publication reads World's original proxy evidence for output validation. */
export const publicationWorldConstraints=createFunctionPort(['activeCityProxy'],{
 code:'PUBLICATION_WORLD_CONSTRAINTS_COMPOSITION',label:'Publication World constraints'
});
