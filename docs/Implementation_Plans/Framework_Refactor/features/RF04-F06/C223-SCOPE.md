# C223 — Session scene compatibility consumers

Baseac48fe60. Original Session implementation/source unchanged. Application imports public; four consumer-owned fixed scene contracts/existing pair/bootstrap forward only observed functions. Preserve source/privacy/owner/presence/NPC observation/arrival logic and exact return/error behavior. Database archiveScenePresence keeps original root shim pending RF06 initialization audit. No new scene or observation authority. Fresh actual pair tests cover deterministic current scene, missing occupancy and empty presence. RF04 incomplete.

[
  {
    "owner": "intent",
    "names": [
      "currentScene",
      "recordScenePresence",
      "scenePresence",
      "sceneView"
    ],
    "consumers": [
      "bot/src/ai-intents.js",
      "bot/src/authored-candidates.js",
      "bot/src/authored-turn-envelope.js",
      "bot/src/movement-language.js",
      "bot/src/player-language.js",
      "bot/src/scene-intent-board.js",
      "bot/src/semantic-engagement.js",
      "bot/src/typed-intents.js"
    ],
    "pair": "intent--session"
  },
  {
    "owner": "narrative",
    "names": [
      "currentScene",
      "lastVerifiedCharacterPresence",
      "npcEvidenceActive",
      "sceneAccess",
      "scenePresence"
    ],
    "consumers": [
      "bot/src/gm-world-scope.js",
      "bot/src/narrative-authority-context.js",
      "bot/src/narrative-director-source.js",
      "bot/src/narrative-integrity.js",
      "bot/src/narrative-pvp.js",
      "bot/src/narrative-salience.js",
      "bot/src/narrative-speakers.js",
      "bot/src/nonmaterial-grammar.js",
      "bot/src/scene-description.js",
      "bot/src/scene-fiction-context.js"
    ],
    "pair": "narrative--session"
  },
  {
    "owner": "publication",
    "names": [
      "currentScene",
      "scenePresence"
    ],
    "consumers": [
      "bot/src/native-hook-output.js",
      "bot/src/native-outcome-output.js",
      "bot/src/native-publications.js",
      "bot/src/pvp-output.js"
    ],
    "pair": "publication--session"
  },
  {
    "owner": "discord",
    "names": [
      "currentScene"
    ],
    "consumers": [
      "bot/src/pvp-menu.js"
    ],
    "pair": "discord--session"
  }
]

C223 complete:26 non-database root scene consumers migrated; Application public and four consumer-owned fixed contracts/existing pairs/bootstrap. Session implementation/root/database archive path unchanged.26 consumer bodies identical excluding imports/fixed method bindings; syntax42/42. Fresh actual pairs4/4 passed522.4503ms: original current scene/missing-session behavior, absent presence where exposed, repeated binding. DB scene/clock rows fake; no occupancy writes/privacy/NPC observation/arrival/archive/SQLite proof.26 obsolete consumer transitions archived; database/root remain. Final architecture910modules,0unowned,3730imports,2cycles/largest78,995accepted legacy,0active/transition errors. Tests local/ignored. RF04 incomplete; RF06 calendar/scene/semantic database shim retirement deferred. Next exact phase RF04: migrate remaining Knowledge compatibility reader consumers, retaining database initialization paths until audited.
