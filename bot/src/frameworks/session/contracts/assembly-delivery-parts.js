import {createFunctionPort} from '../../../kernel/function-port.js';

/** Session reads Application's original assembly-part keys for legacy delivery status. */
export const sessionAssemblyDeliveryParts=createFunctionPort(['assemblyPartsFor'],{
 code:'SESSION_ASSEMBLY_DELIVERY_PARTS_COMPOSITION',label:'Session assembly delivery parts'
});
