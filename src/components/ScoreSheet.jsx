import React from 'react';

const SUIT_SYMBOLS = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

export default function ScoreSheet({ scores, totalScores, onClose }) {
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
