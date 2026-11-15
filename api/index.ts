import { app, ready } from '../server/index.ts'

// Vercel Function: รับ POST /api แล้วส่งต่อให้ Hono app
export async function POST(request: Request) {
  await ready
  return app.fetch(request)
}
