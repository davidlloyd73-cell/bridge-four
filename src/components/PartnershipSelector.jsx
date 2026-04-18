import React, { useState } from 'react';

// Given 4 player names, return the 3 possible ways to pair them up.
// Each entry is { nsPair: [a, b], ewPair: [c, d] } — the NS pair faces the
// EW pair. We fix the first name as one of the NS players so we only
// generate unique pairings (otherwise [a,b] and [b,a] would duplicate).
function enumeratePairings(names) {
  if (!names || names.length !== 4) return [];
  const [a, b, c, d] = names;
  return [
    { nsPair: [a, b], ewPair: [c, d] },
    { nsPair: [a, c], ewPair: [b, d] },
    { nsPair: [a, d], ewPair: [b, c] },
  ];
}

export default function PartnershipSelector({
  players,
  myName,
  onChoose,
  title = 'Choose Partnerships',
  subtitle,
}) {
  const [submitting, setSubmitting] = useState(false);

  // Collect the 4 seated player names in a stable order (N, E, S, W).
  const names = ['N', 'E', 'S', 'W']
    .map(s => players?.[s]?.name)
    .filter(Boolean);

  if (names.length !== 4) {
    return (
      <div className="partnership-overlay">
        <div className="partnership-modal">
          <h2>{title}</h2>
          <p className="partnership-waiting">
            Waiting for all 4 players to join...
          </p>
          <div className="partnership-seats">
            {['N', 'E', 'S', 'W'].map(s => (
              <div
                key={s}
                className={`partnership-seat ${players?.[s] ? 'filled' : 'empty'}`}
              >
                <span className="seat-label">{s}</span>
                <span className="seat-name">{players?.[s]?.name || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pairings = enumeratePairings(names);

  const handleChoose = (p) => {
    if (submitting) return;
    setSubmitting(true);
    onChoose(p, () => setSubmitting(false));
  };

  return (
    <div className="partnership-overlay">
      <div className="partnership-modal">
        <h2>{title}</h2>
        {subtitle && <p className="partnership-subtitle">{subtitle}</p>}
        <p className="partnership-instructions">
          Pick how you'd like the partnerships to be arranged for this rubber.
          {myName && ' Any player can choose.'}
        </p>
        <div className="partnership-options">
          {pairings.map((p, idx) => {
            // Determine my partner in this pairing (if my name is in the list)
            let partnerLabel = null;
            if (myName) {
              if (p.nsPair.includes(myName)) {
                partnerLabel = p.nsPair.find(n => n !== myName);
              } else if (p.ewPair.includes(myName)) {
                partnerLabel = p.ewPair.find(n => n !== myName);
              }
            }
            return (
              <button
                key={idx}
                className="partnership-option"
                disabled={submitting}
                onClick={() => handleChoose(p)}
              >
                <div className="pair-row">
                  <span className="pair-label">Pair 1</span>
                  <span className="pair-names">
                    {p.nsPair[0]} &amp; {p.nsPair[1]}
                  </span>
                </div>
                <div className="vs">vs</div>
                <div className="pair-row">
                  <span className="pair-label">Pair 2</span>
                  <span className="pair-names">
                    {p.ewPair[0]} &amp; {p.ewPair[1]}
                  </span>
                </div>
                {partnerLabel && (
                  <div className="partner-hint">
                    Your partner: <strong>{partnerLabel}</strong>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
