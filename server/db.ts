import pg from 'pg'

/**
 * Neon Postgres — ใช้ pooled DATABASE_URL (pgbouncer) เพราะ server นี้เป็น Node ที่รันยาว
 * ใช้ `pg` ตรง ๆ ไม่ต้องใช้ serverless driver
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('ไม่พบ DATABASE_URL — รัน `neon deploy` เพื่อดึงค่าลง .env.local')
}

export const pool = new pg.Pool({ connectionString, max: 10 })

/** ชื่อ database ที่ Realtime ต้องรู้ — อ่านจาก DATABASE_URL */
export const DB_NAME = new URL(connectionString).pathname.replace(/^\//, '') || 'neondb'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  is_admin        boolean NOT NULL DEFAULT false,
  signed_up_at    timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token        text PRIMARY KEY,
  email        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id            text PRIMARY KEY,
  owner_email   text NOT NULL,
  name          text NOT NULL,
  emoji         text NOT NULL DEFAULT '📘',
  academic_year integer NOT NULL DEFAULT 0,
  semester      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subjects_owner_idx ON subjects (owner_email);

CREATE TABLE IF NOT EXISTS works (
  id          text PRIMARY KEY,
  owner_email text NOT NULL,
  subject_id  text NOT NULL,
  title       text NOT NULL,
  type        text NOT NULL DEFAULT 'other',
  status      text NOT NULL DEFAULT 'notStarted',
  priority    text NOT NULL DEFAULT '',
  due_date    text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS works_owner_idx ON works (owner_email);
CREATE INDEX IF NOT EXISTS works_subject_idx ON works (subject_id);
`

/** สร้างตารางถ้ายังไม่มี — รันซ้ำได้ (ไม่เปิด RLS: Realtime ไม่รองรับตารางที่เปิด RLS) */
export async function migrate() {
  await pool.query(SCHEMA)
}
