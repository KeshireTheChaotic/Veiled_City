/** Original proxy packet display only; callers retain assignment, knowledge and private delivery authority. */
export function npcControlLabel(level){
  return {portrayal:"Portrayal only",tactical:"Tactical",full_npc:"Full NPC"}[level]||level;
}

export function formatNpcProxyPacket(proxy,{offered=false}={}){
  const p=proxy.player_packet||{};
  const list=(title,items)=>Array.isArray(items)&&items.length?`\n**${title}**\n${items.map(x=>`- ${x}`).join("\n")}`:"";
  const controls={
    portrayal:"You control this NPC's dialogue, demeanor, social choices, and portrayal. Veilkeeper retains tactics/mechanics unless the GM explicitly expands your authority.",
    tactical:"You control this NPC's dialogue, movement, listed abilities, and tactical choices. Veilkeeper adjudicates mechanics, dice, consequences, and the rest of the world.",
    full_npc:"You control this NPC's voluntary decisions, dialogue, movement, tactics, and use of listed capabilities. You still control only this NPC—not the GM, other NPCs, world truth, or campaign state."
  };
  const dos=[
    "Portray the assigned NPC consistently with this packet and what they legitimately learn during play.",
    "Pursue the listed objective as strongly or cautiously as makes sense for the NPC.",
    "Use only the capabilities, resources, contacts, and knowledge supplied here or legitimately gained in-scene.",
    "State the NPC's intended actions clearly; Veilkeeper resolves mechanics and consequences.",
    "Ask Veilkeeper or the human GM when the packet does not establish what the NPC knows or can do.",
    "Keep NPC-private information private until the NPC deliberately reveals it or events expose it."
  ];
  const donts=[
    "Do not use player/OOC knowledge, GM information, or another character's private information unless this NPC independently knows it.",
    "Do not invent new powers, equipment, minions, contracts, immunities, escape routes, or faction authority.",
    "Do not dictate a PC's thoughts, dialogue, choices, damage, death, or outcome; declare only what this NPC attempts.",
    "Do not alter clocks, facts, relationships, resources, mystery answers, or campaign state directly.",
    "Do not reveal hidden faction plans, future scenes, mystery solutions, or unrelated NPC secrets that are not explicitly in this packet.",
    "Do not override Veilkeeper's deterministic dice/mechanical adjudication or treat disagreement as permission to retcon an outcome.",
    "Do not permanently kill, retire, transform, redeem, or remove this NPC from the campaign unless play mechanics or the human GM explicitly authorize it."
  ];
  return [
    `# VEILED CITY — NPC PROXY PACKAGE`,
    `**NPC:** ${proxy.npc_name}`,
    `**Control:** ${npcControlLabel(proxy.control_level)}`,
    `**Status:** ${offered?"Offered — not active until claimed":"Active"}`,
    controls[proxy.control_level]||"",
    p.public_identity?`\n**Who You Are**\n${p.public_identity}`:"",
    p.portrayal?`\n**Portrayal**\n${p.portrayal}`:"",
    p.current_objective?`\n**Current Objective**\n${p.current_objective}`:"",
    list("What This NPC Knows",p.known_information),
    list("Relevant Relationships",p.relationships),
    list("Capabilities You May Use",p.capabilities),
    list("Limits / Vulnerabilities",p.limitations),
    list("Scene Cues",p.scene_cues),
    `\n## DO`,dos.map(x=>`- ${x}`).join("\n"),
    `\n## DON'T`,donts.map(x=>`- ${x}`).join("\n"),
    offered?`\n**To accept:** \`/vc-npc claim npc:${proxy.npc_name}\`\n**To decline:** \`/vc-npc decline npc:${proxy.npc_name}\``:
      `\nWhen posting as this NPC, prefix with \`${proxy.npc_name}:\` or \`[${proxy.npc_name}]\` if you also control another character. If this is your only active role, ordinary #the-table messages default to this NPC.`
  ].filter(Boolean).join("\n").slice(0,12000);
}
