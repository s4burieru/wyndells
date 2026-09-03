import { Router } from 'express'
import { getDbState } from '../config/db'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: getDbState(),
  })
})

export default router