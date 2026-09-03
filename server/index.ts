import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db'
import healthRouter from './routes/health'
import itemsRouter from './routes/items'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env from the project root (.env), falling back to server/.env so the server
// works whether launched from the root or from inside the workspace.
for (const envPath of [path.resolve(__dirname, '../.env'), path.resolve(process.cwd(), '.env')]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

const app = express()
const PORT = Number(process.env.PORT) || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ name: 'Wyndell\'s API', status: 'ok' })
})

app.use('/api/health', healthRouter)
app.use('/api/items', itemsRouter)

// Start the HTTP server immediately; connect to MongoDB in parallel so a
// missing database never blocks the API from coming up.
void connectDB()

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})