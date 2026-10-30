import {assertCommandReceiptStore} from '../../frameworks/discord/public.js';
import {createCommandReceiptStore} from '../../frameworks/persistence/public.js';
/** Exact command receipt boundary; no new database, SQL, commit, audience or actor policy. */
export function connectDiscordCommandReceipts(db){return assertCommandReceiptStore(createCommandReceiptStore(db));}

import {assertPlayerSettingsStore} from '../../frameworks/discord/public.js';
import {createPlayerSettingsStore} from '../../frameworks/persistence/public.js';
export function connectDiscordPlayerSettings(db){return assertPlayerSettingsStore(createPlayerSettingsStore(db));}
