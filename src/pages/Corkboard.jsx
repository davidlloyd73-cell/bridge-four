import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader } from 'lucide-react';
import { usePins } from '../hooks/usePins';
import { isConfigured } from '../firebase';
import './Corkboard.css';

const TTL_DAYS = 7;

function daysLeft(createdAt) {
  const age = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return TTL_DAYS - Math.floor(age);
}

// ── Thumbtack ─────────────────────────────────────────────────────────────────
function Tack() {
  return (
    <svg className="tack" viewBox="0 0 22 40" aria-hidden="true">
      <circle cx="11" cy="10" r="9" fill="#DC2626" />
      <ellipse cx="8.5" cy="7" rx="3" ry="1.8" fill="rgba(255,255,255,0.45)" />
      <rect x="10" y="18" width="2" height="17" rx="1" fill="rgba(0,0,0,0.30)" />
      <polygon points="9,34 11,39 13,34" fill="rgba(0,0,0,0.38)" />
    </svg>
  );
}

// ── Individual pin card ────────────────────────────────────────────────────────
function PinCard({ pin, onRemove }) {
  const left = daysLeft(pin.createdAt);
  const expirySoon = left <= 1;

  return (
    <div className="pin-card" style={{ '--pin-rotate': `${pin.rotation || 0}deg` }}>
      <Tack />
      <button className="pin-remove" onClick={onRemove} title="Remove from wall">
        <X size={12} />
      </button>

      {pin.imageUrl && (
        <img className="pin-photo" src={pin.imageUrl} alt={pin.caption || 'Photo'} loading="lazy" />
      )}

      {pin.caption && <p className="pin-caption">{pin.caption}</p>}

      <div className="pin-footer">
        <span className="pin-from">{pin.from}</span>
        <span className={`pin-expiry ${expirySoon ? 'pin-expiry--soon' : ''}`}>
          {left <= 0 ? 'Expiring…' : left === 1 ? 'Falls off tomorrow' : `${left}d left`}
        </span>
      </div>
    </div>
  );
}

// ── Setup needed screen ────────────────────────────────────────────────────────
function SetupScreen() {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <span className="setup-icon">🔧</span>
        <h2>Almost ready!</h2>
        <p>Open <code>src/firebase.js</code> and paste in your Firebase project config to connect the family board.</p>
        <ol>
          <li>Go to <strong>console.firebase.google.com</strong></li>
          <li>Create a project → add a web app</li>
          <li>Enable <strong>Firestore</strong> and <strong>Storage</strong></li>
          <li>Copy the <code>firebaseConfig</code> values into <code>src/firebase.js</code></li>
        </ol>
      </div>
    </div>
  );
}

// ── Main corkboard ─────────────────────────────────────────────────────────────
export default function Corkboard() {
  const { pins, loading, error, addPin, removePin } = usePins();
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [from, setFrom] = useState(() => localStorage.getItem('corkboard-name') || '');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  if (!isConfigured) return <SetupScreen />;

  const activePins = pins.filter(p => !p.removed && daysLeft(p.createdAt) > 0);

  function openModal() {
    setShowModal(true);
    setPreview(null);
    setFile(null);
    setCaption('');
    setUploadError('');
  }

  function closeModal() {
    setShowModal(false);
    setPreview(null);
    setFile(null);
    setCaption('');
    setUploadError('');
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) { setUploadError('Please choose a photo first.'); return; }
    setUploading(true);
    setUploadError('');
    try {
      localStorage.setItem('corkboard-name', from);
      await addPin({
        file,
        from,
        caption,
      });
      closeModal();
    } catch (err) {
      console.error(err);
      setUploadError('Upload failed — check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="corkboard-page">
      {/* ── Cork surface ── */}
      <div className="cork-surface">
        {loading && (
          <div className="cork-loading">
            <Loader size={28} className="spin" />
            <p>Loading the board…</p>
          </div>
        )}

        {error && (
          <div className="cork-error">
            <p>⚠️ Couldn't load the board: {error}</p>
          </div>
        )}

        {!loading && !error && activePins.length === 0 && (
          <div className="cork-empty">
            <span className="cork-empty-icon">📋</span>
            <p>The board is clear!</p>
            <p className="cork-empty-hint">Tap the button below to post a photo.</p>
          </div>
        )}

        {!loading && activePins.length > 0 && (
          <div className="pin-grid">
            {activePins.map(pin => (
              <div className="pin-wrapper" key={pin.id}>
                <PinCard
                  pin={pin}
                  onRemove={() => removePin(pin.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button className="cork-fab" onClick={openModal} aria-label="Pin a photo">
        <Camera size={22} />
        <span>Pin a photo</span>
      </button>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Pin a photo</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            {/* Photo picker */}
            <div className="photo-picker" onClick={() => fileInputRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="Preview" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">
                  <Camera size={36} />
                  <span>Tap to take or choose a photo</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="pin-from">Your name</label>
              <input
                id="pin-from"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="Who's pinning this?"
                autoComplete="name"
              />
            </div>

            {/* Caption */}
            <div className="form-group">
              <label htmlFor="pin-caption">Caption <span className="optional">(optional)</span></label>
              <input
                id="pin-caption"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Say something about this photo…"
              />
            </div>

            {uploadError && <p className="upload-error">{uploadError}</p>}

            <div className="form-actions">
              <button className="btn btn--secondary" onClick={closeModal} disabled={uploading}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleSubmit} disabled={uploading}>
                {uploading ? <><Loader size={15} className="spin" /> Uploading…</> : 'Pin it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
