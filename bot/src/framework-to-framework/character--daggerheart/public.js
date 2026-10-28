import {createCharacterAdvancementPort} from '../../frameworks/character/public.js';
import {createAdvancementRules} from '../../frameworks/daggerheart/public.js';

/** Existing character class/trait source -> native advancement rules -> character's consumer port. */
export function connectCharacterAdvancement(catalog){
  return createCharacterAdvancementPort(createAdvancementRules(catalog));
}

import {createCharacterCreationConsumer} from '../../frameworks/character/public.js';
import {createCharacterCreationRules} from '../../frameworks/daggerheart/public.js';
export function connectCharacterCreation({catalog,consumer=createCharacterCreationConsumer()}){return consumer.bind(createCharacterCreationRules(catalog));}

import {characterIncomingInjury} from '../../frameworks/character/public.js';
import {nativeIncomingInjurySource} from '../../frameworks/daggerheart/public.js';
/** Pass native rules' original visible incoming injury to Character unchanged. */
export function connectCharacterIncomingInjury(){return characterIncomingInjury.bind({visibleIncomingInjury:nativeIncomingInjurySource.visibleIncomingInjury});}
