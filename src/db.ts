// db.ts
// Opens the local SQLite database, creates the schema if it doesn't exist yet,
// and exposes typed functions for reading/writing profile, runs, and plan data.
// Uses @tauri-apps/plugin-sql, which you already registered in lib.rs.

import Database from "@tauri-apps/plugin-sql";

// The db file is created automatically inside the OS app-data directory the
// first time this runs — you don't need to create it yourself.
let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:laceup.db");
  }
  return dbPromise;
}

export async function initSchema(): Promise<void> {
  const db = await getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      age INTEGER,
      weekly_mileage REAL,
      years_running INTEGER,
      race_5k TEXT,
      race_10k TEXT,
      race_half TEXT,
      race_marathon TEXT,
      goal_race_name TEXT,
      goal_race_date TEXT,
      goal_time TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      planned_distance_mi REAL,
      actual_distance_mi REAL NOT NULL,
      planned_pace_sec REAL,
      actual_pace_sec REAL NOT NULL,
      rpe INTEGER NOT NULL,
      felt_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS plan_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      planned_mileage REAL,
      summary TEXT
    );
  `);
}

// ---------- profile ----------

export interface ProfileRow {
  name: string;
  age: number | null;
  weekly_mileage: number | null;
  years_running: number | null;
  race_5k: string | null;
  race_10k: string | null;
  race_half: string | null;
  race_marathon: string | null;
  goal_race_name: string | null;
  goal_race_date: string | null;
  goal_time: string | null;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const db = await getDb();
  const rows = await db.select<ProfileRow[]>("SELECT * FROM profile WHERE id = 1");
  return rows.length > 0 ? rows[0] : null;
}

export async function saveProfile(p: ProfileRow): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO profile (id, name, age, weekly_mileage, years_running, race_5k, race_10k, race_half, race_marathon, goal_race_name, goal_race_date, goal_time)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(id) DO UPDATE SET
       name=$1, age=$2, weekly_mileage=$3, years_running=$4,
       race_5k=$5, race_10k=$6, race_half=$7, race_marathon=$8,
       goal_race_name=$9, goal_race_date=$10, goal_time=$11`,
    [p.name, p.age, p.weekly_mileage, p.years_running, p.race_5k, p.race_10k, p.race_half, p.race_marathon, p.goal_race_name, p.goal_race_date, p.goal_time]
  );
}

// ---------- runs ----------

export interface RunRow {
  id?: number;
  date: string;
  type: string;
  planned_distance_mi: number | null;
  actual_distance_mi: number;
  planned_pace_sec: number | null;
  actual_pace_sec: number;
  rpe: number;
  felt_notes: string;
}

export async function addRun(r: RunRow): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO runs (date, type, planned_distance_mi, actual_distance_mi, planned_pace_sec, actual_pace_sec, rpe, felt_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [r.date, r.type, r.planned_distance_mi, r.actual_distance_mi, r.planned_pace_sec, r.actual_pace_sec, r.rpe, r.felt_notes]
  );
}

export async function getRecentRuns(limit = 10): Promise<RunRow[]> {
  const db = await getDb();
  return db.select<RunRow[]>("SELECT * FROM runs ORDER BY date DESC LIMIT $1", [limit]);
}