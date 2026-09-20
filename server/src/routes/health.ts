import { Router } from 'express'
import { getDbState } from '../config/db'

const router = Router()

router.get('/', async (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: await getDbState(),
  })
})

export default router