import {byPrefix} from './reference-selection.js';
import {chunkDiscordLines} from './chunking.js';
import {NotFoundError} from '../../kernel/errors.js';
/** Original GM-only read displays; caller retains authorization, option-read order and receipt lifecycle. */
export async function handleAdministrativeReadCommand(interaction,{sub,store,backupId}){
  const db=store,chunkTextLines=chunkDiscordLines;
  if(sub==="backups"){
    const rows=db.listBackups(interaction.guildId,20);
    await interaction.reply({content:rows.length?`**Campaign Backups**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.label}** — ${r.created_at}${r.reason?` — ${r.reason}`:""}`).join("\n")}`.slice(0,1950):"No campaign backups yet.",ephemeral:true});
    return true;
  }
  if(sub==="restore-preview"){
    const row=byPrefix(db.listBackups(interaction.guildId,50),backupId);
    if(!row) throw new NotFoundError("Backup not found.");
    const preview=db.backupPreview(interaction.guildId,row.id);
    await interaction.reply({content:`**Restore Preview — ${row.label}**\nBackup: ${preview.counts.players} players • ${preview.counts.characters} characters • ${preview.counts.facts} facts • ${preview.counts.sessions} sessions\nCurrent: ${preview.current.players} players • ${preview.current.characters} characters • ${preview.current.facts}+ facts • ${preview.current.sessions} sessions\nRestore creates a pre-restore safety snapshot.`,ephemeral:true});
    return true;
  }
  if(sub==="ledger"){
    const rows=db.listMutationLedger(interaction.guildId,{limit:interaction.options.getInteger("limit")||30,sourceLayer:interaction.options.getString("layer")||""});
    const chunks=chunkTextLines(rows.length?["**Authoritative Mutation Ledger**",...rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.mutation_type}** • ${r.source_layer} • confidence ${r.confidence}% • ${r.created_at}\n  ${r.rationale||r.entity_key||"No rationale recorded."}`)]:["No mutation-ledger entries recorded yet."]);
    await interaction.reply({content:chunks[0],ephemeral:true});
    for(const c of chunks.slice(1)) await interaction.followUp({content:c,ephemeral:true});
    return true;
  }
  if(sub==="snapshots"){
    const rows=db.listSnapshots(interaction.guildId,12);
    await interaction.reply({content:rows.length?`**Recent Snapshots**\n${rows.map(r=>`• \`${r.id.slice(0,8)}\` **${r.label}** — ${r.reason||""} — ${r.created_at}`).join("\n")}`.slice(0,1950):"No snapshots yet.",ephemeral:true});
    return true;
  }
  return false;
}
