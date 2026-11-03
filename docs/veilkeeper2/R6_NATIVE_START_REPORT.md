# R6 — opt-in native start and read-only legacy repository (complete slice)

Delivered: bot/src/v2/legacy-readonly-repository.js opens the existing legacy database file read-only (never creating or migrating it) and exposes only getCharacter, getCampaign and listCharacters with the legacy row shapes and ordering. bot/src/v2/native-start.js startNative() starts the native path only when VK2_NATIVE=1 with VK2_NATIVE_DIR (new or empty directory), VK2_LEGACY_DB and DISCORD_TOKEN: it opens the read-only repository, builds createNativeRoot on a Discord client and logs in, closing root, repository and client in reverse order (once) on close or on any startup failure. package.json gained start:v2:native; the legacy ``start`` script and src/index.js are unchanged.

Tests: r6-legacy-readonly-repository 2 passed (row shapes/order, file hash unchanged, no create/write/memory), r6-native-start 4 passed (opt-in and config, non-empty directory refusal, composition and reverse close, failed-login cleanup), r6-native-root 2 passed (unchanged, re-run with the start tests). Fakes stand in for Discord, the repository and the root; no live login, database or send occurred.

Known issues: no natural-message intake, GM inference, startup session assembly or command registration in this entry point; legacy tables are read through two SQL statements copied from the legacy repository and must be re-verified if that schema changes; the owner private channel records must already exist in the native scene store.

Deferred: native message intake composition, live Discord/inference qualification (needs authorization), historical migration, recap/opening.
