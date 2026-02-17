import { useState, useMemo } from 'react';
import { Mic, Play, Pause, Plus, BookOpen, Clock, Tag } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { formatDate } from '../utils/dates';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import './MemoryBank.css';

export default function MemoryBank() {
  const { memoryRecordings, addMemoryRecording } = useFamily();
  const [expanded, setExpanded] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterTag, setFilterTag] = useState('all');
  const [form, setForm] = useState({ title: '', transcript: '', tags: '' });

  const allTags = useMemo(() => {
    const tags = new Set();
    memoryRecordings.forEach(r => r.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [memoryRecordings]);

  const recordings = useMemo(() => {
    let list = [...memoryRecordings];
    if (filterTag !== 'all') {
      list = list.filter(r => r.tags?.includes(filterTag));
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [memoryRecordings, filterTag]);

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    addMemoryRecording({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      duration: 0,
      audioUrl: null,
    });
    setShowAdd(false);
    setForm({ title: '', transcript: '', tags: '' });
  }

  return (
    <div className="memory-bank">
      <div className="memory-header">
        <div>
          <h2>Grandpa's Stories</h2>
          <p className="memory-subtitle">Your memories, in your own words</p>
        </div>
        <button className="btn btn--primary btn--small" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> New Story
        </button>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="memory-filters">
          <button
            className={`filter-tab ${filterTag === 'all' ? 'filter-tab--active' : ''}`}
            onClick={() => setFilterTag('all')}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-tab ${filterTag === tag ? 'filter-tab--active' : ''}`}
              onClick={() => setFilterTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Recordings list — bookshelf metaphor */}
      <div className="memory-shelf">
        {recordings.length === 0 ? (
          <div className="memory-empty">
            <Mic size={40} strokeWidth={1} />
            <p>No stories recorded yet. Start sharing your memories.</p>
          </div>
        ) : (
          recordings.map(recording => (
            <Card
              key={recording.id}
              className={`memory-card ${expanded === recording.id ? 'memory-card--expanded' : ''}`}
              onClick={() => setExpanded(expanded === recording.id ? null : recording.id)}
            >
              <div className="memory-card-header">
                <div className="memory-icon">
                  <BookOpen size={24} strokeWidth={1.5} />
                </div>
                <div className="memory-meta">
                  <span className="memory-title">{recording.title}</span>
                  <span className="memory-date">
                    {formatDate(recording.date)}
                    {recording.duration > 0 && (
                      <> · <Clock size={12} /> {formatDuration(recording.duration)}</>
                    )}
                  </span>
                </div>
              </div>

              {recording.tags?.length > 0 && (
                <div className="memory-tags">
                  {recording.tags.map(tag => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              )}

              {expanded === recording.id && recording.transcript && (
                <div className="memory-transcript">
                  <p>{recording.transcript}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="memory-footer">
        <p className="memory-count">
          {memoryRecordings.length} {memoryRecordings.length === 1 ? 'story' : 'stories'} recorded
        </p>
      </div>

      {/* Add Memory Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record a New Story">
        <p className="form-hint">
          In future, you'll be able to record audio directly. For now, write down your story or paste a transcription.
        </p>
        <div className="form-group">
          <label htmlFor="memory-title">Title</label>
          <input
            id="memory-title"
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. How I Met Your Grandmother"
          />
        </div>
        <div className="form-group">
          <label htmlFor="memory-transcript">Story</label>
          <textarea
            id="memory-transcript"
            rows={6}
            value={form.transcript}
            onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))}
            placeholder="Tell your story..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="memory-tags">Tags (comma-separated)</label>
          <input
            id="memory-tags"
            type="text"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="e.g. family history, career, funny"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit}>Save Story</button>
        </div>
      </Modal>
    </div>
  );
}
