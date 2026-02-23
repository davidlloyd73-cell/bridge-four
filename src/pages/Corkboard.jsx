import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive, Plus, X, ExternalLink, Globe,
  MessageSquare, Image, Calendar,
} from 'lucide-react';
import { useFamily } from '../data/FamilyContext';
import Modal from '../components/Modal';
import { daysSince, formatDate } from '../utils/dates';
import './Corkboard.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_BG = {
  yellow: '#FFF8A0',
  blue:   '#BFE6FF',
  pink:   '#FFD6E7',
  green:  '#C8F5D6',
  white:  '#FFFFF0',
};

const TACK_COLOR = {
  message:   '#DC2626',
  photo:     '#059669',
  link:      '#7C3AED',
  timetable: '#D97706',
};

const NOTE_COLORS = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'blue',   label: 'Blue'   },
  { value: 'pink',   label: 'Pink'   },
  { value: 'green',  label: 'Green'  },
  { value: 'white',  label: 'Cream'  },
];

const TYPE_OPTIONS = [
  { value: 'message',   icon: MessageSquare, label: 'Message'   },
  { value: 'photo',     icon: Image,         label: 'Photo'     },
  { value: 'link',      icon: Globe,         label: 'Link'      },
  { value: 'timetable', icon: Calendar,      label: 'Timetable' },
];

// ── Thumbtack SVG ─────────────────────────────────────────────────────────────

function Tack({ type }) {
  const color = TACK_COLOR[type] || '#DC2626';
  return (
    <svg className="tack" viewBox="0 0 22 40" aria-hidden="true">
      {/* head */}
      <circle cx="11" cy="10" r="9" fill={color} />
      {/* glint */}
      <ellipse cx="8.5" cy="7" rx="3" ry="1.8" fill="rgba(255,255,255,0.45)" />
      {/* shaft */}
      <rect x="10" y="18" width="2" height="17" rx="1" fill="rgba(0,0,0,0.30)" />
      {/* tip */}
      <polygon points="9,34 11,39 13,34" fill="rgba(0,0,0,0.38)" />
    </svg>
  );
}

// ── Pin card ──────────────────────────────────────────────────────────────────

function PinCard({ pin, onRemove }) {
  const bg = NOTE_BG[pin.pinColor] || NOTE_BG.yellow;
  const age = daysSince(pin.createdAt);
  const daysLeft = 7 - age;

  return (
    <div
      className="pin-card"
      style={{ '--pin-bg': bg, '--pin-rotate': `${pin.rotation || 0}deg` }}
    >
      <Tack type={pin.type} />

      <button className="pin-remove" onClick={onRemove} title="Remove from wall">
        <X size={12} />
      </button>

      <div className="pin-body">
        {pin.type === 'message' && (
          <p className="pin-text">{pin.content}</p>
        )}

        {pin.type === 'photo' && (
          <>
            {pin.imageUrl ? (
              <img className="pin-photo" src={pin.imageUrl} alt={pin.content || 'Photo'} />
            ) : (
              <div className="pin-photo-placeholder">
                <Image size={28} />
                <span>Photo</span>
              </div>
            )}
            {pin.content && <p className="pin-caption">{pin.content}</p>}
          </>
        )}

        {pin.type === 'link' && (
          <>
            <a
              className="pin-link"
              href={pin.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe size={13} />
              <span>{pin.linkTitle || pin.linkUrl}</span>
              <ExternalLink size={11} className="pin-link-ext" />
            </a>
            {pin.content && <p className="pin-text pin-text--sm">{pin.content}</p>}
          </>
        )}

        {pin.type === 'timetable' && (
          <>
            {pin.content && <p className="pin-timetable-title">{pin.content}</p>}
            <div className="pin-timetable">
              {(pin.timetableItems || []).map((item, i) => (
                <div key={i} className="pin-timetable-row">
                  <span className="pin-timetable-day">{item.day}</span>
                  {item.time && <span className="pin-timetable-time">{item.time}</span>}
                  <span className="pin-timetable-event">{item.event}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pin-footer">
        <span className="pin-from">{pin.from}</span>
        <span className={`pin-expiry ${daysLeft <= 1 ? 'pin-expiry--soon' : ''}`}>
          {daysLeft <= 0 ? 'Expiring…' : daysLeft === 1 ? 'Falls off tomorrow' : `${daysLeft}d left`}
        </span>
      </div>
    </div>
  );
}

// ── Default form state ────────────────────────────────────────────────────────

function blankForm() {
  return {
    type: 'message',
    from: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    linkTitle: '',
    timetableItems: [{ day: '', time: '', event: '' }],
    pinColor: 'yellow',
  };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Corkboard() {
  const { corkPins, persons, addCorkPin, removeFromWall } = useFamily();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blankForm);

  const activePins = useMemo(() => {
    return (corkPins || []).filter(p => !p.removed && daysSince(p.createdAt) < 7);
  }, [corkPins]);

  const archivedCount = useMemo(() => {
    return (corkPins || []).filter(p => p.removed || daysSince(p.createdAt) >= 7).length;
  }, [corkPins]);

  const familyNames = useMemo(() => {
    return persons.filter(p => p.id !== 'p1').map(p => p.name);
  }, [persons]);

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function addTimetableRow() {
    setForm(f => ({
      ...f,
      timetableItems: [...f.timetableItems, { day: '', time: '', event: '' }],
    }));
  }

  function removeTimetableRow(i) {
    setForm(f => ({
      ...f,
      timetableItems: f.timetableItems.filter((_, idx) => idx !== i),
    }));
  }

  function updateTimetableRow(i, field, value) {
    setForm(f => ({
      ...f,
      timetableItems: f.timetableItems.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row
      ),
    }));
  }

  function handleSubmit() {
    const pin = {
      type: form.type,
      from: form.from.trim() || 'Family',
      content: form.content.trim(),
      pinColor: form.pinColor,
      rotation: parseFloat((Math.random() * 6 - 3).toFixed(1)),
      createdAt: new Date().toISOString().slice(0, 10),
      removed: false,
    };
    if (form.type === 'photo') {
      pin.imageUrl = form.imageUrl.trim();
    }
    if (form.type === 'link') {
      pin.linkUrl  = form.linkUrl.trim();
      pin.linkTitle = form.linkTitle.trim();
    }
    if (form.type === 'timetable') {
      pin.timetableItems = form.timetableItems.filter(r => r.event.trim());
    }
    addCorkPin(pin);
    setShowModal(false);
    setForm(blankForm());
  }

  function closeModal() {
    setShowModal(false);
    setForm(blankForm());
  }

  return (
    <div className="corkboard-page">
      {/* ── Cork wall ── */}
      <div className="cork-surface">
        {/* Top bar */}
        <div className="cork-topbar">
          <div className="cork-topbar-left">
            <h2 className="cork-heading">Family Corkboard</h2>
            <p className="cork-subtext">
              Pins disappear after 7 days — always saved in the Archive
            </p>
          </div>
          <Link to="/archive" className="archive-link-btn">
            <Archive size={15} />
            Archive
            {archivedCount > 0 && (
              <span className="archive-badge">{archivedCount}</span>
            )}
          </Link>
        </div>

        {/* WhatsApp / email hint */}
        <div className="cork-channel-hint">
          <span className="cork-channel-icon">📱</span>
          <span>
            Family can pin things by <strong>WhatsApp</strong> or{' '}
            <strong>email</strong> — messages, photos, links and timetables
            all welcome
          </span>
        </div>

        {/* Pins */}
        {activePins.length === 0 ? (
          <div className="cork-empty">
            <span className="cork-empty-icon">📋</span>
            <p>The board is clear!</p>
            <p className="cork-empty-hint">
              Use the button below to pin a message, photo, link or timetable.
            </p>
          </div>
        ) : (
          <div className="pin-grid">
            {activePins.map(pin => (
              <div className="pin-wrapper" key={pin.id}>
                <PinCard pin={pin} onRemove={() => removeFromWall(pin.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button className="cork-fab" onClick={() => setShowModal(true)}>
        <Plus size={20} />
        <span>Pin something</span>
      </button>

      {/* ── Add-pin modal ── */}
      <Modal open={showModal} onClose={closeModal} title="Pin to the board">
        {/* Type */}
        <div className="form-group">
          <label>What are you pinning?</label>
          <div className="type-picker">
            {TYPE_OPTIONS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                className={`type-btn ${form.type === value ? 'type-btn--active' : ''}`}
                onClick={() => setField('type', value)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* From */}
        <div className="form-group">
          <label htmlFor="pin-from">From</label>
          <input
            id="pin-from"
            list="family-names-list"
            value={form.from}
            onChange={e => setField('from', e.target.value)}
            placeholder="Who's pinning this?"
          />
          <datalist id="family-names-list">
            {familyNames.map(n => <option key={n} value={n} />)}
          </datalist>
        </div>

        {/* Message */}
        {form.type === 'message' && (
          <div className="form-group">
            <label htmlFor="pin-msg">Message</label>
            <textarea
              id="pin-msg"
              rows={4}
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              placeholder="Write your message…"
            />
          </div>
        )}

        {/* Photo */}
        {form.type === 'photo' && (
          <>
            <div className="form-group">
              <label htmlFor="pin-imgurl">Image URL</label>
              <input
                id="pin-imgurl"
                type="url"
                value={form.imageUrl}
                onChange={e => setField('imageUrl', e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pin-caption">Caption (optional)</label>
              <textarea
                id="pin-caption"
                rows={2}
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                placeholder="Add a caption…"
              />
            </div>
          </>
        )}

        {/* Link */}
        {form.type === 'link' && (
          <>
            <div className="form-group">
              <label htmlFor="pin-linkurl">URL</label>
              <input
                id="pin-linkurl"
                type="url"
                value={form.linkUrl}
                onChange={e => setField('linkUrl', e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pin-linktitle">Title</label>
              <input
                id="pin-linktitle"
                value={form.linkTitle}
                onChange={e => setField('linkTitle', e.target.value)}
                placeholder="Give this link a name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pin-linknotes">Notes (optional)</label>
              <textarea
                id="pin-linknotes"
                rows={2}
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                placeholder="Why is this worth sharing?"
              />
            </div>
          </>
        )}

        {/* Timetable */}
        {form.type === 'timetable' && (
          <>
            <div className="form-group">
              <label htmlFor="pin-tt-title">Title</label>
              <input
                id="pin-tt-title"
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                placeholder="e.g. Alfie's football schedule"
              />
            </div>
            <div className="form-group">
              <label>Schedule</label>
              <div className="timetable-rows">
                {form.timetableItems.map((row, i) => (
                  <div key={i} className="timetable-row-edit">
                    <input
                      value={row.day}
                      onChange={e => updateTimetableRow(i, 'day', e.target.value)}
                      placeholder="Day / Date"
                      className="tt-day"
                    />
                    <input
                      value={row.time}
                      onChange={e => updateTimetableRow(i, 'time', e.target.value)}
                      placeholder="Time"
                      className="tt-time"
                    />
                    <input
                      value={row.event}
                      onChange={e => updateTimetableRow(i, 'event', e.target.value)}
                      placeholder="Event"
                      className="tt-event"
                    />
                    {form.timetableItems.length > 1 && (
                      <button
                        type="button"
                        className="tt-remove"
                        onClick={() => removeTimetableRow(i)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={addTimetableRow}
                >
                  + Add row
                </button>
              </div>
            </div>
          </>
        )}

        {/* Color picker */}
        <div className="form-group">
          <label>Note colour</label>
          <div className="color-picker">
            {NOTE_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                className={`color-dot ${form.pinColor === c.value ? 'color-dot--selected' : ''}`}
                style={{ background: NOTE_BG[c.value] }}
                title={c.label}
                onClick={() => setField('pinColor', c.value)}
              />
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn--secondary" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            Pin it
          </button>
        </div>
      </Modal>
    </div>
  );
}
