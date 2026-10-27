/** Bounded proposals sourced from authenticated GM-private hooks; proposals confer no authority. */
const text=n=>({type:'string',maxLength:n});
const closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const privateWorldSeedsSchema={type:'array',maxItems:4,items:closed({seed_ref:text(200),identity:closed({
  kind:{type:'string',enum:['npc','location','faction','organization','district']},key:text(100),name:text(160),summary:text(600),
  location_key:text(160),parent_location_key:text(160),role:text(160),aliases:{type:'array',maxItems:6,items:text(80)}})})};
export const PRIVATE_WORLD_SEED_INSTRUCTIONS='private_world_seeds may propose at most four bounded ordinary identities from the listed authenticated GM-private hooks. '
  +'Use exact seed_ref and native identity fields. These identities remain GM-private, with no participant knowledge, disclosure, canon override, PC effects, encounter stats or powers. '
  +'Do not copy an identity asserted in the current player source; that is not independent GM authorship. Do not narrate hidden seed content to any player. '
  +'A premise is not proof of its allegations; no new factions, clues or actors become public merely because a hook mentions them. Unsupported proposals remain private review.';
