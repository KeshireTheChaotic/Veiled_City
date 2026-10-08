PRAGMA foreign_keys = ON;

-- Full source archive: private unless explicitly classified as shared PLAYER content.
CREATE TABLE IF NOT EXISTS seed_documents (
  guild_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  encoding TEXT NOT NULL CHECK(encoding IN ('utf8','base64')),
  body TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('party','character','gm')),
  subject_character_id TEXT,
  imported_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,source_path),
  FOREIGN KEY(guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seed_catalog (
  guild_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  entry_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('party','character','gm')),
  subject_character_id TEXT,
  PRIMARY KEY(guild_id,source_path,entry_key),
  FOREIGN KEY(guild_id,source_path) REFERENCES seed_documents(guild_id,source_path) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaigns (
  guild_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Veiled City',
  play_channel_id TEXT,
  rules_channel_id TEXT,
  case_board_channel_id TEXT,
  journal_channel_id TEXT,
  known_npcs_channel_id TEXT,
  known_locations_channel_id TEXT,
  gm_log_channel_id TEXT,
  state_errors_channel_id TEXT,
  gm_role_id TEXT,
  response_mode TEXT NOT NULL DEFAULT 'assisted'
    CHECK(response_mode IN ('active','assisted','mention')),
  veil_exposure INTEGER NOT NULL DEFAULT 0 CHECK(veil_exposure BETWEEN 0 AND 6),
  fear INTEGER NOT NULL DEFAULT 0 CHECK(fear BETWEEN 0 AND 12),
  active_session_id TEXT,
  party_state_json TEXT NOT NULL DEFAULT '{"established":false,"name":"","members":[],"bonds":[]}',
  state_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  private_channel_id TEXT,
  accessibility_json TEXT NOT NULL DEFAULT
    '{"response_length":"standard","mechanics":"standard","screen_reader":false}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, discord_user_id),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  owner_user_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','reserve','guest','retired','dead')),
  is_guest INTEGER NOT NULL DEFAULT 0,
  character_json TEXT NOT NULL,
  death_session_id TEXT,
  retired_session_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_characters_owner
  ON characters(guild_id, owner_user_id, status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  title TEXT,
  assembly_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK(assembly_mode IN ('auto','already_together','shared_incident','common_client','crossed_cases','mutual_threat','faction_summons','chain_contacts','rescue','debt_favor','manual')),
  assembly_phase TEXT NOT NULL DEFAULT 'assembly'
    CHECK(assembly_phase IN ('assembly','converged','party')),
  assembly_plan_json TEXT NOT NULL DEFAULT '{}',
  director_state_json TEXT NOT NULL DEFAULT '{"version":1,"round_number":1,"acted_user_ids":[],"scene_number":1,"scene_label":"","pass_counts":{"round":0,"scene":0,"downtime":0},"pending_pass":null}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','ended')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  recap TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  UNIQUE(guild_id, session_number)
);

CREATE TABLE IF NOT EXISTS session_presence (
  session_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  presence TEXT NOT NULL DEFAULT 'present'
    CHECK(presence IN ('present','absent','late','left_early','guest')),
  absence_mode TEXT NOT NULL DEFAULT 'offscreen'
    CHECK(absence_mode IN ('offscreen','background','proxy')),
  proxy_user_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(session_id, discord_user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_characters (
  session_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  assignment_role TEXT NOT NULL DEFAULT 'primary'
    CHECK(assignment_role IN ('primary','guest','proxy')),
  control_policy TEXT NOT NULL DEFAULT 'player_only'
    CHECK(control_policy IN ('player_only','background_safe','proxy')),
  proxy_user_id TEXT,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TEXT,
  PRIMARY KEY(session_id, discord_user_id, character_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fact',
  fact_key TEXT NOT NULL,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL
    CHECK(visibility IN ('public','party','player','character','gm')),
  subject_user_id TEXT,
  subject_character_id TEXT,
  session_id TEXT,
  source TEXT NOT NULL DEFAULT 'gm',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_facts_visibility
  ON facts(guild_id, visibility, subject_user_id);

CREATE TABLE IF NOT EXISTS clocks (
  guild_id TEXT NOT NULL,
  clock_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  max_value INTEGER NOT NULL DEFAULT 6,
  visibility TEXT NOT NULL DEFAULT 'gm'
    CHECK(visibility IN ('public','party','player','character','gm')),
  subject_user_id TEXT,
  subject_character_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id, clock_key),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','resolved','failed','dormant')),
  visibility TEXT NOT NULL DEFAULT 'party'
    CHECK(visibility IN ('public','party','player','character','gm')),
  subject_user_id TEXT,
  subject_character_id TEXT,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,id),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reference_entries (
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('npc','location')),
  entity_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'party'
    CHECK(visibility IN ('public','party','player','character','gm')),
  subject_user_id TEXT,
  subject_character_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id, kind, entity_key),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS published_messages (
  guild_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id, surface, entity_key),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  discord_message_id TEXT,
  discord_user_id TEXT,
  speaker_name TEXT,
  character_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'party',
  subject_user_id TEXT,
  subject_character_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_recent ON messages(guild_id, id DESC);

CREATE TABLE IF NOT EXISTS rolls (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  discord_user_id TEXT NOT NULL,
  character_id TEXT,
  roll_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npc_proxies (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  npc_key TEXT NOT NULL,
  npc_name TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  control_level TEXT NOT NULL DEFAULT 'tactical'
    CHECK(control_level IN ('portrayal','tactical','full_npc')),
  status TEXT NOT NULL DEFAULT 'offered'
    CHECK(status IN ('offered','active','declined','released')),
  player_packet_json TEXT NOT NULL DEFAULT '{}',
  gm_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT,
  released_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id,npc_key)
);
CREATE INDEX IF NOT EXISTS idx_npc_proxies_user
  ON npc_proxies(session_id,discord_user_id,status);

CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  encounter_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','ended')),
  tier INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 4),
  pc_count INTEGER NOT NULL CHECK(pc_count >= 2),
  difficulty TEXT NOT NULL DEFAULT 'standard' CHECK(difficulty IN ('easy','standard','hard')),
  style TEXT NOT NULL DEFAULT 'balanced' CHECK(style IN ('balanced','boss','swarm','strike_team','hunt')),
  base_bp INTEGER NOT NULL,
  custom_adjustment_bp INTEGER NOT NULL DEFAULT 0,
  damage_boosted INTEGER NOT NULL DEFAULT 0,
  budget_bp INTEGER NOT NULL,
  spent_bp INTEGER NOT NULL DEFAULT 0,
  objective TEXT NOT NULL DEFAULT '',
  environment_name TEXT NOT NULL DEFAULT '',
  composition_json TEXT NOT NULL DEFAULT '[]',
  adjustment_json TEXT NOT NULL DEFAULT '[]',
  combat_state_json TEXT NOT NULL DEFAULT '{"spotlight":{"counts":{},"last_character_id":null}}',
  pc_start_state_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  ended_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id,encounter_number)
);
CREATE INDEX IF NOT EXISTS idx_encounters_session_status ON encounters(session_id,status);

-- v3.2.0: AI-assisted character creation drafts
CREATE TABLE IF NOT EXISTS character_drafts (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','accepted','discarded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_character_drafts_user ON character_drafts(guild_id,discord_user_id,status,created_at DESC);

-- v3.2.0: staged/confirmable Daggerheart level-ups
CREATE TABLE IF NOT EXISTS levelup_drafts (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  choices_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','applied','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_levelup_drafts_user ON levelup_drafts(guild_id,discord_user_id,status,created_at DESC);

-- v3.2.0: deterministic adversary combat state
CREATE TABLE IF NOT EXISTS encounter_combatants (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  base_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  tier INTEGER NOT NULL,
  instance_index INTEGER NOT NULL DEFAULT 1,
  difficulty INTEGER NOT NULL DEFAULT 10,
  major_threshold INTEGER,
  severe_threshold INTEGER,
  hp_current INTEGER NOT NULL DEFAULT 1,
  hp_max INTEGER NOT NULL DEFAULT 1,
  stress_current INTEGER NOT NULL DEFAULT 0,
  stress_max INTEGER NOT NULL DEFAULT 0,
  conditions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','defeated','escaped','removed')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_combatants_encounter ON encounter_combatants(encounter_id,status,display_name);

-- v3.2.0: logical campaign snapshots / rollback
CREATE TABLE IF NOT EXISTS campaign_snapshots (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  state_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_snapshots_guild ON campaign_snapshots(guild_id,created_at DESC);

-- v3.2.0: authoritative canon ledger and conflict queue
CREATE TABLE IF NOT EXISTS canon_events (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  canon_key TEXT NOT NULL,
  value TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'party' CHECK(visibility IN ('public','party','player','character','gm')),
  status TEXT NOT NULL DEFAULT 'current' CHECK(status IN ('current','superseded')),
  session_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'gm',
  source_id TEXT,
  provenance TEXT NOT NULL DEFAULT '',
  supersedes_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_canon_current ON canon_events(guild_id,canon_key,status,created_at DESC);

CREATE TABLE IF NOT EXISTS canon_conflicts (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  canon_key TEXT NOT NULL,
  existing_event_id TEXT,
  proposed_value TEXT NOT NULL,
  proposed_visibility TEXT NOT NULL DEFAULT 'party',
  session_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'ai',
  source_id TEXT,
  provenance TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved_existing','resolved_proposed','resolved_custom','dismissed')),
  resolved_value TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_canon_conflicts ON canon_conflicts(guild_id,status,created_at DESC);

-- v3.2.0: formal between-session downtime
CREATE TABLE IF NOT EXISTS downtime_cycles (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  source_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolving','resolved','cancelled')),
  label TEXT NOT NULL DEFAULT 'Downtime',
  notes TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  opened_by TEXT,
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_downtime_cycle ON downtime_cycles(guild_id,status,opened_at DESC);

CREATE TABLE IF NOT EXISTS downtime_projects (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT,
  character_id TEXT,
  project_type TEXT NOT NULL CHECK(project_type IN ('recovery','investigation','crafting','ritual','relationship','income','surveillance','research','project','other')),
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL DEFAULT 4,
  visibility TEXT NOT NULL DEFAULT 'party' CHECK(visibility IN ('public','party','player','character','gm')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','failed','cancelled')),
  result TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES downtime_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_downtime_projects ON downtime_projects(cycle_id,status,discord_user_id);

-- v3.2.0: persistent human GM rulings for rules desk precedence
CREATE TABLE IF NOT EXISTS rules_rulings (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  ruling_key TEXT NOT NULL,
  question TEXT NOT NULL,
  ruling TEXT NOT NULL,
  source_label TEXT NOT NULL DEFAULT 'GM RULING',
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  UNIQUE(guild_id,ruling_key)
);

-- v3.3.0: structured relationship graph
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  from_type TEXT NOT NULL CHECK(from_type IN ('character','npc','faction','location','entity','obligation')),
  from_key TEXT NOT NULL,
  from_label TEXT NOT NULL DEFAULT '',
  to_type TEXT NOT NULL CHECK(to_type IN ('character','npc','faction','location','entity','obligation')),
  to_key TEXT NOT NULL,
  to_label TEXT NOT NULL DEFAULT '',
  relationship_type TEXT NOT NULL DEFAULT 'contact',
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN -5 AND 5),
  visibility TEXT NOT NULL DEFAULT 'party' CHECK(visibility IN ('public','party','player','character','gm')),
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'gm',
  source_character_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  UNIQUE(guild_id,from_type,from_key,to_type,to_key,relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_relationships_graph ON relationships(guild_id,from_key,to_key,updated_at DESC);

CREATE TABLE IF NOT EXISTS relationship_hook_imports (
  character_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'v3.3.0_backfill',
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

-- v3.3.0: generated / curated evidence handouts
CREATE TABLE IF NOT EXISTS handouts (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'document',
  authority TEXT NOT NULL DEFAULT 'canonical' CHECK(authority IN ('canonical','partial','unreliable','illustrative')),
  visibility TEXT NOT NULL DEFAULT 'party' CHECK(visibility IN ('public','party','player','character','gm')),
  subject_user_id TEXT,
  subject_character_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  canonical_facts_json TEXT NOT NULL DEFAULT '[]',
  case_key TEXT NOT NULL DEFAULT '',
  npc_key TEXT NOT NULL DEFAULT '',
  location_key TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'human_gm',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_handouts_visible ON handouts(guild_id,status,visibility,created_at DESC);

-- v3.3.0: optional GM-confirmed encounter aftermath
CREATE TABLE IF NOT EXISTS encounter_aftermath (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','discarded')),
  draft_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_aftermath_status ON encounter_aftermath(guild_id,status,created_at DESC);

-- v3.3.1: GM-private hook packages produced by external character-creation assistants
CREATE TABLE IF NOT EXISTS character_gm_hooks (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  hook_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  hook_type TEXT NOT NULL DEFAULT 'other',
  premise TEXT NOT NULL DEFAULT '',
  permission TEXT NOT NULL DEFAULT 'open_question',
  suggested_entry TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'external_character_creator',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','resolved','discarded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id,hook_key)
);
CREATE INDEX IF NOT EXISTS idx_character_gm_hooks
  ON character_gm_hooks(guild_id,character_id,status,updated_at DESC);


-- v3.3.2: reviewable canon proposals imported with GM character hooks
CREATE TABLE IF NOT EXISTS canon_proposals (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  hook_id TEXT,
  canon_key TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  proposed_visibility TEXT NOT NULL DEFAULT 'gm' CHECK(proposed_visibility IN ('public','party','gm')),
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','conflict')),
  canon_event_id TEXT,
  canon_conflict_id TEXT,
  resolution_value TEXT NOT NULL DEFAULT '',
  resolution_note TEXT NOT NULL DEFAULT '',
  resolved_by TEXT,
  source TEXT NOT NULL DEFAULT 'external_character_creator',
  proposed_by_user_id TEXT,
  proposed_by_character_id TEXT,
  source_session_id TEXT,
  source_channel_id TEXT,
  source_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (hook_id) REFERENCES character_gm_hooks(id) ON DELETE SET NULL,
  UNIQUE(character_id,canon_key,proposed_value)
);
CREATE INDEX IF NOT EXISTS idx_canon_proposals_review
  ON canon_proposals(guild_id,status,created_at DESC);


-- v3.3.3: freeform character narrative markdown not represented by structured JSON
CREATE TABLE IF NOT EXISTS character_narratives (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('player','gm_private')),
  markdown TEXT NOT NULL DEFAULT '',
  source_filename TEXT NOT NULL DEFAULT '',
  imported_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(guild_id,character_id,scope)
);
CREATE INDEX IF NOT EXISTS idx_character_narratives
  ON character_narratives(guild_id,character_id,scope,updated_at DESC);

-- v3.7.0: durable command idempotency receipts
CREATE TABLE IF NOT EXISTS operation_receipts (
  guild_id TEXT NOT NULL,
  interaction_id TEXT NOT NULL,
  command_key TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed')),
  response_text TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,interaction_id)
);
CREATE INDEX IF NOT EXISTS idx_operation_receipts_actor ON operation_receipts(guild_id,actor_user_id,created_at DESC);

-- v3.7.0: structured authoritative mutation ledger / provenance
CREATE TABLE IF NOT EXISTS mutation_ledger (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  source_layer TEXT NOT NULL,
  source_interaction_id TEXT,
  source_message_id TEXT,
  mutation_type TEXT NOT NULL,
  entity_key TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'gm',
  confidence INTEGER NOT NULL DEFAULT 100 CHECK(confidence BETWEEN 0 AND 100),
  rationale TEXT NOT NULL DEFAULT '',
  trigger_text TEXT NOT NULL DEFAULT '',
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mutation_ledger_campaign ON mutation_ledger(guild_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mutation_ledger_source ON mutation_ledger(guild_id,source_layer,created_at DESC);

-- v3.7.0: World Director history / operational controls
CREATE TABLE IF NOT EXISTS director_history (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  session_id TEXT,
  layer TEXT NOT NULL CHECK(layer IN ('round','scene','downtime','manual')),
  trigger_json TEXT NOT NULL DEFAULT '{}',
  acted INTEGER NOT NULL DEFAULT 0,
  rationale TEXT NOT NULL DEFAULT '',
  public_narration TEXT NOT NULL DEFAULT '',
  mutation_summary_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed','skipped')),
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_director_history_campaign ON director_history(guild_id,created_at DESC);

-- v3.7.0: first-class logical campaign backups
CREATE TABLE IF NOT EXISTS campaign_backups (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  state_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_campaign_backups_campaign ON campaign_backups(guild_id,created_at DESC);

-- v3.8.0: persistent NPC cognition (subjective memory, knowledge, goals, personality)
CREATE TABLE IF NOT EXISTS npc_profiles (
  guild_id TEXT NOT NULL,
  npc_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  public_identity TEXT NOT NULL DEFAULT '',
  portrayal TEXT NOT NULL DEFAULT '',
  activity_tier TEXT NOT NULL DEFAULT 'background'
    CHECK(activity_tier IN ('active','supporting','background','dormant')),
  decision_profile_json TEXT NOT NULL DEFAULT '{}',
  knowledge_boundaries_json TEXT NOT NULL DEFAULT '[]',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'gm',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,npc_key),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_profiles_activity
  ON npc_profiles(guild_id,activity_tier,updated_at DESC);

CREATE TABLE IF NOT EXISTS npc_memories (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  npc_key TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'episodic'
    CHECK(memory_type IN ('episodic','semantic','relational','secret','impression')),
  content TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT 'entity'
    CHECK(subject_type IN ('character','npc','faction','location','entity','obligation','veil')),
  subject_key TEXT NOT NULL DEFAULT '',
  sentiment INTEGER NOT NULL DEFAULT 0 CHECK(sentiment BETWEEN -5 AND 5),
  importance INTEGER NOT NULL DEFAULT 50 CHECK(importance BETWEEN 0 AND 100),
  confidence INTEGER NOT NULL DEFAULT 100 CHECK(confidence BETWEEN 0 AND 100),
  source_type TEXT NOT NULL DEFAULT 'observed',
  source_ref TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'gm',
  source_session TEXT,
  source_scene TEXT NOT NULL DEFAULT '',
  created_tick INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','challenged','superseded','forgotten')),
  superseded_by TEXT,
  recall_count INTEGER NOT NULL DEFAULT 0,
  last_recalled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id,npc_key) REFERENCES npc_profiles(guild_id,npc_key) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_memories_lookup
  ON npc_memories(guild_id,npc_key,status,importance DESC,created_at DESC);

CREATE TABLE IF NOT EXISTS npc_knowledge (
  guild_id TEXT NOT NULL,
  npc_key TEXT NOT NULL,
  knowledge_key TEXT NOT NULL,
  content TEXT NOT NULL,
  belief_state TEXT NOT NULL DEFAULT 'known'
    CHECK(belief_state IN ('known','suspected','rumor','doubted','unknown')),
  confidence INTEGER NOT NULL DEFAULT 100 CHECK(confidence BETWEEN 0 AND 100),
  source_type TEXT NOT NULL DEFAULT 'observed',
  source_ref TEXT NOT NULL DEFAULT '',
  is_secret INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,npc_key,knowledge_key),
  FOREIGN KEY (guild_id,npc_key) REFERENCES npc_profiles(guild_id,npc_key) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_knowledge_lookup
  ON npc_knowledge(guild_id,npc_key,belief_state,updated_at DESC);

CREATE TABLE IF NOT EXISTS npc_goals (
  guild_id TEXT NOT NULL,
  npc_key TEXT NOT NULL,
  goal_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL,
  horizon TEXT NOT NULL DEFAULT 'near'
    CHECK(horizon IN ('immediate','near','long')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK(priority BETWEEN 0 AND 100),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','completed','failed','abandoned')),
  dependencies_json TEXT NOT NULL DEFAULT '[]',
  acceptable_methods_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'gm',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,npc_key,goal_key),
  FOREIGN KEY (guild_id,npc_key) REFERENCES npc_profiles(guild_id,npc_key) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_goals_active
  ON npc_goals(guild_id,npc_key,status,priority DESC,updated_at DESC);

CREATE TABLE IF NOT EXISTS seed_runs (
  guild_id TEXT NOT NULL,
  seed_key TEXT NOT NULL,
  actor_id TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(guild_id,seed_key),
  FOREIGN KEY (guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

-- Fictional-time simulation. All records are GM-private until an explicit hook
-- is delivered; subjective state never promotes itself into campaign canon.
CREATE TABLE IF NOT EXISTS simulation_entities (
  guild_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('npc','faction','location','relationship')),
  entity_key TEXT NOT NULL,
  state_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(guild_id,entity_type,entity_key),
  FOREIGN KEY(guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS simulation_records (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('action','cycle','memory','goal','obligation','rumor','awareness','residue','hook')),
  entity_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  due_tick INTEGER,
  due_minute INTEGER,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_simulation_records_lookup ON simulation_records(guild_id,kind,status,entity_key);
CREATE TABLE IF NOT EXISTS simulation_clock (
  guild_id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL DEFAULT 0 CHECK(tick>=0),
  minute INTEGER NOT NULL DEFAULT 0 CHECK(minute>=0),
  FOREIGN KEY(guild_id) REFERENCES campaigns(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS city_calendar (
  guild_id TEXT PRIMARY KEY REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  epoch TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  flags_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS world_events (
  guild_id TEXT NOT NULL REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','retracted','superseded')),
  truth_status TEXT NOT NULL DEFAULT 'asserted' CHECK(truth_status IN ('asserted','observed','established')),
  visibility TEXT NOT NULL DEFAULT 'gm' CHECK(visibility IN ('public','party','player','character','gm')),
  subject_key TEXT,
  location_key TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  session_id TEXT,
  scene TEXT NOT NULL DEFAULT '',
  tick INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(guild_id,event_key)
);
CREATE INDEX IF NOT EXISTS idx_world_events_scope ON world_events(guild_id,visibility,status,minute);
CREATE INDEX IF NOT EXISTS idx_world_events_source ON world_events(guild_id,source_kind,source_id);
CREATE TABLE IF NOT EXISTS city_schedule (
  guild_id TEXT NOT NULL REFERENCES campaigns(guild_id) ON DELETE CASCADE,
  schedule_key TEXT NOT NULL,
  due_minute INTEGER NOT NULL CHECK(due_minute>=0),
  due_tick INTEGER NOT NULL DEFAULT 0 CHECK(due_tick>=0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','fired','cancelled')),
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK(review_status IN ('pending','approved','deferred','rejected')),
  data_json TEXT NOT NULL,
  PRIMARY KEY(guild_id,schedule_key)
);
CREATE INDEX IF NOT EXISTS idx_city_schedule_due ON city_schedule(guild_id,status,review_status,due_minute,due_tick);
