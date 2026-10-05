PRAGMA foreign_keys = ON;

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
  id TEXT PRIMARY KEY,
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
