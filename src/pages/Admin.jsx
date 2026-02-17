import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format, getMonth, getYear } from 'date-fns'
import { ChevronLeft, Download, RefreshCw } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CAT_LABELS = {
  1: 'Long stay in ED',
  2: 'Non-doctor treatment',
  3: 'Failed discharge',
}

const now = new Date()
const THIS_MONTH = getMonth(now) + 1
const THIS_YEAR = getYear(now)

function StatCard({ value, label, className = '' }) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${className}`}>{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Admin() {
  const [month, setMonth] = useState(THIS_MONTH)
  const [year, setYear] = useState(THIS_YEAR)
  const [tab, setTab] = useState('shifts')

  const [shiftStats, setShiftStats] = useState(null)
  const [flagStats, setFlagStats] = useState(null)
  const [shifts, setShifts] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(false)

  const years = []
  for (let y = THIS_YEAR; y >= THIS_YEAR - 3; y--) years.push(y)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = `month=${month}&year=${year}`
    try {
      const [ss, fs, sl, fl] = await Promise.all([
        fetch(`/api/shift-logs/stats?${qs}`).then(r => r.json()),
        fetch(`/api/case-flags/stats?${qs}`).then(r => r.json()),
        fetch(`/api/shift-logs?${qs}`).then(r => r.json()),
        fetch(`/api/case-flags?${qs}`).then(r => r.json()),
      ])
      setShiftStats(ss)
      setFlagStats(fs)
      setShifts(Array.isArray(sl) ? sl : [])
      setFlags(Array.isArray(fl) ? fl : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  function exportURL(type) {
    return `/api/${type}/export?month=${month}&year=${year}`
  }

  return (
    <div className="page wide">
      <div className="app-header">
        <h1>Admin Dashboard</h1>
        <p>ME Scrutiny Log — Reports &amp; Exports</p>
      </div>

      <Link to="/" className="back-link"><ChevronLeft size={16} /> Back to home</Link>

      {/* ── Filter ── */}
      <div className="filter-row">
        <strong style={{ fontSize: '0.9rem' }}>Period:</strong>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="stats-grid">
        <StatCard value={shiftStats?.total_shifts} label="Shifts logged" />
        <StatCard value={shiftStats?.total_community} label="Community cases" />
        <StatCard value={shiftStats?.total_acute} label="Acute cases" />
        <StatCard value={shiftStats?.total_cases} label="Total cases" className="accent" />
        <StatCard value={shiftStats?.total_hmc} label="HMC referrals" />
        <StatCard value={shiftStats?.total_mccds} label="MCCDs signed" />
        <StatCard value={shiftStats?.total_other_forms} label="Other forms" />
        <StatCard value={shiftStats?.total_calls_bereaved} label="Calls bereaved" />
        <StatCard value={shiftStats?.total_calls_doctors} label="Calls doctors" />
        <StatCard value={flagStats?.total_flags} label="Cases flagged" className="danger" />
      </div>

      {/* ── Export ── */}
      <div className="export-row">
        <a
          href={exportURL('shift-logs')}
          className="btn btn-outline btn-sm"
          download
        >
          <Download size={14} /> Export Shift Logs CSV
        </a>
        <a
          href={exportURL('case-flags')}
          className="btn btn-outline btn-sm"
          download
        >
          <Download size={14} /> Export Case Flags CSV
        </a>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        <button
          className={`tab-btn${tab === 'shifts' ? ' active' : ''}`}
          onClick={() => setTab('shifts')}
        >
          Shift Logs ({shifts.length})
        </button>
        <button
          className={`tab-btn${tab === 'flags' ? ' active' : ''}`}
          onClick={() => setTab('flags')}
        >
          Case Flags ({flags.length})
        </button>
      </div>

      {/* ── Shift logs table ── */}
      {tab === 'shifts' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {shifts.length === 0 ? (
            <div className="empty-state">No shift logs for this period.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>ME Name</th>
                    <th>Hrs</th>
                    <th>Com</th>
                    <th>Acute</th>
                    <th>HMC</th>
                    <th>MCCDs</th>
                    <th>Other</th>
                    <th>Brvd</th>
                    <th>Drs</th>
                    <th>Comments</th>
                    <th>Learning</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.id}>
                      <td>{s.log_date}</td>
                      <td>{s.me_name}</td>
                      <td>{s.hours_rostered}</td>
                      <td>{s.community_cases}</td>
                      <td>{s.acute_cases}</td>
                      <td>{s.hmc_referrals}</td>
                      <td>{s.mccds_signed}</td>
                      <td>{s.other_forms_signed}</td>
                      <td>{s.calls_bereaved}</td>
                      <td>{s.calls_doctors}</td>
                      <td>
                        {s.comments
                          ? <span title={s.comments}>{s.comments.slice(0, 40)}{s.comments.length > 40 ? '…' : ''}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {s.learning_points
                          ? <span title={s.learning_points}>{s.learning_points.slice(0, 40)}{s.learning_points.length > 40 ? '…' : ''}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Case flags table ── */}
      {tab === 'flags' && (
        <>
          {/* Category breakdown */}
          {flagStats && flagStats.total_flags > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span className="cat-badge cat-1">Cat 1 (ED): {flagStats.cat1_ed_stay}</span>
              <span className="cat-badge cat-2">Cat 2 (Non-Dr): {flagStats.cat2_non_doctors}</span>
              <span className="cat-badge cat-3">Cat 3 (Discharge): {flagStats.cat3_failed_discharge}</span>
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {flags.length === 0 ? (
              <div className="empty-state">No case flags for this period.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>ME Name</th>
                      <th>Hospital No.</th>
                      <th>Category</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map(f => (
                      <tr key={f.id}>
                        <td>{f.flag_date}</td>
                        <td>{f.me_name}</td>
                        <td><strong>{f.hospital_number}</strong></td>
                        <td>
                          <span className={`cat-badge cat-${f.category}`}>
                            Cat {f.category}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {CAT_LABELS[f.category]}
                          </div>
                        </td>
                        <td>
                          {f.details
                            ? <span title={f.details}>{f.details.slice(0, 60)}{f.details.length > 60 ? '…' : ''}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
