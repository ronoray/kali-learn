import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.KALI_LEARN_DB_PATH
  || path.join(__dirname, 'kali-learn.db');

let db;

export async function getDb() {
  if (!db) {
    db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await db.exec('PRAGMA journal_mode=WAL');
    await migrate(db);
  }
  return db;
}

async function migrate(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      tool_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'not_started',
      quiz_score INTEGER,
      quiz_attempts INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lesson_cache (
      tool_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_cache (
      tool_id TEXT PRIMARY KEY,
      questions TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );
  `);
}
