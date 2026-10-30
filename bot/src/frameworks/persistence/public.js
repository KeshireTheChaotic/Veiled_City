/** Public Persistence-owned fixed consumers; no database is opened by this module. */
export {persistenceRelationshipEvidence} from './contracts/relationship-evidence.js';
export {persistenceSourceEvidence} from './contracts/source-evidence.js';
export {persistenceRelationshipState} from './contracts/relationship-state.js';
export {persistenceArchiveProjection} from './contracts/archive-projection.js';
export {persistenceCityDue} from './contracts/city-due.js';
export {persistenceGmHookImport} from './contracts/gm-hook-import.js';

export {VeiledDB} from './database.js';
export {persistenceSessionArchive,persistenceKnowledgeProposal,persistenceOperations,persistenceNativeFear} from './contracts/database-domain-sources.js';

export {openDiagnosticSnapshot} from './diagnostic-snapshot.js';

export {createCommandReceiptStore} from './command-receipts.js';

export {createPlayerSettingsStore} from './player-settings.js';

export {createAdministrativeReadStore} from './administrative-reads.js';

export {createCampaignStatusStore} from './campaign-status.js';

export {createCampaignConfigurationStore} from './campaign-configuration.js';

export {createGmFactReadStore} from './gm-fact-reads.js';
