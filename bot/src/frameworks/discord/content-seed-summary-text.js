/** Original GM-facing content-seed completion summary. */
export function contentSeedSummaryText(counts){
  return [
    "**Content seed complete.** A pre-seed safety snapshot was created.",
    `Files imported: **${counts.files}** (shared **${counts.party}**, character-only **${counts.character}**, GM-only **${counts.gm}**).`,
    `Structured entries: **${counts.catalog}**; runtime entities: **${counts.entities}**; references: **${counts.references}**; narratives: **${counts.narratives}**.`,
    `New NPC profiles: **${counts.cognition?.profiles||0}**; binary files archived: **${counts.binary}**.`,
    `Bulk projections: **${counts.bulk.sources}** files / **${counts.bulk.entries}** entries; library entries: **${counts.bulk.library}**; review drafts: **${counts.bulk.drafts}**.`,
    `Missing dossier fields backfilled: **${counts.bulk.fields}**.`,
    "Review inferred/typed drafts with /vc-admin seed-drafts; use seed-edit, seed-add, seed-remove, seed-approve, or seed-reject.",
    `Existing files skipped: **${counts.skipped}**; changed sources requiring review: **${counts.changed}**.`,
    `Unmatched character files retained GM-only: **${counts.unmatched}**; narrative conflicts/oversize: **${counts.narrativeConflicts}**.`,
    "Existing campaign state is preserved. GM sources never become party knowledge or canon automatically."
  ].join("\n");
}
