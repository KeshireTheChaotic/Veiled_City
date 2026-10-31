import {assertCommandReceiptStore} from '../../frameworks/discord/public.js';
import {createCommandReceiptStore} from '../../frameworks/persistence/public.js';
/** Exact command receipt boundary; no new database, SQL, commit, audience or actor policy. */
export function connectDiscordCommandReceipts(db){return assertCommandReceiptStore(createCommandReceiptStore(db));}

import {assertPlayerSettingsStore} from '../../frameworks/discord/public.js';
import {createPlayerSettingsStore} from '../../frameworks/persistence/public.js';
export function connectDiscordPlayerSettings(db){return assertPlayerSettingsStore(createPlayerSettingsStore(db));}

import {assertAdministrativeReadStore} from '../../frameworks/discord/public.js';
import {createAdministrativeReadStore} from '../../frameworks/persistence/public.js';
export function connectDiscordAdministrativeReads(db){return assertAdministrativeReadStore(createAdministrativeReadStore(db));}

import {assertCampaignStatusStore} from '../../frameworks/discord/public.js';
import {createCampaignStatusStore} from '../../frameworks/persistence/public.js';
export function connectDiscordCampaignStatus(db){return assertCampaignStatusStore(createCampaignStatusStore(db));}

import {assertCampaignConfigurationStore} from '../../frameworks/discord/public.js';
import {createCampaignConfigurationStore} from '../../frameworks/persistence/public.js';
export function connectDiscordCampaignConfiguration(db){return assertCampaignConfigurationStore(createCampaignConfigurationStore(db));}

import {assertGmFactReadStore} from '../../frameworks/discord/public.js';
import {createGmFactReadStore} from '../../frameworks/persistence/public.js';
export function connectDiscordGmFactReads(db){return assertGmFactReadStore(createGmFactReadStore(db));}

import {assertGmNpcReadStore} from '../../frameworks/discord/public.js';
import {createGmNpcReadStore} from '../../frameworks/persistence/public.js';
export function connectDiscordGmNpcReads(db){return assertGmNpcReadStore(createGmNpcReadStore(db));}

import {assertPartyStatusStore} from '../../frameworks/discord/public.js';
import {createPartyStatusStore} from '../../frameworks/persistence/public.js';
export function connectDiscordPartyStatus(db){return assertPartyStatusStore(createPartyStatusStore(db));}

import {assertDirectorHistoryStore} from '../../frameworks/discord/public.js';
import {createDirectorHistoryStore} from '../../frameworks/persistence/public.js';
export function connectDiscordDirectorHistory(db){return assertDirectorHistoryStore(createDirectorHistoryStore(db));}

import {assertDirectorStatusStore} from '../../frameworks/discord/public.js';
import {createDirectorStatusStore} from '../../frameworks/persistence/public.js';
export function connectDiscordDirectorStatus(db){return assertDirectorStatusStore(createDirectorStatusStore(db));}

import {hasGmAccess} from '../../frameworks/discord/public.js';
import {createGmAccessStore} from '../../frameworks/persistence/public.js';
/** Exact original GM predicate with lazy same-DB lookup; no new authorization policy. */
export function isGm(db,interaction){return hasGmAccess(createGmAccessStore(db),interaction);}

import {assertRulesRulingReadStore} from '../../frameworks/discord/public.js';
import {createRulesRulingReadStore} from '../../frameworks/persistence/public.js';
export function connectDiscordRulesRulings(db){return assertRulesRulingReadStore(createRulesRulingReadStore(db));}

import {assertCharacterListStore} from '../../frameworks/discord/public.js';
import {createCharacterListStore} from '../../frameworks/persistence/public.js';
export function connectDiscordCharacterList(db){return assertCharacterListStore(createCharacterListStore(db));}

import {assertCanonReadStore} from '../../frameworks/discord/public.js';
import {createCanonReadStore} from '../../frameworks/persistence/public.js';
export function connectDiscordCanonReads(db){return assertCanonReadStore(createCanonReadStore(db));}
