import React from 'react';
import Card from './Card';

// Maps seat positions relative to "me" (the player at bottom)
const POSITION_MAP = {
  bottom: 'trick-south',
  left: 'trick-west',
  top: 'trick-north',
  right: 'trick-east',
};

export default function TrickArea({ currentTrick, mySeat, contract, tricksWon, trickNumber }) {
  // Map seats to positions relative to me
  const seatToPosition = getSeatPositions(mySeat);

  return (
    <div className="trick-area">
      {contract && (
        <div className="contract-display">
          <span className="contract-text">
            {contract.level}{formatSuit(contract.suit)}
            {contract.doubled ? ' X' : ''}
            {contract.redoubled ? ' XX' : ''}
          </span>
          <span className="contract-by"> by {contract.declarer}</span>
        </div>
      )}

      <div className="trick-cards">
        {currentTrick.map(({ seat, card }) => (
          <div key={seat} className={`trick-card ${seatToPosition[seat]}`}>
            <Card card={card} small />
          </div>
        ))}
      </div>

      {tricksWon && (
        <div className="trick-count">
          <span>Trick {trickNumber}/13</span>
          <span className="tricks-ns">NS: {tricksWon.NS}</span>
          <span className="tricks-ew">EW: {tricksWon.EW}</span>
        </div>
      )}
    </div>
  );
}

function getSeatPositions(mySeat) {
  const order = ['S', 'W', 'N', 'E'];
  const positions = ['bottom', 'left', 'top', 'right'];
  const myIdx = order.indexOf(mySeat);
  const map = {};
  for (let i = 0; i < 4; i++) {
    map[order[(myIdx + i) % 4]] = positions[i];
  }
  return map;
}

const SUIT_SYMBOLS = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'NT' };

function formatSuit(suit) {
  return SUIT_SYMBOLS[suit] || suit;
}
