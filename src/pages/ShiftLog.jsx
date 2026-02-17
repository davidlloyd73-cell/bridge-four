import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ChevronLeft, CheckCircle } from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')

const INIT = {
  log_date: today,
  hours_rostered: 4,
  community_cases: 0,
  acute_cases: 0,
  hmc_referrals: 0,
  mccds_signed: 0,
  other_forms_signed: 0,
  calls_bereaved: 0,
  calls_doctors: 0,
  comments: '',
  learning_points: '',
}

function NumStepper({ label, field, form, setForm, min = 0, max = 999 }) {
  const value = form[field]
  const set = v => setForm(f => ({ ...f, [field]: Math.max(min, Math.min(max, v)) }))
  return (
    <div className="num-group">
      <label>{label}</label>
      <div className="num-field">
        <button type="button" className="num-btn" onClick={() => set(value - 1)}>−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => set(parseInt(e.target.value) || 0)}
        />
        <button type="button" className="num-btn" onClick={() => set(value + 1)}>+</button>
      </div>
    </div>
  )
}

function HoursStepper({ form, setForm }) {
  const value = form.hours_rostered
  const set = v => setForm(f => ({ ...f, hours_rostered: Math.max(0.5, Math.min(12, v)) }))
  const presets = [2, 3, 4, 5, 6, 8]
  return (
    <div className="num-group">
      <label>Hours rostered</label>
      <div className="num-field" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
        <button type="button" className="num-btn" onClick={() => set(value - 0.5)}>−</button>
        <input
          type="number"
          value={value}
          min={0.5}
          max={12}
          step={0.5}
          onChange={e => set(parseFloat(e.target.value) || 0)}
          style={{ width: 64 }}
        />
        <button type="button" className="num-btn" onClick={() => set(value + 0.5)}>+</button>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {presets.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => set(h)}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.78rem',
                border: '1px solid var(--border)',
                borderRadius: '0.3rem',
                cursor: 'pointer',
                background: value === h ? 'var(--primary)' : '#fff',
                color: value === h ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >{h}h</button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ShiftLog() {
  const meName = localStorage.getItem('me_name') || ''
  const navigate = useNavigate()
  const [form, setForm] = useState(INIT)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!meName) {
    navigate('/')
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/shift-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ me_name: meName, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="page">
        <div className="app-header">
          <h1>Shift Logged</h1>
        </div>
        <div className="card">
          <div className="success-screen">
            <div className="success-icon">
              <CheckCircle size={32} />
            </div>
            <h2>Shift submitted!</h2>
            <p>Thank you, {meName}. Your shift data for {form.log_date} has been saved.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setForm(INIT); setSubmitted(false) }}>
                Log another shift
              </button>
              <Link to="/case-flag" className="btn btn-ghost btn-sm">Flag a case</Link>
              <Link to="/" className="btn btn-ghost btn-sm">Home</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="app-header">
        <h1>Log My Shift</h1>
        <p>{meName}</p>
      </div>

      <Link to="/" className="back-link"><ChevronLeft size={16} /> Back</Link>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Shift details ── */}
        <div className="card">
          <div className="card-title">Shift Details</div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.log_date}
                max={today}
                onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))}
                required
              />
            </div>
            <HoursStepper form={form} setForm={setForm} />
          </div>
        </div>

        {/* ── Cases scrutinised ── */}
        <div className="card">
          <div className="card-title">Cases Scrutinised</div>
          <div className="num-grid">
            <NumStepper label="Community cases" field="community_cases" form={form} setForm={setForm} />
            <NumStepper label="Acute cases" field="acute_cases" form={form} setForm={setForm} />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="card">
          <div className="card-title">Actions Taken</div>
          <div className="num-grid">
            <NumStepper label="HMC referrals made" field="hmc_referrals" form={form} setForm={setForm} />
            <NumStepper label="MCCDs signed" field="mccds_signed" form={form} setForm={setForm} />
            <NumStepper label="Other forms signed (e.g. FFI)" field="other_forms_signed" form={form} setForm={setForm} />
            <NumStepper label="Calls with bereaved" field="calls_bereaved" form={form} setForm={setForm} />
            <NumStepper label="Calls to doctors" field="calls_doctors" form={form} setForm={setForm} />
          </div>
        </div>

        {/* ── Reflection ── */}
        <div className="card">
          <div className="card-title">Reflection</div>
          <div className="form-group">
            <label>Comments about this shift</label>
            <textarea
              value={form.comments}
              placeholder="Any notable events, challenges or observations..."
              onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Learning points</label>
            <textarea
              value={form.learning_points}
              placeholder="What did you learn or want to follow up on?"
              onChange={e => setForm(f => ({ ...f, learning_points: e.target.value }))}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Shift Log'}
        </button>
      </form>
    </div>
  )
}
