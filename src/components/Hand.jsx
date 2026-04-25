import React from 'react';
import Card from './Card';

const DEFAULT_SUIT_ORDER = ['S', 'H', 'D', 'C'];
const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function orderedSuits(trumpSuit) {
  if (!trumpSuit || trumpSuit === 'NT' || !DEFAULT_SUIT_ORDER.includes(trumpSuit)) {
    return DEFAULT_SUIT_ORDER;
  }
  return [trumpSuit, ...DEFAULT_SUIT_ORDER.filter(s => s !== trumpSuit)];
}

export default function Hand({ cards, onPlayCard, isMyTurn, playableCards, position, isDummy, large, trumpSuit }) {
  if (!cards || cards.length === 0) return null;

  const canPlay = (card) => {
    if (!isMyTurn || !playableCards) return false;
    return playableCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);
  };

  // Fan only at the bottom — the South player (or whoever sits at bottom) gets
  // the full spread. North/East/West own-hand shows as a compact overlapping row.
  const isFan = !!large && position === 'bottom';
  // Full-size cards for the fan; small for everything else.
  const useSmall = large ? !isFan : position !== 'bottom';
  const count = cards.length;

  // Dummy is laid out as 4 columns (one per suit), trumps leftmost.
  // Exception: when the human is the dummy (large=true) we keep the fan
  // layout for the player's own hand — the grid is for partner dummies only.
  if (isDummy && !large) {
    // Sort ascending so the highest card is last in DOM order and paints on
    // top of the others — it ends up fully visible at the bottom of the
    // column, while the lower cards show only their top-left rank+suit
    // corners as a stack above it.
    const columns = orderedSuits(trumpSuit).map(suit => ({
      suit,
      cards: cards
        .filter(c => c.suit === suit)
        .sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]),
    }));

    return (
      <div className={`hand hand-${position} dummy-hand dummy-grid`}>
        <div className="dummy-label">Dummy</div>
        <div className="dummy-columns">
          {columns.map(col => (
            <div key={col.suit} className={`dummy-column suit-${col.suit}`}>
              {col.cards.length === 0 ? (
                <div className="dummy-empty">—</div>
              ) : (
                col.cards.map((card, idx) => (
                  <div key={`${card.rank}${card.suit}`} className="dummy-slot" style={{ position: 'relative', zIndex: idx + 1 }}>
                    <Card
                      card={card}
                      playable={canPlay(card)}
                      onClick={canPlay(card) ? () => onPlayCard(card) : undefined}
                      small
                    />
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`hand hand-${position} ${isFan ? 'hand-fan' : ''}`}>
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
