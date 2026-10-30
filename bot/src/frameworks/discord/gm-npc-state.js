import {NotFoundError} from '../../kernel/errors.js';
import {chunkDiscordLines} from './chunking.js';
export function assertGmNpcReadStore(store){
  if(['findNpcProfile','listNpcMemories','listNpcKnowledge','listNpcGoals'].some(name=>typeof store?.[name]!=='function'))throw new TypeError('GM cognition display requires the complete original read interface.');
  return store;
}
/** Original private display; Application retains its existing GM guard. */
export async function handleGmNpcStateCommand(interaction,{store}){
        const profile=store.findNpcProfile(interaction.guildId,interaction.options.getString("npc",true));
        if(!profile) throw new NotFoundError("NPC cognition profile not found. Run /vc-admin seed-data or use the NPC in play first.");
        const memories=store.listNpcMemories(interaction.guildId,profile.npc_key,{status:"active",limit:20});
        const knowledge=store.listNpcKnowledge(interaction.guildId,profile.npc_key,{limit:30});
        const goals=store.listNpcGoals(interaction.guildId,profile.npc_key,{limit:20});
        const lines=[
          `**NPC Cognition — ${profile.display_name}**`,
          `${profile.role||"Role unspecified"} • activity: **${profile.activity_tier}** • source: ${profile.source}`,
          profile.public_identity?`Public identity: ${profile.public_identity}`:"",
          profile.portrayal?`Portrayal: ${profile.portrayal}`:"",
          `Decision profile: ${JSON.stringify(profile.decision_profile||{})}`,
          profile.knowledge_boundaries?.length?`Knowledge boundaries: ${profile.knowledge_boundaries.join("; ")}`:"Knowledge boundaries: none recorded",
          "**Active Goals**",
          ...(goals.length?goals.map(g=>`• [${g.priority}] **${g.title||g.goal_key}** (${g.horizon}/${g.status}) — ${g.objective}`):["• none"]),
          "**Knowledge / Beliefs**",
          ...(knowledge.length?knowledge.map(k=>`• **${k.belief_state}** ${k.knowledge_key} (${k.confidence}%)${k.is_secret?" • secret":""} — ${k.content}`):["• none"]),
          "**Memories**",
          ...(memories.length?memories.map(m=>`• **${m.memory_type}** [importance ${m.importance}, confidence ${m.confidence}] — ${m.content}`):["• none"])
        ].filter(Boolean);
        const chunks=chunkDiscordLines(lines);
        await interaction.reply({content:chunks[0],ephemeral:true}); for(const chunk of chunks.slice(1)) await interaction.followUp({content:chunk,ephemeral:true}); return true;
      }
