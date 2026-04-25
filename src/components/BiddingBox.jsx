import React from 'react';

const SUIT_SYM = { C: '♣', D: '♦', H: '♥', S: '♠' };

// Bridge colour convention: hearts & diamonds red, clubs & spades black.
// On the dark background "black" suits render as near-white so they're readable.
const SUIT_DISPLAY = {
  C:  { symbol: '♣', color: 'suit-black' },
  D:  { symbol: '♦', color: 'suit-red'   },
  H:  { symbol: '♥', color: 'suit-red'   },
  S:  { symbol: '♠', color: 'suit-black' },
  NT: { symbol: 'NT', color: 'suit-nt'   },
};

export default function BiddingBox({ validBids, onBid }) {
  if (!validBids) return null;

  const canBid = (level, suit) =>
    validBids.some(b => b.type === 'bid' && b.level === level && b.suit === suit);
  const canDouble   = validBids.some(b => b.type === 'double');
  const canRedouble = validBids.some(b => b.type === 'redouble');

  return (
    <div className="bidding-box">
      <h3>Your Bid</h3>
      <div className="bid-grid">
        {[1, 2, 3, 4, 5, 6, 7].map(level => (
          <div key={level} className="bid-row">
            {['C', 'D', 'H', 'S', 'NT'].map(suit => {
              const available = canBid(level, suit);
              const { symbol, color } = SUIT_DISPLAY[suit];
              return (
                <button
                  key={`${level}${suit}`}
                  className={`bid-btn ${available ? '' : 'disabled'}`}
                  disabled={!available}
                  onClick={() => onBid({ type: 'bid', level, suit })}
                >
                  <span className="bid-level">{level}</span>
                  <span className={`bid-suit-sym ${color}`}>{symbol}</span>
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
          Dbl
        </button>
        <button
          className={`bid-action redouble ${!canRedouble ? 'disabled' : ''}`}
          disabled={!canRedouble}
          onClick={() => onBid({ type: 'redouble' })}
        >
          Rdbl
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

  // Build rows of raw bid objects (null = empty cell)
  const rows = [];
  let currentRow = new Array(4).fill(null);
  let col = 0;

  for (const bid of bids) {
    // First bid: skip to its column position
    if (rows.length === 0 && col === 0) {
      const seatIdx = orderedSeats.indexOf(bid.seat);
      if (seatIdx > 0) col = seatIdx;
    }
    currentRow[col] = bid;
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
              {row.map((bid, j) => (
                <td key={j}>
                  {bid && <BidCell bid={bid} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BidCell({ bid }) {
  if (bid.type === 'pass')     return <span className="hist-pass">Pass</span>;
  if (bid.type === 'double')   return <span className="hist-dbl">Dbl</span>;
  if (bid.type === 'redouble') return <span className="hist-rdbl">Rdbl</span>;
  if (bid.type === 'bid') {
    const sym   = SUIT_SYM[bid.suit] || bid.suit;
    const isRed = bid.suit === 'H' || bid.suit === 'D';
    return (
      <span className="hist-bid">
        {bid.level}
        <span className={isRed ? 'suit-red' : 'suit-black'}>{sym}</span>
      </span>
    );
  }
  return null;
}
