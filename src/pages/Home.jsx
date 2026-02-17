import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ClipboardList, AlertTriangle, BarChart3, ChevronRight } from 'lucide-react'

const ME_NAMES = [
  'Kabir Ahluwalia',
  'Gothandaraman Balaji',
  'Julie Bak',
  'Dilip Bassi',
  'Shamela De Silva',
  'Glynn Evans',
  'Tariq Husain',
  'Meron Jacyna',
  'David Lloyd',
  'Anjaly Mirchandani',
  "Renton L'Heureux",
  'John Gall',
  'Other',
]

export default function Home() {
  const [name, setName] = useState(localStorage.getItem('me_name') || '')
  const navigate = useNavigate()

  function go(path) {
    if (!name) {
      alert('Please select your name first.')
      return
    }
    localStorage.setItem('me_name', name)
    navigate(path)
  }

  return (
    <div className="page">
      <div className="app-header">
        <h1>ME Scrutiny Log</h1>
        <p>Medical Examiner — Daily Scrutiny &amp; Referral Log</p>
      </div>

      <div className="card">
        <div className="card-title">Who are you?</div>
        <select
          className="name-select"
          value={name}
          onChange={e => setName(e.target.value)}
        >
          <option value="">— Select your name —</option>
          {ME_NAMES.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <div className="action-grid">
          <div className="action-card" onClick={() => go('/shift-log')}>
            <div className="icon icon-blue">
              <ClipboardList size={26} />
            </div>
            <h3>Log My Shift</h3>
            <p>Submit your end-of-shift scrutiny data</p>
          </div>

          <div className="action-card" onClick={() => go('/case-flag')}>
            <div className="icon icon-red">
              <AlertTriangle size={26} />
            </div>
            <h3>Flag a Case</h3>
            <p>Log ED delays, non-doctor treatment or failed discharge</p>
          </div>
        </div>
      </div>

      <div className="admin-link">
        <Link to="/admin">
          <BarChart3 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Admin / View Reports
          <ChevronRight size={13} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
        </Link>
      </div>
    </div>
  )
}
