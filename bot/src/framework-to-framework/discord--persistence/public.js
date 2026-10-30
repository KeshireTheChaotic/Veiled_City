import {assertCommandReceiptStore} from '../../frameworks/discord/public.js';
import {createCommandReceiptStore} from '../../frameworks/persistence/public.js';
/** Exact command receipt boundary; no new database, SQL, commit, audience or actor policy. */
export function connectDiscordCommandReceipts(db){return assertCommandReceiptStore(createCommandReceiptStore(db));}
