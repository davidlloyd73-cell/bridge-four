import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { usePins } from '../hooks/usePins';
import './Archive.css';

const TTL_DAYS = 7;

function daysAgo(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

function ArchiveItem({ pin }) {
  const reason = pin.removed ? 'Removed from board' : 'Expired after 7 days';

  return (
    <div className="archive-item">
      <div className="archive-item-header">
        <span className="archive-from">from {pin.from}</span>
        <span className="archive-date">{daysAgo(pin.createdAt)}d ago</span>
      </div>

      <div className="archive-item-body">
        {pin.imageUrl && (
          <img src={pin.imageUrl} alt={pin.caption || 'Photo'} className="archive-photo" loading="lazy" />
        )}
        {pin.caption && <p className="archive-caption">{pin.caption}</p>}
      </div>

      <div className="archive-item-footer">
        <span className="archive-reason">{reason}</span>
      </div>
    </div>
  );
}

export default function Archive() {
  const { pins, loading } = usePins();
  const [query, setQuery] = useState('');

  const archivedPins = useMemo(() => {
    return pins
      .filter(p => p.removed || daysAgo(p.createdAt) >= TTL_DAYS)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [pins]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivedPins;
    return archivedPins.filter(p =>
      p.caption?.toLowerCase().includes(q) ||
      p.from?.toLowerCase().includes(q)
    );
  }, [archivedPins, query]);

  return (
    <div className="archive-page">
      <div className="archive-header">
        <h2 className="archive-title">Pin Archive</h2>
        <p className="archive-subtitle">
          Photos that have left the board — {archivedPins.length} saved
        </p>
      </div>

      <div className="archive-search-bar">
        <Search size={16} className="archive-search-icon" />
        <input
          type="search"
          className="archive-search-input"
          placeholder="Search by name or caption…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="archive-search-clear" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {loading && <p className="archive-empty">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="archive-empty">
          {query
            ? `No archived photos match "${query}".`
            : 'Nothing archived yet — photos disappear from the board after 7 days and appear here.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="archive-list">
          {filtered.map(pin => (
            <ArchiveItem key={pin.id} pin={pin} />
          ))}
        </div>
      )}
    </div>
  );
}
