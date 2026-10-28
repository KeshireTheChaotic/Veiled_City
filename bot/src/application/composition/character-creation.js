import {connectCharacterCreation,connectCharacterIncomingInjury} from '../../framework-to-framework/character--daggerheart/public.js';
import {characterCreationConsumer} from '../../frameworks/character/public.js';
let composed=null;
export function initializeCharacterCreation(){connectCharacterIncomingInjury();return composed??=connectCharacterCreation({consumer:characterCreationConsumer,catalog:characterCreationConsumer.sourceCapabilities()});}