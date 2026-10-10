/** Executable inventory proving lexical helpers are hints or explicit native compatibility adapters. */
function fail(message){throw Object.assign(new Error(message),{code:"LEGACY_AUTHORITY"});}

export function auditLegacyLanguageAuthority(sources){
  for(const key of ["index","autonomous","sceneEntry","dialogue","candidates"])
    if(typeof sources?.[key]!=="string")fail(`Missing authority-audit source: ${key}`);
  const forbidden=[
    [sources.index,/route(?:Roll|Consent)Message\s*\(/,"general message intake invokes a lexical mechanical adapter"],
    [sources.autonomous,/worldRequirements\s*\(|interpretAuthoredText\s*\(/,"autonomous effects invoke player phrase classification"],
    [sources.index,/from ["']\.\/roll-language\.js["']|from ["']\.\/consent-language\.js["']/,"runtime intake imports lexical spend/consent routing"]
  ];
  for(const [source,pattern,reason] of forbidden)if(pattern.test(source))fail(reason);
  if(!/legacy_scene_entry_adapter/.test(sources.sceneEntry+sources.autonomous))fail("Reviewed legacy scene-entry adapter is missing.");
  if(!/candidate|nonbinding|pending/i.test(sources.candidates))fail("Authored candidates must remain nonbinding staged records.");
  if(!/utterance|speech|dialogue/i.test(sources.dialogue))fail("Dialogue helper scope is not documented as authored speech continuity.");
  return {authoritative_general_lexical_routes:0,
    compatibility_adapters:["legacy_scene_entry"],
    native_exact_adapters:["roll_owner_authorization","consent_terms_revision"],
    nonbinding_helpers:["response_obligation","invitation_hint","dialogue_capture","candidate_ooc_filter","location_resolution"],
    support_window:"Historical records remain readable; no historical prose is replayed as fresh authority."};
}
