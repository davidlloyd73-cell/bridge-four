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
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const phase = gameState?.phase;

  // Hooks must always be called in the same order (Rules of Hooks)
  // so these must come BEFORE any early returns
  const humanPlaysBoth = gameState?.humanPlaysBothHands;

  const playableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState?.myHand) return [];

    // When human plays both hands: my hand (dummy) is playable when it's dummy's turn
    if (humanPlaysBoth && gameState.currentTurn === mySeat) {
      return getPlayableFromHand(gameState.myHand, gameState.currentTrick);
    }

    const isMyDirectTurn = gameState.currentTurn === mySeat;
    if (isMyDirectTurn) {
      return getPlayableFromHand(gameState.myHand, gameState.currentTrick);
    }
    return [];
  }, [gameState, mySeat, phase, humanPlaysBoth]);

  const dummyPlayableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState?.declarerControlsDummy) return [];
    if (gameState.contract?.declarer !== mySeat) return [];
    if (!gameState.dummyHand) return [];
    return getPlayableFromHand(gameState.dummyHand, gameState.currentTrick);
  }, [gameState, mySeat, phase]);

  // Playable cards for the declarer's hand when human plays both
  const declarerPlayableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!humanPlaysBoth) return [];
    if (!gameState?.declarerHand) return [];
    const declarerSeat = gameState.declarerSeat;
    if (gameState.currentTurn !== declarerSeat) return [];
    return getPlayableFromHand(gameState.declarerHand, gameState.currentTrick);
  }, [gameState, phase, humanPlaysBoth]);

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
              {humanPlaysBoth ? (
                // Human is dummy but controls both hands (declarer is bot)
                <div className="status-your-turn">
                  <span className="status-icon">&#9654;</span>
                  <span>
                    {gameState.currentTurn === mySeat
                      ? 'Play from your hand (Dummy)'
                      : gameState.currentTurn === gameState.declarerSeat
                        ? `Play from ${players[gameState.declarerSeat]?.name}'s hand (Declarer)`
                        : `Waiting for ${players[gameState.currentTurn]?.name}...`}
                  </span>
                  <span className="status-sub">You are playing both hands</span>
                </div>
              ) : gameState.contract?.dummy === mySeat ? (
                <div className="status-dummy">
                  <span className="status-icon">&#128065;</span>
                  <span>You are the Dummy</span>
                  <span className="status-sub">
                    {players[gameState.contract.declarer]?.name} (Declarer) plays your cards
                  </span>
                  {gameState.tricksWon && (
                    <div className="dummy-progress">
                      <span>Trick {gameState.trickNumber || 1} of 13</span>
                      <span className="dummy-tricks-display">
                        {getTeam(gameState.contract.declarer) === 'NS' ? 'Us' : 'Them'}: {gameState.tricksWon[getTeam(gameState.contract.declarer)]}
                        {' / '}
                        {getTeam(gameState.contract.declarer) === 'NS' ? 'Them' : 'Us'}: {gameState.tricksWon[getTeam(gameState.contract.declarer) === 'NS' ? 'EW' : 'NS']}
                      </span>
                      <span className="dummy-target">
                        Need {6 + gameState.contract.level} tricks for contract
                      </span>
                    </div>
                  )}
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

        {/* My hand (bottom) */}
        {/* When humanPlaysBoth: show my hand at bottom even though I'm dummy */}
        {gameState.myHand && gameState.myHand.length > 0 && (humanPlaysBoth || gameState.dummySeat !== mySeat) && (
          <Hand
            cards={gameState.myHand}
            onPlayCard={onPlayCard}
            isMyTurn={(gameState.currentTurn === mySeat && phase === 'playing') || false}
            playableCards={playableCards}
            position="bottom"
            isDummy={humanPlaysBoth}
          />
        )}

        {/* Declarer's hand (shown when human plays both - at top/partner position) */}
        {humanPlaysBoth && gameState.declarerHand && gameState.declarerSeat && (
          <Hand
            cards={gameState.declarerHand}
            onPlayCard={onPlayCard}
            isMyTurn={gameState.currentTurn === gameState.declarerSeat && phase === 'playing'}
            playableCards={declarerPlayableCards}
            position={getSeatPosition(gameState.declarerSeat, mySeat)}
          />
        )}

        {/* Dummy hand (shown when revealed - visible to all players, but NOT when humanPlaysBoth) */}
        {!humanPlaysBoth && gameState.dummyHand && gameState.dummySeat && (
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
          individualScores={gameState.individualScores}
          players={gameState.players}
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
          individualScores={gameState.individualScores}
          players={gameState.players}
          onNextDeal={() => { setAnalysisText(null); onNextDeal(); }}
          onNewRound={() => { setAnalysisText(null); onNewRound(); }}
          analysisLoading={analysisLoading}
          analysisText={analysisText}
          onAnalyse={async () => {
            const lastScore = gameState.scores?.[gameState.scores.length - 1];
            if (!lastScore) return;
            setAnalysisLoading(true);
            setAnalysisText(null);
            try {
              const res = await fetch('/api/analyse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastScore),
              });
              const data = await res.json();
              setAnalysisText(data.analysis || data.error || 'No response.');
            } catch (err) {
              setAnalysisText(`Request failed: ${err.message}`);
            } finally {
              setAnalysisLoading(false);
            }
          }}
        />
      )}

      {/* Analysis is shown inline in DealReview */}
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
