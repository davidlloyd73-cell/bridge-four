import express from 'express'
import db from '../db.js'

const router = express.Router()

function buildWhere(month, year, me_name) {
  const conditions = []
  const params = []
  if (month && year) {
    conditions.push(`strftime('%Y-%m', log_date) = ?`)
    params.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  if (me_name) {
    conditions.push('me_name = ?')
    params.push(me_name)
  }
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

// GET all shift logs
router.get('/', (req, res) => {
  const { month, year, me_name } = req.query
  const { where, params } = buildWhere(month, year, me_name)
  try {
    const logs = db.prepare(`SELECT * FROM shift_logs ${where} ORDER BY log_date DESC, created_at DESC`).all(...params)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create shift log
router.post('/', (req, res) => {
  const {
    me_name, log_date, hours_rostered, community_cases, acute_cases,
    hmc_referrals, mccds_signed, other_forms_signed, calls_bereaved,
    calls_doctors, comments, learning_points
  } = req.body
  if (!me_name || !log_date) return res.status(400).json({ error: 'me_name and log_date are required' })
  try {
    const result = db.prepare(`
      INSERT INTO shift_logs (
        me_name, log_date, hours_rostered, community_cases, acute_cases,
        hmc_referrals, mccds_signed, other_forms_signed, calls_bereaved,
        calls_doctors, comments, learning_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      me_name, log_date,
      Number(hours_rostered) || 0, Number(community_cases) || 0,
      Number(acute_cases) || 0, Number(hmc_referrals) || 0,
      Number(mccds_signed) || 0, Number(other_forms_signed) || 0,
      Number(calls_bereaved) || 0, Number(calls_doctors) || 0,
      comments || '', learning_points || ''
    )
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
        COUNT(*) as total_shifts,
        COALESCE(SUM(community_cases), 0) as total_community,
        COALESCE(SUM(acute_cases), 0) as total_acute,
        COALESCE(SUM(community_cases + acute_cases), 0) as total_cases,
        COALESCE(SUM(hmc_referrals), 0) as total_hmc,
        COALESCE(SUM(mccds_signed), 0) as total_mccds,
        COALESCE(SUM(other_forms_signed), 0) as total_other_forms,
        COALESCE(SUM(calls_bereaved), 0) as total_calls_bereaved,
        COALESCE(SUM(calls_doctors), 0) as total_calls_doctors
      FROM shift_logs ${where}
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
    const logs = db.prepare(`SELECT * FROM shift_logs ${where} ORDER BY log_date ASC, me_name ASC`).all(...params)
    const headers = [
      'Date', 'ME Name', 'Hours Rostered', 'Community Cases', 'Acute Cases',
      'HMC Referrals', 'MCCDs Signed', 'Other Forms Signed',
      'Calls with Bereaved', 'Calls to Doctors', 'Comments', 'Learning Points'
    ]
    const esc = v => `"${String(v || '').replace(/"/g, '""')}"`
    const rows = logs.map(l => [
      l.log_date, esc(l.me_name), l.hours_rostered, l.community_cases, l.acute_cases,
      l.hmc_referrals, l.mccds_signed, l.other_forms_signed,
      l.calls_bereaved, l.calls_doctors, esc(l.comments), esc(l.learning_points)
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const label = month && year ? `${year}-${String(month).padStart(2, '0')}` : 'all'
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="shift-logs-${label}.csv"`)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
