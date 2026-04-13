import React from 'react';
import Card from './Card';

export default function Hand({ cards, onPlayCard, isMyTurn, playableCards, position, isDummy }) {
  if (!cards || cards.length === 0) return null;

  const canPlay = (card) => {
    if (!isMyTurn || !playableCards) return false;
    return playableCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);
  };

  // Bottom position = fan layout for the player's own hand (feels like Trickster)
  const isFan = position === 'bottom';
  // Non-bottom hands always use small cards for compactness
  const useSmall = position !== 'bottom';
  const count = cards.length;

  return (
    <div className={`hand hand-${position} ${isDummy ? 'dummy-hand' : ''} ${isFan ? 'hand-fan' : ''}`}>
      {isDummy && <div className="dummy-label">Dummy</div>}
      <div
        className="hand-cards"
        style={isFan ? { '--card-count': count } : undefined}
      >
        {cards.map((card, i) => (
          <div
            key={`${card.rank}${card.suit}`}
            className="hand-card-slot"
            style={isFan ? { '--card-idx': i } : undefined}
          >
            <Card
              card={card}
              playable={canPlay(card)}
              onClick={canPlay(card) ? () => onPlayCard(card) : undefined}
              small={useSmall}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
