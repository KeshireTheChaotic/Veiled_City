import {connectCharacterCreation} from '../../framework-to-framework/character--daggerheart/public.js';
import {characterCreationConsumer} from '../../frameworks/character/public.js';
let composed=null;
export function initializeCharacterCreation(){return composed??=connectCharacterCreation({consumer:characterCreationConsumer,catalog:characterCreationConsumer.sourceCapabilities()});}
