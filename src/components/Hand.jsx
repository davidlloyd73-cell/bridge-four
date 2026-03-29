import React from 'react';
import Card from './Card';

export default function Hand({ cards, onPlayCard, isMyTurn, playableCards, position, isDummy, large }) {
  if (!cards || cards.length === 0) return null;

  const canPlay = (card) => {
    if (!isMyTurn || !playableCards) return false;
    return playableCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);
  };

  // large = player's own hand (always full-size). Dummy also full-size. Others small.
  const useSmall = large ? false : isDummy ? false : position !== 'bottom';

  return (
    <div className={`hand hand-${position} ${isDummy ? 'dummy-hand' : ''}`}>
      {isDummy && <div className="dummy-label">Dummy</div>}
      <div className="hand-cards">
        {cards.map((card, i) => (
          <Card
            key={`${card.rank}${card.suit}`}
            card={card}
            playable={canPlay(card)}
            onClick={canPlay(card) ? () => onPlayCard(card) : undefined}
            small={useSmall}
          />
        ))}
      </div>
    </div>
  );
}
