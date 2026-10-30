/** Original command receipt classification; unknown commands remain mutating. No adjudication or permission grant. */
const READ_ONLY=new Set([
  "admin:seed-package-preview","admin:seed-package-export",
  "intel:brief","story:brief",
  "roll:pending","roll:result",
  "campaign:status","session:assembly-status","session:roster","character:list","character:sheet","encounter:status","encounter:combatants",
  "party:status","relationship:list","handout:list","handout:evidence","player:accessibility","rules:ask","rules:rulings","downtime:status","downtime:long-project-status","canon:status","canon:conflicts","canon:proposals",
  "voice:status","admin:snapshots","admin:backups","admin:restore-preview","admin:doctor","admin:ledger","admin:seed-drafts","intel:recap","intel:clues","intel:facts","intel:caseboard",
  "story:ai-inbox","story:expansion-status","intel:discover","intel:continuity","intel:organizations","gm:overview","gm:fact-list","gm:npc-state","director:status","director:history","sim:status","sim:records",
  "city:status","city:events","city:preview","city:records","city:history","story:context","story:diagnose","story:clues","story:forecast","story:why","story:pacing-status","story:scene-view"
]);

export function commandKey(group,sub){ return `${group||""}:${sub||""}`; }

export function isMutatingCommand(group,sub){ return !READ_ONLY.has(commandKey(group,sub)); }
