import {assemblyPartsFor} from '../workflows/assembly-delivery.js';
import {sessionAssemblyDeliveryParts} from '../../frameworks/session/public.js';

/** Bind Application's original assembly part projection for Session's legacy delivery reader. */
export function initializeSessionAssemblyState(){return sessionAssemblyDeliveryParts.bind({assemblyPartsFor});}
