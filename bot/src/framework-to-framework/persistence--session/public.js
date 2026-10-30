import {persistenceSessionArchive} from '../../frameworks/persistence/public.js';
import {archiveScenePresence} from '../../frameworks/session/public.js';
export function connectPersistenceSessionArchive(){return persistenceSessionArchive.bind({archiveScenePresence});}
