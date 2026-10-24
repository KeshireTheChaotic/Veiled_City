import {connectPvpAgreements} from '../../framework-to-framework/daggerheart--narrative/public.js';
import {pvpAgreementConsumer} from '../../frameworks/narrative/public.js';
let composed=null;
/** Bind one fixed runtime component before services; no DB/client/model or game mutation. */
export function initializePvpAgreements(){return composed??=connectPvpAgreements({consumer:pvpAgreementConsumer,capabilities:pvpAgreementConsumer.sourceCapabilities()});}
