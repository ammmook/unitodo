/** ค่าที่ต้องตั้งใน .env.local — ดู .env.example */

/** URL ของ backend — ค่าเริ่มต้น /api (Vite proxy ไป server/index.ts ตอน dev) */
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').trim()

/** OAuth 2.0 Client ID (Web application) */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
