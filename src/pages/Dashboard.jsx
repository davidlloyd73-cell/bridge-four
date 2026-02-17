import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Heart, AlertCircle, Plus, Phone, Eye, MessageSquare } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { getAge, getDaysUntilBirthday, formatRelativeDate, daysSince, formatDate } from '../utils/dates';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import './Dashboard.css';

export default function Dashboard() {
  const {
    households, persons, events, contactLogs,
    getPersonsByHousehold, addContactLog,
  } = useFamily();
  const navigate = useNavigate();
  const [logModal, setLogModal] = useState(null); // personId or null
  const [logForm, setLogForm] = useState({ method: 'call', notes: '' });

  // Upcoming events in next 30 days
  const upcoming = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 30);

    // Birthday events from DOBs
    const birthdayEvents = persons
      .filter(p => p.dob && p.id !== 'p1')
      .map(p => {
        const daysUntil = getDaysUntilBirthday(p.dob);
        if (daysUntil > 30) return null;
        const age = getAge(p.dob) + (daysUntil === 0 ? 0 : 1);
        return {
          id: `bday-${p.id}`,
          title: `${p.name}'s ${ordinal(age)} Birthday`,
          daysUntil,
          type: 'birthday',
          personIds: [p.id],
        };
      })
      .filter(Boolean);

    // Regular events
    const regularEvents = events
      .filter(e => e.type !== 'birthday')
      .map(e => {
        const eventDate = new Date(e.date);
        const diff = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        if (diff < 0 || diff > 30) return null;
        return { ...e, daysUntil: diff };
      })
      .filter(Boolean);

    return [...birthdayEvents, ...regularEvents].sort((a, b) => a.daysUntil - b.daysUntil);
  }, [persons, events]);

  // Nudges — people David hasn't contacted in 14+ days
  const nudges = useMemo(() => {
    return persons
      .filter(p => p.id !== 'p1' && !p.isGrandchild)
      .map(p => ({
        person: p,
        daysSinceContact: daysSince(p.lastContactDate),
      }))
      .filter(n => n.daysSinceContact >= 14)
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  }, [persons]);

  function handleLogContact(personId) {
    setLogModal(personId);
    setLogForm({ method: 'call', notes: '' });
  }

  function submitContactLog() {
    if (logModal) {
      addContactLog({ personId: logModal, ...logForm });
      setLogModal(null);
    }
  }

  const logPerson = logModal ? persons.find(p => p.id === logModal) : null;

  return (
    <div className="dashboard">
      {/* Nudges */}
      {nudges.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <Heart size={18} />
            <h2>Reconnect</h2>
          </div>
          <div className="nudge-list">
            {nudges.map(({ person, daysSinceContact }) => (
              <Card key={person.id} className="nudge-card">
                <div className="nudge-content">
                  <Avatar name={person.name} photo={person.photo} size={40} />
                  <div className="nudge-text">
                    <span className="nudge-name">{person.name}</span>
                    <span className="nudge-detail">
                      {daysSinceContact === Infinity
                        ? 'No contact logged yet'
                        : `Last contact ${formatRelativeDate(person.lastContactDate)}`}
                    </span>
                  </div>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => handleLogContact(person.id)}
                  >
                    Log
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <Calendar size={18} />
            <h2>Coming Up</h2>
          </div>
          <div className="upcoming-list">
            {upcoming.map(event => (
              <div key={event.id} className="upcoming-item">
                <Badge variant={event.type}>{event.type}</Badge>
                <span className="upcoming-title">{event.title}</span>
                <span className="upcoming-when">
                  {event.daysUntil === 0 ? 'Today!' :
                   event.daysUntil === 1 ? 'Tomorrow' :
                   `in ${event.daysUntil} days`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Family by Household */}
      <section className="dashboard-section">
        <div className="section-header">
          <Home size={18} />
          <h2>Family</h2>
        </div>
        {households.filter(h => h.id !== 'h1').map(household => {
          const members = getPersonsByHousehold(household.id);
          return (
            <div key={household.id} className="household-group">
              <h3 className="household-name">{household.name}</h3>
              <div className="member-grid">
                {members.map(person => (
                  <Card
                    key={person.id}
                    className="member-card"
                    onClick={() => navigate(`/person/${person.id}`)}
                  >
                    <Avatar name={person.name} photo={person.photo} size={56} />
                    <div className="member-info">
                      <span className="member-name">{person.name}</span>
                      <span className="member-detail">
                        {person.relationship}
                        {person.dob && ` · ${getAge(person.dob)}`}
                      </span>
                      {person.lastContactDate && (
                        <span className="member-contact">
                          <Clock size={12} />
                          {formatRelativeDate(person.lastContactDate)}
                        </span>
                      )}
                    </div>
                    {person.isGrandchild && getDaysUntilBirthday(person.dob) <= 7 && (
                      <Badge variant="birthday">Birthday soon!</Badge>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Log Contact Modal */}
      <Modal
        open={!!logModal}
        onClose={() => setLogModal(null)}
        title={logPerson ? `Log contact with ${logPerson.name}` : 'Log contact'}
      >
        <div className="form-group">
          <label htmlFor="contact-method">How did you connect?</label>
          <select
            id="contact-method"
            value={logForm.method}
            onChange={e => setLogForm(f => ({ ...f, method: e.target.value }))}
          >
            <option value="call">Phone call</option>
            <option value="visit">Visit</option>
            <option value="text">Text / WhatsApp</option>
            <option value="video">Video call</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="contact-notes">Notes (optional)</label>
          <textarea
            id="contact-notes"
            rows={3}
            value={logForm.notes}
            onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="What did you talk about?"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={() => setLogModal(null)}>Cancel</button>
          <button className="btn btn--primary" onClick={submitContactLog}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

function Home({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
