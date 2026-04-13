import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Eye, Video, Clock, Calendar, Plus } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { getAge, getDaysUntilBirthday, formatDate, formatRelativeDate } from '../utils/dates';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import './PersonDetail.css';

const METHOD_ICONS = {
  call: Phone,
  visit: Eye,
  text: MessageSquare,
  video: Video,
};

export default function PersonDetail() {
  const { personId } = useParams();
  const navigate = useNavigate();
  const { persons, contactLogs, journalEntries, getHousehold, addContactLog } = useFamily();
  const person = persons.find(p => p.id === personId);
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ method: 'call', notes: '' });

  const logs = useMemo(() => {
    return contactLogs
      .filter(c => c.personId === personId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [contactLogs, personId]);

  const childJournal = useMemo(() => {
    if (!person?.isGrandchild) return [];
    return journalEntries
      .filter(j => j.childId === personId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [journalEntries, personId, person]);

  if (!person) {
    return (
      <div className="person-detail">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} /> Back
        </button>
        <p>Person not found.</p>
      </div>
    );
  }

  const household = getHousehold(person.householdId);
  const daysUntil = person.dob ? getDaysUntilBirthday(person.dob) : null;

  function handleSubmitLog() {
    addContactLog({ personId, ...logForm });
    setShowLog(false);
    setLogForm({ method: 'call', notes: '' });
  }

  return (
    <div className="person-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} /> Back
      </button>

      {/* Profile header */}
      <div className="person-profile">
        <Avatar name={person.name} photo={person.photo} size={80} />
        <h2>{person.name}</h2>
        <div className="person-meta">
          <span>{person.relationship}</span>
          {person.dob && <span>Age {getAge(person.dob)}</span>}
          {household && <span>{household.name}</span>}
        </div>
        {daysUntil !== null && daysUntil <= 30 && (
          <Badge variant="birthday">
            Birthday {daysUntil === 0 ? 'today!' : `in ${daysUntil} days`}
          </Badge>
        )}
      </div>

      {/* Quick actions */}
      <div className="person-actions">
        <button className="btn btn--primary" onClick={() => setShowLog(true)}>
          <Plus size={16} /> Log Contact
        </button>
        {person.isGrandchild && (
          <button className="btn btn--secondary" onClick={() => navigate(`/journal/${personId}`)}>
            View Journal
          </button>
        )}
      </div>

      {/* Contact history */}
      <section className="person-section">
        <h3>Contact History</h3>
        {logs.length === 0 ? (
          <p className="person-empty">No contact logged yet.</p>
        ) : (
          <div className="contact-list">
            {logs.map(log => {
              const Icon = METHOD_ICONS[log.method] || Phone;
              return (
                <div key={log.id} className="contact-item">
                  <div className="contact-icon">
                    <Icon size={16} />
                  </div>
                  <div className="contact-info">
                    <span className="contact-method">{log.method}</span>
                    <span className="contact-date">{formatDate(log.date)}</span>
                    {log.notes && <span className="contact-notes">{log.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Journal entries for grandchildren */}
      {person.isGrandchild && childJournal.length > 0 && (
        <section className="person-section">
          <h3>Recent Journal Entries</h3>
          <div className="person-journal">
            {childJournal.slice(0, 5).map(entry => (
              <Card key={entry.id} className="person-journal-entry">
                <div className="pj-header">
                  <Badge variant={entry.type}>{entry.type}</Badge>
                  <span className="pj-date">{formatDate(entry.date)}</span>
                </div>
                {entry.type === 'quote' ? (
                  <blockquote className="entry-quote">{entry.content}</blockquote>
                ) : (
                  <p>{entry.content}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Log Contact Modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title={`Log contact with ${person.name}`}>
        <div className="form-group">
          <label htmlFor="detail-method">How did you connect?</label>
          <select
            id="detail-method"
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
          <label htmlFor="detail-notes">Notes (optional)</label>
          <textarea
            id="detail-notes"
            rows={3}
            value={logForm.notes}
            onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="What did you talk about?"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={() => setShowLog(false)}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmitLog}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
