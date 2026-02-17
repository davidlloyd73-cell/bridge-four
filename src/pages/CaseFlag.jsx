import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ChevronLeft, Plus, X, CheckCircle } from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')

const CATEGORIES = [
  {
    value: 1,
    label: 'Category 1 — Long stay in ED',
    desc: 'Death followed a prolonged delay in ED (dying in ED or shortly after on a ward)',
  },
  {
    value: 2,
    label: 'Category 2 — Treatment by non-doctors',
    desc: 'PA, ACP, ANP or similar non-medical practitioner involvement contributed to the death',
  },
  {
    value: 3,
    label: 'Category 3 — Failed discharge',
    desc: 'Death follows readmission shortly after a previous discharge',
  },
]

const EMPTY_FLAG = { hospital_number: '', category: '', details: '' }

export default function CaseFlag() {
  const meName = localStorage.getItem('me_name') || ''
  const navigate = useNavigate()
  const [flagDate, setFlagDate] = useState(today)
  const [flags, setFlags] = useState([{ ...EMPTY_FLAG }])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!meName) {
    navigate('/')
    return null
  }

  function updateFlag(index, field, value) {
    setFlags(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))
  }

  function addFlag() {
    setFlags(prev => [...prev, { ...EMPTY_FLAG }])
  }

  function removeFlag(index) {
    setFlags(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    for (const [i, flag] of flags.entries()) {
      if (!flag.hospital_number.trim()) {
        setError(`Case ${i + 1}: Hospital number is required`)
        return
      }
      if (!flag.category) {
        setError(`Case ${i + 1}: Please select a category`)
        return
      }
    }

    setLoading(true)
    try {
      for (const flag of flags) {
        const res = await fetch('/api/case-flags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            me_name: meName,
            flag_date: flagDate,
            hospital_number: flag.hospital_number.trim(),
            category: Number(flag.category),
            details: flag.details,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Submission failed')
      }
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
          <h1>Cases Flagged</h1>
        </div>
        <div className="card">
          <div className="success-screen">
            <div className="success-icon">
              <CheckCircle size={32} />
            </div>
            <h2>{flags.length} case{flags.length !== 1 ? 's' : ''} flagged!</h2>
            <p>Thank you, {meName}. The case{flags.length !== 1 ? 's have' : ' has'} been logged for {flagDate}.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setFlags([{ ...EMPTY_FLAG }]); setSubmitted(false) }}
              >
                Flag more cases
              </button>
              <Link to="/shift-log" className="btn btn-ghost btn-sm">Log my shift</Link>
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
        <h1>Flag a Case</h1>
        <p>{meName}</p>
      </div>

      <Link to="/" className="back-link"><ChevronLeft size={16} /> Back</Link>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-title">Session Date</div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date of shift / scrutiny</label>
            <input
              type="date"
              value={flagDate}
              max={today}
              onChange={e => setFlagDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Cases to Flag</div>

          {flags.map((flag, i) => (
            <div key={i} className="flag-item">
              <div className="flag-item-header">
                <span>Case {i + 1}</span>
                {flags.length > 1 && (
                  <button type="button" className="remove-btn" onClick={() => removeFlag(i)}>
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Hospital number</label>
                <input
                  type="text"
                  placeholder="e.g. 1234567"
                  value={flag.hospital_number}
                  onChange={e => updateFlag(i, 'hospital_number', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="cat-options">
                  {CATEGORIES.map(cat => (
                    <label
                      key={cat.value}
                      className={`cat-option${flag.category == cat.value ? ' selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`cat-${i}`}
                        value={cat.value}
                        checked={flag.category == cat.value}
                        onChange={() => updateFlag(i, 'category', cat.value)}
                      />
                      <div className="cat-opt-text">
                        <strong>{cat.label}</strong>
                        <small>{cat.desc}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Details / comments</label>
                <textarea
                  value={flag.details}
                  placeholder="Briefly describe the circumstances..."
                  onChange={e => updateFlag(i, 'details', e.target.value)}
                  style={{ minHeight: 70 }}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-full"
            onClick={addFlag}
            style={{ marginTop: '0.25rem' }}
          >
            <Plus size={16} /> Add another case
          </button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading
            ? 'Submitting…'
            : `Submit ${flags.length} Case${flags.length !== 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  )
}
