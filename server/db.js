import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(__dirname, 'scrutiny.db'))

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS shift_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    me_name TEXT NOT NULL,
    log_date TEXT NOT NULL,
    hours_rostered REAL NOT NULL DEFAULT 0,
    community_cases INTEGER NOT NULL DEFAULT 0,
    acute_cases INTEGER NOT NULL DEFAULT 0,
    hmc_referrals INTEGER NOT NULL DEFAULT 0,
    mccds_signed INTEGER NOT NULL DEFAULT 0,
    other_forms_signed INTEGER NOT NULL DEFAULT 0,
    calls_bereaved INTEGER NOT NULL DEFAULT 0,
    calls_doctors INTEGER NOT NULL DEFAULT 0,
    comments TEXT DEFAULT '',
    learning_points TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS case_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    me_name TEXT NOT NULL,
    flag_date TEXT NOT NULL,
    hospital_number TEXT NOT NULL,
    category INTEGER NOT NULL CHECK(category IN (1, 2, 3)),
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db
