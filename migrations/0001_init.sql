-- Cloudflare D1 (SQLite). Không dùng MySQL.
-- Khóa ngoại được khai báo để giữ quan hệ. Khi ghi, mã vẫn xóa bảng con trước bảng cha.

PRAGMA foreign_keys = ON;

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
);

CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sets_to_win INTEGER NOT NULL,
  points_for_win INTEGER NOT NULL,
  points_for_loss INTEGER NOT NULL,
  points_for_forfeit INTEGER NOT NULL,
  points_per_set INTEGER NOT NULL,
  ranking_json TEXT NOT NULL,
  managed_draw INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE team_players (
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (team_id, sort_order),
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
);

CREATE TABLE group_teams (
  group_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (group_id, sort_order),
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  round_label TEXT NOT NULL,
  group_id TEXT,
  court TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT NOT NULL,
  slot_a_json TEXT NOT NULL,
  slot_b_json TEXT NOT NULL,
  status TEXT NOT NULL,
  forfeit TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL
);

CREATE TABLE match_sets (
  match_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  PRIMARY KEY (match_id, set_index),
  FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_players_tournament ON players (tournament_id);
CREATE INDEX idx_teams_tournament ON teams (tournament_id);
CREATE INDEX idx_team_players_player ON team_players (player_id);
CREATE INDEX idx_groups_tournament ON groups (tournament_id);
CREATE INDEX idx_group_teams_team ON group_teams (team_id);
CREATE INDEX idx_matches_tournament_time ON matches (tournament_id, scheduled_at);
CREATE INDEX idx_matches_group ON matches (group_id);
CREATE INDEX idx_sessions_expiry ON sessions (expires_at);
CREATE INDEX idx_audit_created ON audit_log (created_at);

INSERT INTO meta (key, value) VALUES ('revision', '0');
