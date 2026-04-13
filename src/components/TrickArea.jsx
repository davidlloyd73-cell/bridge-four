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

  const seatToPosition = (RELATIVE_POSITIONS[mySeat] || RELATIVE_POSITIONS.S);

  return (
    <div className="trick-area-overlay">
      {/* Contract + trick count header */}
      <div className="trick-info">
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
        {tricksWon && (
          <div className="trick-count">
            <span>Trick {trickNumber}/13</span>
            <span className="tricks-ns">NS: {tricksWon.NS}</span>
            <span className="tricks-ew">EW: {tricksWon.EW}</span>
          </div>
        )}
      </div>

      {/* Trick cards spread near each player */}
      {displayedTrick.map(({ seat, card }) => {
        const pos = seatToPosition[seat];
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

// Rotate so mySeat is always at the bottom of the table view
const RELATIVE_POSITIONS = {
  S: { N: 'top',    E: 'right', S: 'bottom', W: 'left'   },
  W: { N: 'left',   E: 'top',   S: 'right',  W: 'bottom' },
  N: { N: 'bottom', E: 'left',  S: 'top',    W: 'right'  },
  E: { N: 'right',  E: 'bottom',S: 'left',   W: 'top'    },
};

const SUIT_SYMBOLS = { C: '&#9827;', D: '&#9830;', H: '&#9829;', S: '&#9824;', NT: 'NT' };
const SUIT_DISPLAY = { C: '\u2663', D: '\u2666', H: '\u2665', S: '\u2660', NT: 'NT' };

function formatSuit(suit) {
  return SUIT_DISPLAY[suit] || suit;
}
