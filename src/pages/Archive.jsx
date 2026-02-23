import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Globe, Calendar, Image } from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import { daysSince, formatDate } from '../utils/dates';
import './Archive.css';

const TYPE_LABEL = {
  message:   'Message',
  photo:     'Photo',
  link:      'Link',
  timetable: 'Timetable',
};

function ArchiveItem({ pin }) {
  const reason = pin.removed ? 'Removed from board' : 'Expired after 7 days';
  const pinned = formatDate(pin.createdAt);

  return (
    <div className="archive-item">
      <div className="archive-item-header">
        <span className={`archive-type-badge archive-type-badge--${pin.type}`}>
          {TYPE_LABEL[pin.type] || pin.type}
        </span>
        <span className="archive-from">from {pin.from}</span>
        <span className="archive-date">{pinned}</span>
      </div>

      <div className="archive-item-body">
        {pin.type === 'message' && (
          <p>{pin.content}</p>
        )}

        {pin.type === 'photo' && (
          <>
            {pin.imageUrl ? (
              <img src={pin.imageUrl} alt={pin.content || 'Photo'} className="archive-photo" />
            ) : (
              <div className="archive-photo-placeholder">
                <Image size={20} />
                <span>Photo</span>
              </div>
            )}
            {pin.content && <p className="archive-caption">{pin.content}</p>}
          </>
        )}

        {pin.type === 'link' && (
          <>
            <a
              href={pin.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="archive-link"
            >
              <Globe size={13} />
              {pin.linkTitle || pin.linkUrl}
            </a>
            {pin.content && <p className="archive-caption">{pin.content}</p>}
          </>
        )}

        {pin.type === 'timetable' && (
          <>
            {pin.content && <p className="archive-tt-title">{pin.content}</p>}
            <div className="archive-tt">
              {(pin.timetableItems || []).map((item, i) => (
                <div key={i} className="archive-tt-row">
                  <span className="archive-tt-day">{item.day}</span>
                  {item.time && <span className="archive-tt-time">{item.time}</span>}
                  <span className="archive-tt-event">{item.event}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="archive-item-footer">
        <span className="archive-reason">{reason}</span>
        <span className="archive-age">{daysSince(pin.createdAt)}d ago</span>
      </div>
    </div>
  );
}

export default function Archive() {
  const navigate = useNavigate();
  const { corkPins } = useFamily();
  const [query, setQuery] = useState('');

  const archivedPins = useMemo(() => {
    return (corkPins || [])
      .filter(p => p.removed || daysSince(p.createdAt) >= 7)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [corkPins]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivedPins;
    return archivedPins.filter(p =>
      p.content?.toLowerCase().includes(q) ||
      p.from?.toLowerCase().includes(q) ||
      p.linkTitle?.toLowerCase().includes(q) ||
      p.linkUrl?.toLowerCase().includes(q) ||
      p.timetableItems?.some(t =>
        t.event?.toLowerCase().includes(q) || t.day?.toLowerCase().includes(q)
      )
    );
  }, [archivedPins, query]);

  return (
    <div className="archive-page">
      {/* Header */}
      <div className="archive-header">
        <button className="archive-back-btn" onClick={() => navigate('/corkboard')}>
          <ArrowLeft size={16} />
          Back to board
        </button>
        <div className="archive-title-row">
          <h2 className="archive-title">Pin Archive</h2>
          <span className="archive-count-label">
            {archivedPins.length} note{archivedPins.length !== 1 ? 's' : ''} saved
          </span>
        </div>
        <p className="archive-subtitle">
          Every pin that has left the board lives here — searchable forever.
        </p>
      </div>

      {/* Search */}
      <div className="archive-search-bar">
        <Search size={16} className="archive-search-icon" />
        <input
          type="search"
          className="archive-search-input"
          placeholder="Search by name, content, event…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="archive-search-clear" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="archive-empty">
          {query
            ? `No archived pins match "${query}".`
            : 'Nothing archived yet — pins disappear from the board after 7 days and appear here.'}
        </div>
      ) : (
        <div className="archive-list">
          {filtered.map(pin => (
            <ArchiveItem key={pin.id} pin={pin} />
          ))}
        </div>
      )}
    </div>
  );
}
