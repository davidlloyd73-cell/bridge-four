import React from 'react';

const SUIT_DISPLAY = {
  C: { symbol: '♣', color: 'green' },
  D: { symbol: '♦', color: 'orange' },
  H: { symbol: '♥', color: 'red' },
  S: { symbol: '♠', color: 'blue' },
  NT: { symbol: 'NT', color: 'black' },
};

export default function BiddingBox({ validBids, onBid, biddingHistory, dealer }) {
  if (!validBids) return null;

  const canBid = (level, suit) =>
    validBids.some(b => b.type === 'bid' && b.level === level && b.suit === suit);
  const canDouble = validBids.some(b => b.type === 'double');
  const canRedouble = validBids.some(b => b.type === 'redouble');

  return (
    <div className="bidding-box">
      <h3>Your Bid</h3>
      <div className="bid-grid">
        {[1, 2, 3, 4, 5, 6, 7].map(level => (
          <div key={level} className="bid-row">
            {['C', 'D', 'H', 'S', 'NT'].map(suit => {
              const available = canBid(level, suit);
              const display = SUIT_DISPLAY[suit];
              return (
                <button
                  key={`${level}${suit}`}
                  className={`bid-btn ${available ? '' : 'disabled'}`}
                  disabled={!available}
                  onClick={() => onBid({ type: 'bid', level, suit })}
                >
                  <span className="bid-level">{level}</span>
                  <span className={`bid-suit-sym ${display.color}`}>{display.symbol}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="bid-actions">
        <button className="bid-action pass" onClick={() => onBid({ type: 'pass' })}>
          Pass
        </button>
        <button
          className={`bid-action double ${!canDouble ? 'disabled' : ''}`}
          disabled={!canDouble}
          onClick={() => onBid({ type: 'double' })}
        >
          Double
        </button>
        <button
          className={`bid-action redouble ${!canRedouble ? 'disabled' : ''}`}
          disabled={!canRedouble}
          onClick={() => onBid({ type: 'redouble' })}
        >
          Redouble
        </button>
      </div>
    </div>
  );
}

export function BiddingHistory({ bids, dealer }) {
  if (!bids || bids.length === 0) return null;

  const seatOrder = ['N', 'E', 'S', 'W'];
  const dealerIdx = seatOrder.indexOf(dealer);
  const orderedSeats = [...seatOrder.slice(dealerIdx), ...seatOrder.slice(0, dealerIdx)];

  // Build bid table
  const rows = [];
  let currentRow = new Array(4).fill(null);
  let col = 0;

  for (const bid of bids) {
    const seatIdx = orderedSeats.indexOf(bid.seat);
    // If this is the first bid, add empty cells for seats before dealer
    if (rows.length === 0 && col === 0 && seatIdx > 0) {
      for (let i = 0; i < seatIdx; i++) {
        currentRow[i] = '-';
        col++;
      }
    }
    currentRow[col] = formatBidDisplay(bid);
    col++;
    if (col >= 4) {
      rows.push(currentRow);
      currentRow = new Array(4).fill(null);
      col = 0;
    }
  }
  if (currentRow.some(c => c !== null)) rows.push(currentRow);

  return (
    <div className="bidding-history">
      <table>
        <thead>
          <tr>
            {orderedSeats.map(s => <th key={s}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={cell === 'Pass' ? 'pass-bid' : ''}>
                  {cell || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SUIT_SYM = { C: '♣', D: '♦', H: '♥', S: '♠' };

function formatBidDisplay(bid) {
  switch (bid.type) {
    case 'pass': return 'Pass';
    case 'double': return 'Dbl';
    case 'redouble': return 'Rdbl';
    case 'bid': return `${bid.level}${SUIT_SYM[bid.suit] || bid.suit}`;
    default: return '?';
  }
}
