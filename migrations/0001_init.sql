CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('above', 'below')),
  target REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  triggered_at TEXT,
  last_price REAL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);

CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  price REAL NOT NULL,
  direction TEXT NOT NULL,
  target REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);
