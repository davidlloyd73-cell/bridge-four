import React from 'react';

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLORS = { S: 'black', H: 'red', D: 'red', C: 'black' };

export default function Card({ card, onClick, playable, small, faceDown }) {
  if (faceDown) {
    return <div className={`card face-down ${small ? 'small' : ''}`} />;
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`card ${color} ${playable ? 'playable' : ''} ${small ? 'small' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="card-corner top-left">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
      <div className="card-center">
        <span className="card-suit-large">{symbol}</span>
      </div>
      <div className="card-corner bottom-right">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit">{symbol}</span>
      </div>
    </div>
  );
}
