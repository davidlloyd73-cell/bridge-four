import express from 'express'
import db from '../db.js'

const router = express.Router()

const CATEGORY_LABELS = {
  1: 'Long stay in ED',
  2: 'Treatment by non-doctors (PA/ACP/ANP)',
  3: 'Failed discharge'
}

function buildWhere(month, year, me_name) {
  const conditions = []
  const params = []
  if (month && year) {
    conditions.push(`strftime('%Y-%m', flag_date) = ?`)
    params.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  if (me_name) {
    conditions.push('me_name = ?')
    params.push(me_name)
  }
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

// GET all case flags
router.get('/', (req, res) => {
  const { month, year, me_name } = req.query
  const { where, params } = buildWhere(month, year, me_name)
  try {
    const flags = db.prepare(`SELECT * FROM case_flags ${where} ORDER BY flag_date DESC, created_at DESC`).all(...params)
    res.json(flags)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create case flag
router.post('/', (req, res) => {
  const { me_name, flag_date, hospital_number, category, details } = req.body
  if (!me_name || !flag_date || !hospital_number || !category) {
    return res.status(400).json({ error: 'me_name, flag_date, hospital_number and category are required' })
  }
  if (![1, 2, 3].includes(Number(category))) {
    return res.status(400).json({ error: 'Category must be 1, 2, or 3' })
  }
  try {
    const result = db.prepare(`
      INSERT INTO case_flags (me_name, flag_date, hospital_number, category, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(me_name, flag_date, hospital_number, Number(category), details || '')
    res.json({ id: result.lastInsertRowid, success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stats summary
router.get('/stats', (req, res) => {
  const { month, year, me_name } = req.query
  const { where, params } = buildWhere(month, year, me_name)
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_flags,
        COALESCE(SUM(CASE WHEN category = 1 THEN 1 ELSE 0 END), 0) as cat1_ed_stay,
        COALESCE(SUM(CASE WHEN category = 2 THEN 1 ELSE 0 END), 0) as cat2_non_doctors,
        COALESCE(SUM(CASE WHEN category = 3 THEN 1 ELSE 0 END), 0) as cat3_failed_discharge
      FROM case_flags ${where}
    `).get(...params)
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET export as CSV
router.get('/export', (req, res) => {
  const { month, year } = req.query
  const { where, params } = buildWhere(month, year)
  try {
    const flags = db.prepare(`SELECT * FROM case_flags ${where} ORDER BY flag_date ASC, me_name ASC`).all(...params)
    const headers = ['Date', 'ME Name', 'Hospital Number', 'Category No.', 'Category', 'Details']
    const esc = v => `"${String(v || '').replace(/"/g, '""')}"`
    const rows = flags.map(f => [
      f.flag_date, esc(f.me_name), f.hospital_number, f.category,
      esc(CATEGORY_LABELS[f.category]), esc(f.details)
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const label = month && year ? `${year}-${String(month).padStart(2, '0')}` : 'all'
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="case-flags-${label}.csv"`)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
