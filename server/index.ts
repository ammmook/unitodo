import { randomUUID, randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createRealtime, rawSql } from '@neon/realtime/server'
import { DB_NAME, migrate, pool } from './db.ts'

/**
 * Backend ของ Todolist บน Neon Postgres
 *
 * ใช้โปรโตคอลเดียวกับ Apps Script เดิม (POST { action, sessionToken, idToken, viewAs, ... }
 * → { ok, data } | { ok:false, error, message }) เพื่อให้ฝั่ง frontend เปลี่ยนแค่ URL
 * เพิ่ม action `live` ที่คืน sealed query ของ Neon Realtime ให้เบราว์เซอร์ subscribe ตรง
 */

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
const BOOTSTRAP_ADMIN_EMAILS = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
const SESSION_TTL_MS = 30 * 86400000
const SESSION_TOUCH_AFTER_MS = 12 * 3600000
const TIME_ZONE = 'Asia/Bangkok'

const VALID_STATUS = ['notStarted', 'inProgress', 'completed']
const VALID_TYPE = ['assignment', 'exam', 'presentation', 'project', 'other']

const realtime = createRealtime({
  secret: process.env.NEON_REALTIME_SECRET ?? '',
  db: DB_NAME,
})

// ── helpers ──────────────────────────────────────────────────────

class ApiFailure extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase()
const pick = (value: unknown, allowed: string[], fallback: string) =>
  allowed.includes(String(value ?? '')) ? String(value) : fallback

function asDateString(value: unknown) {
  const text = String(value ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function daysUntilDue(dueDate: string) {
  const due = dueDate.split('-').map(Number)
  if (due.length !== 3 || due.some(Number.isNaN)) return 0
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date()).split('-').map(Number)
  const dueUtc = Date.UTC(due[0], due[1] - 1, due[2])
  const todayUtc = Date.UTC(today[0], today[1] - 1, today[2])
  return Math.round((dueUtc - todayUtc) / 86400000)
}

/** กติกาเดียวกับ computeWorkPriority ฝั่ง frontend */
function computeWorkPriority(dueDate: string, status: string) {
  if (status === 'completed') return ''
  const days = daysUntilDue(dueDate)
  if (days <= 0) return 'urgent'
  if (status === 'inProgress') return days === 1 ? 'high' : days <= 3 ? 'medium' : 'low'
  return days <= 2 ? 'high' : days === 3 ? 'medium' : 'low'
}

interface UserRow {
  id: string
  email: string
  display_name: string
  is_admin: boolean
  signed_up_at: Date
  last_sign_in_at: Date
}

const mapUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name || row.email.split('@')[0],
  isAdmin: row.is_admin,
  signedUpAt: row.signed_up_at.toISOString(),
  lastSignInAt: row.last_sign_in_at.toISOString(),
})

// ── auth ─────────────────────────────────────────────────────────

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

async function verifyIdToken(idToken: unknown) {
  if (typeof idToken !== 'string' || idToken.length < 20) return null
  if (!GOOGLE_CLIENT_ID) throw new ApiFailure('SERVER_ERROR', 'ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID')
  try {
    const { payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: GOOGLE_CLIENT_ID,
    })
    if (!payload.email || payload.email_verified !== true) return null
    return {
      email: normalizeEmail(payload.email),
      name: String(payload.name ?? payload.given_name ?? '').trim(),
    }
  } catch {
    return null
  }
}

async function resolveSession(token: unknown) {
  if (typeof token !== 'string' || token.length < 20) return null
  const { rows } = await pool.query<{ email: string; last_seen_at: Date }>(
    'SELECT email, last_seen_at FROM sessions WHERE token = $1 AND expires_at > now()',
    [token],
  )
  const row = rows[0]
  if (!row) return null
  if (Date.now() - row.last_seen_at.getTime() > SESSION_TOUCH_AFTER_MS) {
    await pool.query('UPDATE sessions SET last_seen_at = now(), expires_at = $2 WHERE token = $1', [
      token,
      new Date(Date.now() + SESSION_TTL_MS),
    ])
  }
  return normalizeEmail(row.email)
}

async function createSession(email: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await pool.query('INSERT INTO sessions (token, email, expires_at) VALUES ($1, $2, $3)', [token, email, expiresAt])
  return { token, expiresAt: expiresAt.toISOString() }
}

async function upsertUser(actor: { email: string; name: string; viaGoogle: boolean }, touch: boolean) {
  const found = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [actor.email])
  const existing = found.rows[0]
  if (existing) {
    if (!touch) return mapUser(existing)
    const name = actor.name && actor.name !== existing.display_name ? actor.name : existing.display_name
    const { rows } = await pool.query<UserRow>(
      'UPDATE users SET last_sign_in_at = now(), display_name = $2 WHERE email = $1 RETURNING *',
      [actor.email, name],
    )
    return mapUser(rows[0])
  }
  if (!actor.viaGoogle) throw new ApiFailure('SERVER_ERROR', 'ไม่พบบัญชีผู้ใช้นี้แล้ว')

  // คนแรกของระบบ (หรืออยู่ใน BOOTSTRAP_ADMIN_EMAILS) ได้เป็น admin — ใช้ INSERT ... SELECT กันแย่งกัน
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (id, email, display_name, is_admin)
     VALUES ($1, $2, $3, $4 OR NOT EXISTS (SELECT 1 FROM users))
     ON CONFLICT (email) DO UPDATE SET last_sign_in_at = now()
     RETURNING *`,
    [randomUUID(), actor.email, actor.name || actor.email.split('@')[0], BOOTSTRAP_ADMIN_EMAILS.includes(actor.email)],
  )
  return mapUser(rows[0])
}

// ── reads ────────────────────────────────────────────────────────

const WORK_COLUMNS = 'id, owner_email, subject_id, title, type, status, due_date, note, created_at'
const SUBJECT_COLUMNS = 'id, name, emoji, academic_year, semester, created_at'

async function bootstrap(me: ReturnType<typeof mapUser>, actingEmail: string, session: unknown) {
  let viewingAs = me
  if (actingEmail !== me.email) {
    const found = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [actingEmail])
    viewingAs = found.rows[0]
      ? mapUser(found.rows[0])
      : { id: actingEmail, email: actingEmail, displayName: actingEmail.split('@')[0], isAdmin: false, signedUpAt: '', lastSignInAt: '' }
  }

  const [subjects, works, users] = await Promise.all([
    pool.query(`SELECT ${SUBJECT_COLUMNS} FROM subjects WHERE owner_email = $1 ORDER BY created_at`, [actingEmail]),
    pool.query(`SELECT ${WORK_COLUMNS} FROM works WHERE owner_email = $1 ORDER BY created_at DESC`, [actingEmail]),
    me.isAdmin ? pool.query<UserRow>('SELECT * FROM users ORDER BY signed_up_at') : null,
  ])

  return {
    me,
    viewingAs,
    subjects: subjects.rows.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      academicYear: row.academic_year,
      semester: row.semester,
    })),
    works: works.rows.map((row) => ({
      id: row.id,
      title: row.title,
      subjectId: row.subject_id,
      type: row.type,
      status: row.status,
      dueDate: row.due_date,
      note: row.note,
      createdAt: row.created_at.toISOString(),
      ownerEmail: row.owner_email,
    })),
    ...(users ? { users: users.rows.map(mapUser) } : {}),
    serverTime: new Date().toISOString(),
    ...(session ? { session } : {}),
  }
}

/** sealed query ของ Realtime — client แก้ SQL/พารามิเตอร์ไม่ได้ เจ้าของข้อมูลถูกล็อกไว้ที่นี่ */
async function sealLive(actingEmail: string) {
  const [works, subjects] = await Promise.all([
    realtime.seal({
      query: rawSql(`SELECT ${WORK_COLUMNS} FROM works WHERE owner_email = $1`, [actingEmail]),
    }),
    realtime.seal({
      query: rawSql(`SELECT ${SUBJECT_COLUMNS} FROM subjects WHERE owner_email = $1`, [actingEmail]),
    }),
  ])
  return { url: process.env.NEON_REALTIME_URL ?? '', works, subjects }
}

// ── writes ───────────────────────────────────────────────────────

type Params = Record<string, unknown>

async function addSubject(params: Params, owner: string) {
  const name = String(params.name ?? '').trim()
  if (!name) throw new ApiFailure('VALIDATION', 'ต้องมีชื่อวิชา')
  const academicYear = Number(params.academicYear) || 0
  const semester = Number(params.semester) || 0

  const dup = await pool.query(
    'SELECT 1 FROM subjects WHERE owner_email = $1 AND academic_year = $2 AND semester = $3 AND lower(trim(name)) = lower($4)',
    [owner, academicYear, semester, name],
  )
  if (dup.rowCount) throw new ApiFailure('DUPLICATE', `มีวิชา “${name}” ในเทอมนี้อยู่แล้ว`)

  const subject = {
    id: String(params.id || randomUUID()),
    name,
    emoji: String(params.emoji || '📘'),
    academicYear,
    semester,
  }
  await pool.query(
    'INSERT INTO subjects (id, owner_email, name, emoji, academic_year, semester) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
    [subject.id, owner, subject.name, subject.emoji, academicYear, semester],
  )
  return subject
}

async function deleteSubject(params: Params, owner: string) {
  const id = String(params.id ?? '')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const removed = await client.query('DELETE FROM subjects WHERE id = $1 AND owner_email = $2', [id, owner])
    if (!removed.rowCount) throw new ApiFailure('NOT_FOUND', 'ไม่พบวิชานี้')
    const works = await client.query<{ id: string }>('DELETE FROM works WHERE subject_id = $1 AND owner_email = $2 RETURNING id', [id, owner])
    await client.query('COMMIT')
    return { id, deletedWorkIds: works.rows.map((row) => row.id) }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function addWork(params: Params, owner: string) {
  const title = String(params.title ?? '').trim()
  const subjectId = String(params.subjectId ?? '')
  if (!title) throw new ApiFailure('VALIDATION', 'ต้องมีชื่องาน')
  if (!subjectId) throw new ApiFailure('VALIDATION', 'ต้องเลือกวิชา')

  const createdAt = params.createdAt ? new Date(String(params.createdAt)) : new Date()
  const work = {
    id: String(params.id || randomUUID()),
    title,
    subjectId,
    type: pick(params.type, VALID_TYPE, 'other'),
    status: pick(params.status, VALID_STATUS, 'notStarted'),
    dueDate: asDateString(params.dueDate),
    note: String(params.note ?? '').trim(),
    createdAt: (Number.isNaN(createdAt.getTime()) ? new Date() : createdAt).toISOString(),
    ownerEmail: owner,
  }
  // restoreWork (undo) ส่ง id เดิม — ยิงซ้ำก็ไม่สร้างซ้ำ
  await pool.query(
    `INSERT INTO works (id, owner_email, subject_id, title, type, status, priority, due_date, note, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
    [work.id, owner, subjectId, title, work.type, work.status, computeWorkPriority(work.dueDate, work.status), work.dueDate, work.note, work.createdAt],
  )
  return work
}

async function updateWork(params: Params, owner: string) {
  const id = String(params.id ?? '')
  const found = await pool.query('SELECT status, due_date FROM works WHERE id = $1 AND owner_email = $2', [id, owner])
  const current = found.rows[0]
  if (!current) throw new ApiFailure('NOT_FOUND', 'ไม่พบงานนี้')

  const status = params.status != null ? pick(params.status, VALID_STATUS, current.status) : current.status
  const dueDate = params.dueDate != null ? asDateString(params.dueDate) : current.due_date
  await pool.query(
    `UPDATE works SET
       title = COALESCE($3, title), subject_id = COALESCE($4, subject_id), type = COALESCE($5, type),
       status = $6, due_date = $7, note = COALESCE($8, note), priority = $9
     WHERE id = $1 AND owner_email = $2`,
    [
      id,
      owner,
      params.title != null ? String(params.title).trim() : null,
      params.subjectId != null ? String(params.subjectId) : null,
      params.type != null && VALID_TYPE.includes(String(params.type)) ? String(params.type) : null,
      status,
      dueDate,
      params.note != null ? String(params.note) : null,
      computeWorkPriority(dueDate, status),
    ],
  )
  return { id }
}

async function deleteWork(params: Params, owner: string) {
  const id = String(params.id ?? '')
  const removed = await pool.query('DELETE FROM works WHERE id = $1 AND owner_email = $2', [id, owner])
  if (!removed.rowCount) throw new ApiFailure('NOT_FOUND', 'ไม่พบงานนี้')
  return { id }
}

async function setAdmin(params: Params, me: ReturnType<typeof mapUser>) {
  if (!me.isAdmin) throw new ApiFailure('FORBIDDEN', 'ต้องเป็น admin เท่านั้น')
  const email = normalizeEmail(params.email)
  const isAdmin = params.isAdmin === true || String(params.isAdmin) === 'true'
  const updated = await pool.query('UPDATE users SET is_admin = $2 WHERE email = $1', [email, isAdmin])
  if (!updated.rowCount) throw new ApiFailure('NOT_FOUND', 'ไม่พบผู้ใช้นี้')
  return { email, isAdmin }
}

// ── router ───────────────────────────────────────────────────────

async function handle(params: Params): Promise<unknown> {
  const action = String(params.action ?? '')

  if (action === 'ping') {
    const { rows } = await pool.query('SELECT now() AS now')
    return { version: 'neon-1', database: 'neon', now: rows[0].now, realtime: Boolean(process.env.NEON_REALTIME_URL) }
  }

  let actor: { email: string; name: string; viaGoogle: boolean } | null = null
  const sessionEmail = await resolveSession(params.sessionToken)
  if (sessionEmail) actor = { email: sessionEmail, name: '', viaGoogle: false }
  else {
    const identity = await verifyIdToken(params.idToken)
    if (identity) actor = { ...identity, viaGoogle: true }
  }
  if (!actor) throw new ApiFailure('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง')

  const me = await upsertUser(actor, action === 'bootstrap')
  const session = actor.viaGoogle && action === 'bootstrap' ? await createSession(me.email) : null

  if (action === 'logout') {
    await pool.query('DELETE FROM sessions WHERE token = $1', [String(params.sessionToken ?? '')])
    return { signedOut: true }
  }

  let actingEmail = me.email
  const viewAs = normalizeEmail(params.viewAs)
  if (viewAs && viewAs !== me.email) {
    if (!me.isAdmin) throw new ApiFailure('FORBIDDEN', 'ต้องเป็น admin เท่านั้น')
    actingEmail = viewAs
  }

  switch (action) {
    case 'bootstrap': return bootstrap(me, actingEmail, session)
    case 'live': return sealLive(actingEmail)
    case 'addSubject': return addSubject(params, actingEmail)
    case 'deleteSubject': return deleteSubject(params, actingEmail)
    case 'addWork':
    case 'restoreWork': return addWork(params, actingEmail)
    case 'updateWork': return updateWork(params, actingEmail)
    case 'deleteWork': return deleteWork(params, actingEmail)
    case 'setAdmin': return setAdmin(params, me)
    default: throw new ApiFailure('UNKNOWN_ACTION', `ไม่รู้จัก action: ${action}`)
  }
}

export const app = new Hono()

app.post('/api', async (c) => {
  let params: Params
  try {
    params = JSON.parse(await c.req.text()) as Params
  } catch {
    return c.json({ ok: false, error: 'BAD_REQUEST', message: 'Malformed JSON body' })
  }
  try {
    return c.json({ ok: true, data: await handle(params) })
  } catch (error) {
    if (error instanceof ApiFailure) return c.json({ ok: false, error: error.code, message: error.message })
    console.error(error)
    return c.json({ ok: false, error: 'SERVER_ERROR', message: 'เซิร์ฟเวอร์ผิดพลาด' })
  }
})

/** งานประจำวัน: คำนวณ priority ใหม่ + ลบ session ที่หมดอายุ */
export async function dailyMaintenance() {
  const works = await pool.query<{ id: string; status: string; due_date: string; priority: string }>(
    "SELECT id, status, due_date, priority FROM works WHERE status <> 'completed' OR priority <> ''",
  )
  for (const work of works.rows) {
    const next = computeWorkPriority(work.due_date, work.status)
    if (next !== work.priority) await pool.query('UPDATE works SET priority = $2 WHERE id = $1', [work.id, next])
  }
  await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
}

/** สร้างตารางครั้งเดียวต่อ process (Vercel เรียกใช้ตอน cold start) */
export const ready = migrate()
