import React, { useState, useMemo } from 'react';
import Hand from './Hand';
import Card from './Card';
import BiddingBox, { BiddingHistory } from './BiddingBox';
import TrickArea from './TrickArea';
import ScoreSheet from './ScoreSheet';
import DealReview from './DealReview';

const SEAT_NAMES = { N: 'North', E: 'East', S: 'South', W: 'West' };
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'NT' };

export default function GameTable({
  gameState, mySeat, myName, onStartGame, onBid, onPlayCard, onNextDeal, onNewRound, onAddBots, error
}) {
  const [showScores, setShowScores] = useState(false);
  const [analysisText, setAnalysisText] = useState(null);

  const phase = gameState?.phase;

  // Hooks must always be called in the same order (Rules of Hooks)
  // so these must come BEFORE any early returns
  const playableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState?.myHand) return [];

    const isMyDirectTurn = gameState.currentTurn === mySeat;

    if (isMyDirectTurn) {
      return getPlayableFromHand(gameState.myHand, gameState.currentTrick);
    }
    return [];
  }, [gameState, mySeat, phase]);

  const dummyPlayableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState?.declarerControlsDummy) return [];
    if (gameState.contract?.declarer !== mySeat) return [];
    if (!gameState.dummyHand) return [];
    return getPlayableFromHand(gameState.dummyHand, gameState.currentTrick);
  }, [gameState, mySeat, phase]);

  if (!gameState) {
    return (
      <div className="app game-screen">
        <div className="loading">Waiting for game data...</div>
      </div>
    );
  }

  const { players, vulnerability, dealer, dealNumber } = gameState;
  const positions = ['bottom', 'right', 'top', 'left'];
  const seatsInOrder = [mySeat, ...getOtherSeats(mySeat)];

  return (
    <div className="app game-screen">
      {/* Top bar */}
      <div className="top-bar">
        <div className="game-info">
          <span className="game-code">Room: {gameState.gameCode}</span>
          <span className="deal-info">Deal {(dealNumber % 4) + 1}/4</span>
          <span className={`vul-info ${vulnerability?.NS ? 'vul' : ''}`}>
            NS: {vulnerability?.NS ? 'VUL' : 'NV'}
          </span>
          <span className={`vul-info ${vulnerability?.EW ? 'vul' : ''}`}>
            EW: {vulnerability?.EW ? 'VUL' : 'NV'}
          </span>
        </div>
        <div className="top-actions">
          <button className="score-btn" onClick={() => setShowScores(true)}>
            Scores ({gameState.totalScores?.NS || 0} - {gameState.totalScores?.EW || 0})
          </button>
        </div>
      </div>

      {/* Game table */}
      <div className="table">
        {/* Player positions */}
        {seatsInOrder.map((seat, idx) => {
          const pos = positions[idx];
          const player = players[seat];
          const isDealer = seat === dealer;
          const isCurrentTurn = seat === gameState.currentTurn;
          const myTeam = getTeam(mySeat);
          const seatTeam = getTeam(seat);
          const isPartner = seat !== mySeat && seatTeam === myTeam;

          return (
            <div key={seat} className={`player-position pos-${pos}`}>
              <div className={`player-info ${isCurrentTurn ? 'active-turn' : ''} ${
                vulnerability?.[seatTeam] ? 'vulnerable' : ''}`}>
                <span className="player-name">
                  {player?.name || `(${SEAT_NAMES[seat]})`}
                  {isPartner && ' *'}
                </span>
                <span className="player-seat">{SEAT_NAMES[seat]}</span>
                {isDealer && <span className="dealer-badge">D</span>}
                {seat === mySeat && gameState.myHCP !== undefined && (
                  <span className="hcp-badge">{gameState.myHCP} HCP</span>
                )}
                {gameState.handSizes?.[seat] > 0 && pos !== 'bottom' && (
                  <span className="card-count">{gameState.handSizes[seat]} cards</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Center area */}
        <div className="center-area">
          {/* Waiting phase */}
          {phase === 'waiting' && (
            <div className="waiting-area">
              <h2>Waiting for Players</h2>
              <div className="seated-list">
                {['N', 'E', 'S', 'W'].map(s => (
                  <div key={s} className={`seat-status ${players[s]?.seated ? 'filled' : ''}`}>
                    {SEAT_NAMES[s]}: {players[s]?.name || 'Empty'}
                  </div>
                ))}
              </div>
              <div className="waiting-actions">
                {Object.values(players).filter(p => p?.seated).length < 4 && (
                  <button className="start-btn" onClick={onAddBots}>Fill with Bots</button>
                )}
                {Object.values(players).filter(p => p?.seated).length === 4 && (
                  <button className="start-btn" onClick={onStartGame}>Deal First Hand</button>
                )}
              </div>
            </div>
          )}

          {/* Bidding phase */}
          {phase === 'bidding' && (
            <div className="bidding-area">
              <BiddingHistory bids={gameState.bidding?.bids} dealer={dealer} />
              {gameState.bidding?.currentBidder === mySeat && gameState.validBids && (
                <BiddingBox
                  validBids={gameState.validBids}
                  onBid={onBid}
                  dealer={dealer}
                />
              )}
              {gameState.bidding?.currentBidder !== mySeat && (
                <div className="waiting-bid">
                  Waiting for {players[gameState.bidding?.currentBidder]?.name || gameState.bidding?.currentBidder} to bid...
                </div>
              )}
            </div>
          )}

          {/* Playing phase - turn/status indicator */}
          {phase === 'playing' && (
            <div className="play-status">
              {gameState.contract?.dummy === mySeat ? (
                <div className="status-dummy">
                  <span className="status-icon">&#128065;</span>
                  <span>You are the Dummy</span>
                  <span className="status-sub">{players[gameState.contract.declarer]?.name} (Declarer) plays your cards</span>
                </div>
              ) : gameState.currentTurn === mySeat ? (
                <div className="status-your-turn">
                  <span className="status-icon">&#9654;</span>
                  <span>Your turn to play</span>
                </div>
              ) : gameState.declarerControlsDummy && gameState.contract?.declarer === mySeat ? (
                <div className="status-your-turn">
                  <span className="status-icon">&#9654;</span>
                  <span>Play a card from Dummy's hand</span>
                </div>
              ) : (
                <div className="status-waiting">
                  Waiting for {players[gameState.currentTurn]?.name || gameState.currentTurn}...
                </div>
              )}
            </div>
          )}

          {/* Hand/Round complete - handled by DealReview overlay */}
          {(phase === 'hand_complete' || phase === 'round_complete') && (
            <div className="hand-complete">
              <h2>{phase === 'round_complete' ? 'Round Complete!' : 'Hand Complete'}</h2>
              <p style={{ color: '#aaa' }}>Review the deal below...</p>
            </div>
          )}
        </div>

        {/* Trick area overlay - positioned across the whole table */}
        {phase === 'playing' && (
          <TrickArea
            currentTrick={gameState.currentTrick}
            lastCompletedTrick={gameState.lastCompletedTrick}
            mySeat={mySeat}
            contract={gameState.contract}
            tricksWon={gameState.tricksWon}
            trickNumber={gameState.trickNumber}
          />
        )}

        {/* My hand (bottom) - hide when I am the dummy (shown via dummy hand instead) */}
        {gameState.myHand && gameState.myHand.length > 0 && gameState.dummySeat !== mySeat && (
          <Hand
            cards={gameState.myHand}
            onPlayCard={onPlayCard}
            isMyTurn={gameState.currentTurn === mySeat && phase === 'playing'}
            playableCards={playableCards}
            position="bottom"
          />
        )}

        {/* Dummy hand (shown when revealed - visible to all players) */}
        {gameState.dummyHand && gameState.dummySeat && (
          <Hand
            cards={gameState.dummyHand}
            onPlayCard={
              gameState.contract?.declarer === mySeat && gameState.declarerControlsDummy
                ? onPlayCard
                : undefined
            }
            isMyTurn={
              gameState.contract?.declarer === mySeat && gameState.declarerControlsDummy
            }
            playableCards={dummyPlayableCards}
            position={gameState.dummySeat === mySeat ? 'bottom' : getSeatPosition(gameState.dummySeat, mySeat)}
            isDummy
          />
        )}
      </div>

      {/* Error display */}
      {error && <div className="error-toast">{error}</div>}

      {/* Score sheet overlay */}
      {showScores && (
        <ScoreSheet
          scores={gameState.scores}
          totalScores={gameState.totalScores}
          onClose={() => setShowScores(false)}
        />
      )}

      {/* Post-deal review overlay */}
      {(phase === 'hand_complete' || phase === 'round_complete') && gameState.reviewHands && (
        <DealReview
          reviewHands={gameState.reviewHands}
          reviewBidding={gameState.reviewBidding}
          reviewBiddingDealer={gameState.reviewBiddingDealer}
          reviewHCP={gameState.reviewHCP}
          lastScore={gameState.scores?.[gameState.scores.length - 1]}
          isRoundComplete={phase === 'round_complete'}
          totalScores={gameState.totalScores}
          onNextDeal={() => { setAnalysisText(null); onNextDeal(); }}
          onNewRound={() => { setAnalysisText(null); onNewRound(); }}
          onAnalyse={() => {
            setAnalysisText('Coming soon! Claude analysis of bidding and play will be available in a future update.');
          }}
        />
      )}

      {/* Analysis popup */}
      {analysisText && (
        <div className="analysis-overlay" onClick={() => setAnalysisText(null)}>
          <div className="analysis-popup" onClick={e => e.stopPropagation()}>
            <div className="analysis-header">
              <h3>Claude Analysis</h3>
              <button className="close-btn" onClick={() => setAnalysisText(null)}>&times;</button>
            </div>
            <div className="analysis-body">
              <p>{analysisText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions

function getSeatPositions(mySeat) {
  const order = { N: 0, E: 1, S: 2, W: 3 };
  const myIdx = order[mySeat];
  const positions = {};
  const posNames = ['bottom', 'right', 'top', 'left'];
  for (const [seat, idx] of Object.entries(order)) {
    positions[seat] = posNames[(idx - myIdx + 4) % 4];
  }
  return positions;
}

function getSeatPosition(seat, mySeat) {
  return getSeatPositions(mySeat)[seat];
}

function getOtherSeats(mySeat) {
  const all = ['N', 'E', 'S', 'W'];
  const myIdx = all.indexOf(mySeat);
  return [all[(myIdx + 1) % 4], all[(myIdx + 2) % 4], all[(myIdx + 3) % 4]];
}

function getTeam(seat) {
  return (seat === 'N' || seat === 'S') ? 'NS' : 'EW';
}

function getPlayableFromHand(hand, currentTrick) {
  if (!currentTrick || currentTrick.length === 0) return hand;
  const ledSuit = currentTrick[0].card.suit;
  const suitCards = hand.filter(c => c.suit === ledSuit);
  return suitCards.length > 0 ? suitCards : hand;
}

function renderLastHandResult(gameState) {
  const scores = gameState.scores;
  if (scores.length === 0) return null;
  const last = scores[scores.length - 1];

  if (!last.contract) {
    return <p className="result-text">Passed out - no score</p>;
  }

  const needed = 6 + last.contract.level;
  const made = last.tricksMade;
  const diff = made - needed;

  return (
    <div className="hand-result">
      <p className="result-contract">
        {last.contract.level}{SUIT_SYMBOLS[last.contract.suit]}
        {last.contract.doubled ? 'X' : ''}{last.contract.redoubled ? 'XX' : ''} by {last.contract.declarer}
      </p>
      <p className="result-tricks">
        {made} tricks ({diff >= 0 ? `made ${diff > 0 ? '+' + diff : ''}` : `down ${Math.abs(diff)}`})
      </p>
      <p className="result-score">
        NS: {last.score.NS > 0 ? '+' : ''}{last.score.NS} | EW: {last.score.EW > 0 ? '+' : ''}{last.score.EW}
      </p>
    </div>
  );
}
