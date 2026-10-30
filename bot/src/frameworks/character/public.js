export {safeText,safeStem} from './file-names.js';
export {normalizeNarrativeMarkdown,narrativeRelativePath} from './narrative-text.js';
export {createCharacterAdvancementPort} from './contracts/advancement.js';

export {createCharacterCreationConsumer,characterCreationConsumer} from './contracts/creation.js';
export {createCharacterWorldEventsConsumer,characterWorldEvents} from './contracts/world-events.js';
export {createCharacterSessionConsumer,characterSession} from './contracts/session.js';

export {characterWorldObservation,characterIncomingInjury,characterObservationSource} from './contracts/observation.js';

export {saveVisibleCharacterFacts,saveCharacterSelfDescription,renderCharacterSelfDescription,characterSelfDescriptionForQuery,captureDepartureWitnesses,recordCharacterPerceptions,observationQueries,ambientWorldQueries,renderObservation} from './observation.js';
