import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';

export default function TrickArea({ currentTrick, lastCompletedTrick, mySeat, contract, tricksWon, trickNumber }) {
  const [displayedTrick, setDisplayedTrick] = useState([]);
  const [trickWinner, setTrickWinner] = useState(null);
  const timerRef = useRef(null);
  const lastProcessedTrick = useRef(null);

  useEffect(() => {
    // If there are cards in the current trick, show them live
    if (currentTrick && currentTrick.length > 0) {
      setDisplayedTrick(currentTrick);
      setTrickWinner(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // If a trick just completed, show it for a while with winner highlighted
    if (lastCompletedTrick && lastCompletedTrick.trickNumber !== lastProcessedTrick.current) {
      lastProcessedTrick.current = lastCompletedTrick.trickNumber;
      setDisplayedTrick(lastCompletedTrick.cards);
      setTrickWinner(lastCompletedTrick.winner);

      timerRef.current = setTimeout(() => {
        setDisplayedTrick([]);
        setTrickWinner(null);
        timerRef.current = null;
      }, 1500);
    } else if (!lastCompletedTrick && (!currentTrick || currentTrick.length === 0)) {
      // Both cleared - nothing to show
      if (!timerRef.current) {
        setDisplayedTrick([]);
        setTrickWinner(null);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentTrick, lastCompletedTrick]);

  const COMPASS = { N: 'top', E: 'right', S: 'bottom', W: 'left' };

  return (
    <div className="trick-area-overlay">
      {/* Trick cards spread near each player — absolute compass positions */}
      {displayedTrick.map(({ seat, card }) => {
        const pos = COMPASS[seat] || 'bottom';
        const isWinner = trickWinner === seat;
        return (
          <div key={seat} className={`trick-card-spread trick-pos-${pos} ${isWinner ? 'trick-winner' : ''}`}>
            <Card card={card} />
          </div>
        );
      })}
    </div>
  );
}

