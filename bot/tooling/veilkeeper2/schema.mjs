import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {effectiveSchema} from './schema-audit.mjs';
const read=relative=>fs.readFileSync(new URL(relative,import.meta.url),'utf8');
const sql=read('../../sql/schema.sql'),migration=read('../../src/frameworks/persistence/database.js');
const result=effectiveSchema(sql,migration);
const sha=value=>createHash('sha256').update(value).digest('hex');
const groups={
  principals:['players','session_characters','session_presence','npc_proxies'],
  campaign:['campaigns','sessions','character_drafts','characters','levelup_drafts'],
  knowledge:['facts','reference_entries','handouts','character_gm_hooks','character_narratives','canon_events','canon_proposals','canon_conflicts','relationships','relationship_hook_imports'],
  npc:['npc_profiles','npc_goals','npc_knowledge','npc_memories'],
  world:['world_events','world_event_links','city_calendar','city_edges','city_records','city_schedule','district_locations','clocks','threads','simulation_clock','simulation_entities','simulation_records','director_history'],
  rules:['rolls','rules_rulings','encounters','encounter_combatants','encounter_aftermath','downtime_cycles','downtime_projects'],
  publication:['messages','turn_attempts','publication_outbox','published_messages','operation_receipts','mutation_ledger','audit_log'],
  archive:['campaign_backups','campaign_snapshots','seed_catalog','seed_documents','seed_runs']
};
const maps=result.tables.map(table=>{
  const owners=Object.entries(groups).filter(([,names])=>names.includes(table.name)).map(([owner])=>owner);
  if(owners.length!==1)throw new Error(`Missing/ambiguous table disposition: ${table.name}`);
  return {...table,destination:`v2/persistence/${owners[0]}`,migration:'read-only import preserving every original column and original primary key before explicit typed projections',primaryKey:table.columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name),scopeColumns:table.columns.filter(c=>/guild|visibility|subject|owner|discord_user|actor|control|source|provenance|status|receipt/.test(c.name)).map(c=>c.name),deletionAuthorized:false};
});
const out={baseline:'1ba6c7e15db1a66ba34b36336f31437beffe44d6',sourceHashes:{schema:sha(sql),migrateSchemaModule:sha(migration)},...result,tables:maps,nonColumnMigrations:[
  {source:'bot/src/frameworks/persistence/database.js:96-115',operation:'threads global ID to (guild_id,id) primary key',mapping:'preserve IDs and visibility; distinguish same ID in separate campaigns',status:'R7 dry-run required'},
  {source:'bot/src/frameworks/persistence/database.js:116-123',operation:'relationship dimension backfill into simulation_entities',mapping:'preserve original relationship and dimension source; avoid duplicate backfill',status:'R7 dry-run required'},
  {source:'bot/src/frameworks/persistence/database.js:124',operation:'PRAGMA user_version=460',mapping:'record old user_version independently of new store version',status:'source inventory only'}
]};
fs.writeFileSync(new URL('../../../docs/veilkeeper2/EFFECTIVE_SCHEMA.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({tables:maps.length,addCalls:result.additions.length,columnsAddedBeyondSchemaSql:result.additions.filter(a=>!a.alreadyInBaseSchema).map(a=>`${a.table}.${a.column}`)},null,2));
