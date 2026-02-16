import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Plus, Star, MessageCircle, Camera, Award } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { formatDate } from '../utils/dates';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import './Journal.css';

const TYPE_ICONS = {
  quote: MessageCircle,
  milestone: Award,
  photo: Camera,
  text: BookOpen,
};

const TYPE_LABELS = {
  quote: 'Quote',
  milestone: 'Milestone',
  photo: 'Photo',
  text: 'Update',
};

export default function Journal() {
  const { childId } = useParams();
  const { journalEntries, persons, getGrandchildren, getPerson, addJournalEntry } = useFamily();
  const grandchildren = getGrandchildren();
  const [filter, setFilter] = useState(childId || 'all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ childId: '', type: 'text', content: '' });

  const entries = useMemo(() => {
    let list = [...journalEntries];
    if (filter !== 'all') {
      list = list.filter(j => j.childId === filter);
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [journalEntries, filter]);

  function handleSubmit() {
    if (!form.childId || !form.content.trim()) return;
    addJournalEntry(form);
    setShowAdd(false);
    setForm({ childId: '', type: 'text', content: '' });
  }

  return (
    <div className="journal">
      <div className="journal-header">
        <h2>Grandchildren's Journal</h2>
        <button className="btn btn--primary btn--small" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* Filter tabs */}
      <div className="journal-filters" role="tablist">
        <button
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('all')}
          role="tab"
          aria-selected={filter === 'all'}
        >
          All
        </button>
        {grandchildren.map(child => (
          <button
            key={child.id}
            className={`filter-tab ${filter === child.id ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(child.id)}
            role="tab"
            aria-selected={filter === child.id}
          >
            {child.name}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="journal-feed">
        {entries.length === 0 ? (
          <div className="journal-empty">
            <BookOpen size={40} strokeWidth={1} />
            <p>No journal entries yet. Add the first one!</p>
          </div>
        ) : (
          entries.map(entry => {
            const child = getPerson(entry.childId);
            const submitter = getPerson(entry.submittedBy);
            const Icon = TYPE_ICONS[entry.type] || BookOpen;
            return (
              <Card key={entry.id} className="journal-entry">
                <div className="entry-header">
                  <Avatar name={child?.name || '?'} photo={child?.photo} size={40} />
                  <div className="entry-meta">
                    <span className="entry-child-name">{child?.name}</span>
                    <span className="entry-date">{formatDate(entry.date)}</span>
                  </div>
                  <Badge variant={entry.type}>{TYPE_LABELS[entry.type]}</Badge>
                </div>
                <div className="entry-content">
                  {entry.type === 'quote' ? (
                    <blockquote className="entry-quote">{entry.content}</blockquote>
                  ) : (
                    <p>{entry.content}</p>
                  )}
                </div>
                {submitter && (
                  <div className="entry-footer">
                    <span className="entry-submitted">Added by {submitter.name}</span>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Entry Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Journal Entry">
        <div className="form-group">
          <label htmlFor="entry-child">Grandchild</label>
          <select
            id="entry-child"
            value={form.childId}
            onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}
          >
            <option value="">Select...</option>
            {grandchildren.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="entry-type">Type</label>
          <select
            id="entry-type"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="text">Update</option>
            <option value="quote">Funny Quote</option>
            <option value="milestone">Milestone</option>
            <option value="photo">Photo</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="entry-content">
            {form.type === 'quote' ? 'What did they say?' : 'What happened?'}
          </label>
          <textarea
            id="entry-content"
            rows={4}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={form.type === 'quote' ? '"They said something funny..."' : 'Write about it...'}
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit}>Save Entry</button>
        </div>
      </Modal>
    </div>
  );
}
