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
