import React from 'react';
import { BiddingHistory } from './BiddingBox';

const SEAT_NAMES = { N: 'North', E: 'East', S: 'South', W: 'West' };
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'NT' };
// Alternating black/red for readability: S(black), H(red), C(black), D(red)
const SUIT_ORDER = ['S', 'H', 'C', 'D'];

function groupBySuit(cards) {
  const groups = {};
  for (const suit of SUIT_ORDER) {
    groups[suit] = cards.filter(c => c.suit === suit);
  }
  return groups;
}

function HandDisplay({ cards, seat, playerName, hcp, isDealer, isDeclarer, isDummy }) {
  if (!cards || cards.length === 0) return null;
  const suited = groupBySuit(cards);

  return (
    <div className={`review-hand review-hand-${seat}`}>
      <div className="review-hand-header">
        <span className="review-seat-name">{playerName || SEAT_NAMES[seat]}</span>
        <span className="review-seat-label">({SEAT_NAMES[seat]})</span>
        {hcp !== undefined && <span className="review-hcp">{hcp} HCP</span>}
        {isDealer && <span className="review-badge dealer-badge">D</span>}
        {isDeclarer && <span className="review-badge declarer-badge">Declarer</span>}
        {isDummy && <span className="review-badge dummy-badge-tag">Dummy</span>}
      </div>
      <div className="review-hand-suits">
        {SUIT_ORDER.map(suit => (
          <div key={suit} className="review-suit-row">
            <span className={`review-suit-symbol ${suit === 'H' || suit === 'D' ? 'red' : 'black'}`}>
              {SUIT_SYMBOLS[suit]}
            </span>
            <span className="review-suit-cards">
              {suited[suit].length > 0
                ? suited[suit].map(c => c.rank).join(' ')
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DealReview({
  reviewHands,
  reviewBidding,
  reviewBiddingDealer,
  reviewHCP,
  lastScore,
  isRoundComplete,
  totalScores,
  individualScores,
  players,
  onNextDeal,
  onNewRound,
  onAnalyse,
  analysisLoading,
  analysisText,
}) {
  if (!reviewHands) return null;

  const contract = lastScore?.contract;
  const needed = contract ? 6 + contract.level : 0;
  const made = lastScore?.tricksMade || 0;
  const diff = made - needed;
  const playerName = (seat) => players?.[seat]?.name || SEAT_NAMES[seat];

  return (
    <div className="deal-review-overlay">
      <div className="deal-review">
        <h2>Deal Review</h2>

        {/* Result summary */}
        <div className="review-result">
          {contract ? (
            <>
              <span className="review-contract">
                {contract.level}{SUIT_SYMBOLS[contract.suit]}
                {contract.doubled ? 'X' : ''}{contract.redoubled ? 'XX' : ''} by {playerName(contract.declarer)}
              </span>
              <span className="review-tricks">
                {made} tricks ({diff >= 0 ? `made${diff > 0 ? ' +' + diff : ''}` : `down ${Math.abs(diff)}`})
              </span>
              <span className="review-score">
                NS: {lastScore.score.NS > 0 ? '+' : ''}{lastScore.score.NS} | EW: {lastScore.score.EW > 0 ? '+' : ''}{lastScore.score.EW}
              </span>
            </>
          ) : (
            <span className="review-passed-out">Passed Out — No Score</span>
          )}
        </div>

        {/* Main content: hands + bidding */}
        <div className="review-content">
          {/* All 4 hands in compass layout */}
          <div className="review-hands-compass">
            <div className="compass-top">
              <HandDisplay
                cards={reviewHands.N}
                seat="N"
                playerName={playerName('N')}
                hcp={reviewHCP?.N}
                isDealer={reviewBiddingDealer === 'N'}
                isDeclarer={contract?.declarer === 'N'}
                isDummy={contract?.dummy === 'N'}
              />
            </div>
            <div className="compass-middle">
              <HandDisplay
                cards={reviewHands.W}
                seat="W"
                playerName={playerName('W')}
                hcp={reviewHCP?.W}
                isDealer={reviewBiddingDealer === 'W'}
                isDeclarer={contract?.declarer === 'W'}
                isDummy={contract?.dummy === 'W'}
              />
              <div className="compass-center-spacer" />
              <HandDisplay
                cards={reviewHands.E}
                seat="E"
                playerName={playerName('E')}
                hcp={reviewHCP?.E}
                isDealer={reviewBiddingDealer === 'E'}
                isDeclarer={contract?.declarer === 'E'}
                isDummy={contract?.dummy === 'E'}
              />
            </div>
            <div className="compass-bottom">
              <HandDisplay
                cards={reviewHands.S}
                seat="S"
                playerName={playerName('S')}
                hcp={reviewHCP?.S}
                isDealer={reviewBiddingDealer === 'S'}
                isDeclarer={contract?.declarer === 'S'}
                isDummy={contract?.dummy === 'S'}
              />
            </div>
          </div>

          {/* Bidding sequence */}
          {reviewBidding && reviewBidding.length > 0 && (
            <div className="review-bidding-section">
              <h3>Bidding</h3>
              <BiddingHistory bids={reviewBidding} dealer={reviewBiddingDealer} />
            </div>
          )}
        </div>

        {/* Claude Analysis result */}
        {(analysisText || analysisLoading) && (
          <div className="review-analysis">
            <h3>Claude's Analysis</h3>
            {analysisLoading ? (
              <div className="analysis-loading">Analysing deal...</div>
            ) : (() => {
              const bestMatch = analysisText.match(/BEST CONTRACT:\s*(.*?)(?:\n\n|ANALYSIS:)/s);
              const analysisMatch = analysisText.match(/ANALYSIS:\s*([\s\S]*)/);
              if (bestMatch) {
                return (
                  <>
                    <div className="analysis-best-contract">{bestMatch[1].trim()}</div>
                    <div className="analysis-text">{analysisMatch ? analysisMatch[1].trim() : ''}</div>
                  </>
                );
              }
              return <div className="analysis-text">{analysisText}</div>;
            })()}
          </div>
        )}

        {/* Individual standings */}
        {individualScores && (
          <div className="review-standings">
            <h3>{isRoundComplete ? 'Round Standings' : 'Standings'}</h3>
            <div className="review-standings-list">
              {['N', 'E', 'S', 'W']
                .map(seat => ({
                  seat,
                  name: playerName(seat),
                  score: individualScores[seat] || 0,
                }))
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div key={p.seat} className={`review-standing-row ${idx === 0 ? 'leader' : ''}`}>
                    <span className="standing-rank">{idx + 1}.</span>
                    <span className="standing-name">{p.name} ({p.seat})</span>
                    <span className="standing-score">{p.score}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="review-actions">
          <button
            className="review-btn analyse-btn"
            onClick={onAnalyse}
            disabled={analysisLoading}
          >
            {analysisLoading ? 'Analysing...' : analysisText ? 'Re-analyse' : 'Analyse with Claude'}
          </button>
          {isRoundComplete ? (
            <>
              <button className="review-btn next-btn" onClick={onNewRound}>Start New Round</button>
              <button className="review-btn next-btn" onClick={onNextDeal}>Continue Deals</button>
            </>
          ) : (
            <button className="review-btn next-btn" onClick={onNextDeal}>Next Deal</button>
          )}
        </div>
      </div>
    </div>
  );
}
