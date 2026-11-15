import { serve } from '@hono/node-server'
import { app, dailyMaintenance, ready } from './index.ts'

// รันเซิร์ฟเวอร์ถาวรบนเครื่อง (npm run api) — บน Vercel ใช้ api/index.ts แทน
const PORT = Number(process.env.PORT ?? 8787)

await ready
await dailyMaintenance()
setInterval(() => dailyMaintenance().catch(console.error), 86400000).unref()

serve({ fetch: app.fetch, port: PORT }, (info) => console.log(`API ready on http://localhost:${info.port}/api`))
