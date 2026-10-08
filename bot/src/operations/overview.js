/**
 * GM dashboard read model.
 *
 * Keeps the `/vc-gm overview` query/aggregation logic out of the Discord
 * dispatcher and exposes one stable read model for future web/CLI surfaces.
 */
export function buildGmOverview(db,guildId){
  const session=db.getActiveSession(guildId);
  const campaign=db.getCampaign(guildId);
  const facts=db.listFactsForGM(guildId,{limit:8});
  const conflicts=db.listCanonConflicts(guildId);
  const proposals=db.listCanonProposals(guildId,{status:"actionable",limit:20});
  const clocks=db.clocksFor(guildId,{includeGM:true}).filter(c=>c.value>0&&c.value<c.max_value);
  const threads=db.listPublicPartyThreads(guildId).filter(t=>t.status==="active");
  const director=session?db.getDirectorState(session.id):null;
  const encounter=session?db.getCurrentEncounter(session.id):null;
  const roster=session?db.roster(session.id):[];
  const present=roster.filter(r=>["present","late","guest"].includes(r.presence));
  return {session,campaign,facts,conflicts,proposals,clocks,threads,director,encounter,roster,present,directorPaused:db.isDirectorPaused(guildId)};
}

export function formatGmOverview(model,{formatFact}){
  const {campaign,session,present,director,proposals,conflicts,clocks,threads,encounter,facts,directorPaused}=model;
  return [
    "**GM Campaign Overview**",
    `Campaign: **${campaign?.name||"Veiled City"}** • Fear **${campaign?.fear||0}/12** • Veil Exposure **${campaign?.veil_exposure||0}/6**`,
    session?`Session **${session.session_number}** • ${session.title||"Untitled"} • Present ${present.length}`:"No active session.",
    director?`Director: ${directorPaused?"PAUSED":"active"} • round ${director.round_number} • scene ${director.scene_number}${director.pending_pass?` • pending ${director.pending_pass.layer}`:""}`:"",
    `Attention: **${proposals.length}** canon proposal(s) • **${conflicts.length}** canon conflict(s) • **${clocks.length}** active clock(s) • **${threads.length}** active party thread(s)`,
    encounter?`Encounter: #${encounter.encounter_number} ${encounter.status}`:"Encounter: none",
    facts.length?`Recent facts:\n${facts.slice(0,5).map(formatFact).join("\n")}`:"Recent facts: none"
  ].filter(Boolean);
}
