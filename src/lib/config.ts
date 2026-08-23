/** ค่าที่ต้องตั้งใน .env.local — ดู .env.example */

/** Web app URL ของ Google Apps Script */
export const API_URL = (import.meta.env.VITE_GOOGLE_SHEET_API_URL ?? '').trim()

/** OAuth 2.0 Client ID (Web application) */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
