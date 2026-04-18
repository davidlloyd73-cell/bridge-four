import React from 'react';

const SUIT_SYMBOLS = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function ScoreSheet({ scores, totalScores, individualScores, players, onClose }) {
  // Get player names for column headers
  const playerName = (seat) => players?.[seat]?.name || seat;

  return (
    <div className="score-overlay">
      <div className="score-sheet">
        <div className="score-header">
          <h2>Score Sheet</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <table className="score-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Dlr</th>
              <th>Vul</th>
              <th>Contract</th>
              <th>Made</th>
              <th>NS</th>
              <th>EW</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={i} className={i % 4 === 3 ? 'round-end' : ''}>
                <td>{i + 1}</td>
                <td>{s.dealer}</td>
                <td>{vulDisplay(s.vulnerability)}</td>
                <td>{contractDisplay(s.contract)}</td>
                <td>{s.contract ? s.tricksMade : '-'}</td>
                <td className={s.score.NS > 0 ? 'positive' : ''}>{s.score.NS || '-'}</td>
                <td className={s.score.EW > 0 ? 'positive' : ''}>{s.score.EW || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={5}>Total</td>
              <td className="total-score">{totalScores.NS}</td>
              <td className="total-score">{totalScores.EW}</td>
            </tr>
          </tfoot>
        </table>

        {/* Individual Scores — keyed by player NAME so career totals
            survive partnership rotation. Seats are shown for the CURRENT
            rubber only. Any player from a prior rubber (still in
            individualScores) is shown without a seat. */}
        {individualScores && (
          <div className="individual-scores">
            <h3>Individual Standings</h3>
            <div className="individual-grid">
              {(() => {
                const currentBySeat = ['N', 'E', 'S', 'W'].map(seat => ({
                  seat,
                  name: playerName(seat),
                }));
                const seen = new Set();
                const rows = [];
                for (const { seat, name } of currentBySeat) {
                  if (!name || seen.has(name)) continue;
                  seen.add(name);
                  rows.push({
                    seat,
                    name,
                    score: individualScores[name] || 0,
                  });
                }
                // Include any players with historical scores not currently seated
                for (const [name, score] of Object.entries(individualScores)) {
                  if (seen.has(name)) continue;
                  seen.add(name);
                  rows.push({ seat: null, name, score });
                }
                return rows
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div
                      key={p.name}
                      className={`individual-row ${idx === 0 && scores.length > 0 ? 'leader' : ''}`}
                    >
                      <span className="individual-rank">{idx + 1}.</span>
                      <span className="individual-name">{p.name}</span>
                      {p.seat && <span className="individual-seat">({p.seat})</span>}
                      <span className="individual-score">{p.score}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function vulDisplay(vul) {
  if (vul.NS && vul.EW) return 'Both';
  if (vul.NS) return 'NS';
  if (vul.EW) return 'EW';
  return 'None';
}

function contractDisplay(contract) {
  if (!contract) return 'Pass';
  let str = `${contract.level}${SUIT_SYMBOLS[contract.suit] || contract.suit}`;
  if (contract.redoubled) str += 'XX';
  else if (contract.doubled) str += 'X';
  str += ` ${contract.declarer}`;
  return str;
}
