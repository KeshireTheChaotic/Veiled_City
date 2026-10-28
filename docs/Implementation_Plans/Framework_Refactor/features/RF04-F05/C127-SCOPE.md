# RF04-F05 C127 — World-owned city civic rules

Base 567c1305. The original civic implementation moved from root city-civic.js into frameworks/world/city-civic.js (imports now World-internal files; body unchanged) and is exported from the World public API. Root city-civic.js is a compatibility re-export that still binds worldCityCivicSource at load; city-groups.js and seed-drafts.js import from World public. No rule, check or state changed; no transition retired (city-civic.js location record remains while the root reader exists). Completion of Codex's uncommitted work. Seven batch failures were reproduced identically on committed 567c1305 files (historical body-hash and C120 hold tests) and are named as preexisting.

Rollback: Revert only the C127 commit: restore the civic implementation in root city-civic.js with its slot bind, remove frameworks/world/city-civic.js and its World public export, and restore city-groups.js and seed-drafts.js imports. No transitions retired.
