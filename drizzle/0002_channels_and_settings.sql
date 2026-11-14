DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sound_all INTEGER NOT NULL DEFAULT 1,
  gift_sound INTEGER NOT NULL DEFAULT 1,
  thank_voice INTEGER NOT NULL DEFAULT 1,
  thank_text TEXT NOT NULL DEFAULT 'Cảm ơn bạn!',
  banner_text TEXT NOT NULL DEFAULT 'Welcome {name} to the Live!',
  voice TEXT NOT NULL DEFAULT 'female',
  voice_rate REAL NOT NULL DEFAULT 1,
  stage_name TEXT NOT NULL DEFAULT ''
);
