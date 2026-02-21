import React, { useState, useMemo } from 'react';
import Hand from './Hand';
import Card from './Card';
import BiddingBox, { BiddingHistory } from './BiddingBox';
import TrickArea from './TrickArea';
import ScoreSheet from './ScoreSheet';

const SEAT_NAMES = { N: 'North', E: 'East', S: 'South', W: 'West' };
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'NT' };

export default function GameTable({
  gameState, mySeat, myName, onStartGame, onBid, onPlayCard, onNextDeal, onNewRound, error
}) {
  const [showScores, setShowScores] = useState(false);

  if (!gameState) {
    return (
      <div className="app game-screen">
        <div className="loading">Waiting for game data...</div>
      </div>
    );
  }

  // Debug: validate gameState has expected shape
  if (typeof gameState !== 'object' || !gameState.phase || !gameState.players) {
    return (
      <div className="app game-screen">
        <div className="loading" style={{ fontSize: '0.8rem', maxWidth: '90vw', wordBreak: 'break-all' }}>
          <p>Unexpected game state:</p>
          <pre>{JSON.stringify(gameState, null, 2)}</pre>
        </div>
      </div>
    );
  }

  const { phase, players, vulnerability, dealer, dealNumber } = gameState;
  const seatPositions = getSeatPositions(mySeat);
  const positions = ['bottom', 'right', 'top', 'left'];
  const seatsInOrder = [mySeat, ...getOtherSeats(mySeat)];

  // Determine playable cards
  const playableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState.myHand) return [];

    const isMyDirectTurn = gameState.currentTurn === mySeat;
    const isControllingDummy = gameState.declarerControlsDummy && gameState.contract?.declarer === mySeat;

    if (isMyDirectTurn) {
      return getPlayableFromHand(gameState.myHand, gameState.currentTrick);
    }
    return [];
  }, [gameState, mySeat, phase]);

  // Dummy playable cards (when declarer controls dummy)
  const dummyPlayableCards = useMemo(() => {
    if (phase !== 'playing') return [];
    if (!gameState.declarerControlsDummy) return [];
    if (gameState.contract?.declarer !== mySeat) return [];
    if (!gameState.dummyHand) return [];
    return getPlayableFromHand(gameState.dummyHand, gameState.currentTrick);
  }, [gameState, mySeat, phase]);

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
              {Object.values(players).filter(p => p?.seated).length === 4 && (
                <button className="start-btn" onClick={onStartGame}>Deal First Hand</button>
              )}
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

          {/* Playing phase */}
          {phase === 'playing' && (
            <TrickArea
              currentTrick={gameState.currentTrick}
              mySeat={mySeat}
              contract={gameState.contract}
              tricksWon={gameState.tricksWon}
              trickNumber={gameState.trickNumber}
            />
          )}

          {/* Hand complete */}
          {phase === 'hand_complete' && (
            <div className="hand-complete">
              <h2>Hand Complete</h2>
              {renderLastHandResult(gameState)}
              <button className="next-btn" onClick={onNextDeal}>Next Deal</button>
            </div>
          )}

          {/* Round complete */}
          {phase === 'round_complete' && (
            <div className="round-complete">
              <h2>Round Complete!</h2>
              {renderLastHandResult(gameState)}
              <div className="round-totals">
                <h3>Round Totals</h3>
                <div className="total">NS: {gameState.totalScores.NS}</div>
                <div className="total">EW: {gameState.totalScores.EW}</div>
              </div>
              <button className="next-btn" onClick={onNewRound}>Start New Round</button>
              <button className="next-btn" onClick={onNextDeal}>Continue Deals</button>
            </div>
          )}
        </div>

        {/* My hand (bottom) */}
        {gameState.myHand && gameState.myHand.length > 0 && (
          <Hand
            cards={gameState.myHand}
            onPlayCard={onPlayCard}
            isMyTurn={gameState.currentTurn === mySeat && phase === 'playing'}
            playableCards={playableCards}
            position="bottom"
          />
        )}

        {/* Dummy hand (shown when revealed) */}
        {gameState.dummyHand && gameState.dummySeat && gameState.dummySeat !== mySeat && (
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
            position={getSeatPosition(gameState.dummySeat, mySeat)}
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
