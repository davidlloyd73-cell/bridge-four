import React, { useState, useMemo, useEffect, useRef } from 'react';

// Absolute compass: North is always at the top, South at the bottom,
// East at the right, West at the left — regardless of which seat you occupy.
const COMPASS = { N: 'top', E: 'right', S: 'bottom', W: 'left' };
function getPosition(seat) { return COMPASS[seat] || 'bottom'; }
import Hand from './Hand';
import Card from './Card';
import BiddingBox, { BiddingHistory } from './BiddingBox';
import TrickArea from './TrickArea';
import ScoreSheet from './ScoreSheet';
import DealReview from './DealReview';
import PartnershipSelector from './PartnershipSelector';
import VideoFeeds from './VideoFeeds';
import { socket } from '../socket';

const SEAT_NAMES = { N: 'North', E: 'East', S: 'South', W: 'West' };

function playCardSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (_) {}
}
const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'NT' };
const SUIT_COLORS  = { S: 'black', H: 'red', D: 'red', C: 'black' };

export default function GameTable({
  gameState, mySeat, myName, onStartGame, onBid, onPlayCard, onNextDeal, onNewRound, onAddBots, onReplayHand, onChoosePartnership, onLeaveGame, onRestartGame, error
}) {
  const [showScores, setShowScores] = useState(false);
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [analysisText, setAnalysisText] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const prevTrickLen = useRef(0);
  // Persist the last completed trick so players can recall it after it clears
  const savedLastTrick = useRef(null);
  if (gameState?.lastCompletedTrick) {
    savedLastTrick.current = gameState.lastCompletedTrick;
  }

  // Play a card-snap sound whenever ANY player plays a card
  useEffect(() => {
    const trick = gameState?.currentTrick;
    if (!trick) return;
    if (trick.length > prevTrickLen.current) {
      playCardSound();
    }
    prevTrickLen.current = trick.length;
  }, [gameState?.currentTrick]);

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
          {phase === 'playing' && gameState.contract && (
            <>
              <span className="contract-info">
                {gameState.contract.level}
                <span className={gameState.contract.suit === 'H' || gameState.contract.suit === 'D' ? 'suit-red' : 'suit-black'}>
                  {SUIT_SYMBOLS[gameState.contract.suit]}
                </span>
                {gameState.contract.doubled ? 'X' : ''}{gameState.contract.redoubled ? 'XX' : ''}
                {' by '}{SEAT_NAMES[gameState.contract.declarer]}
              </span>
              <span className="tricks-info">
                NS {gameState.tricksWon?.NS ?? 0}–EW {gameState.tricksWon?.EW ?? 0}
                {' · Trick '}{gameState.trickNumber}/13
              </span>
            </>
          )}
        </div>
        <div className="top-actions">
          {savedLastTrick.current && phase === 'playing' && (
            <button className="last-trick-btn" onClick={() => setShowLastTrick(true)}
              title="View the last completed trick">
              &#9654; Last Trick
            </button>
          )}
          <button
            className="score-btn"
            onClick={() => setVideoEnabled(v => !v)}
            title="Toggle video feeds"
          >
            {videoEnabled ? 'Video On' : 'Video Off'}
          </button>
          <button className="score-btn" onClick={() => setShowScores(true)}>
            Scores ({gameState.totalScores?.NS || 0} - {gameState.totalScores?.EW || 0})
          </button>
          <button
            className="restart-btn"
            onClick={() => {
              if (window.confirm('Reset the game? All scores and partnerships will be cleared.')) {
                onRestartGame?.();
              }
            }}
            title="Reset the game back to partnership selection"
          >
            Restart
          </button>
          <button
            className="leave-btn"
            onClick={() => {
              if (window.confirm('Leave the game? Your seat will open up for someone else.')) {
                onLeaveGame?.();
              }
            }}
            title="Leave this game and return to the lobby"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Game table */}
      <div className={`table phase-${phase} seat-${mySeat}`}>
        {/* Player positions — absolute compass: North top, South bottom, East right, West left */}
        {['N', 'E', 'S', 'W'].map((seat) => {
          const pos = getPosition(seat);
          const player = players[seat];
          const isDealer = seat === dealer;
          const isCurrentTurn = seat === gameState.currentTurn;
          const seatTeam = getTeam(seat);
          const isPartner = seat !== mySeat && getTeam(seat) === getTeam(mySeat);
          const isSelf = seat === mySeat;

          return (
            <div key={seat} className={`player-position pos-${pos}`}>
              <div className={`player-info ${isCurrentTurn ? 'active-turn' : ''} ${
                vulnerability?.[seatTeam] ? 'vulnerable' : ''} ${isSelf ? 'self' : ''}`}>
                <span className="player-name">
                  {player?.name || `(${SEAT_NAMES[seat]})`}
                  {isPartner && ' *'}
                </span>
                <span className="player-seat">{SEAT_NAMES[seat]}</span>
                {isDealer && <span className="dealer-badge">D</span>}
                {isSelf && gameState.myHCP !== undefined && (
                  <span className="hcp-badge">{gameState.myHCP} HCP</span>
                )}
                {gameState.handSizes?.[seat] > 0 && !isSelf && (
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
                {Object.values(players).filter(p => p?.seated).length === 4 && !gameState.partnershipsPending && (
                  <button className="start-btn" onClick={onStartGame}>Deal First Hand</button>
                )}
                {gameState.partnershipsPending && (
                  <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Pick partnerships to start the rubber...
                  </p>
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

        {/* My hand — always at the bottom, always full-size */}
        {gameState.myHand && gameState.myHand.length > 0 && (humanPlaysBoth || gameState.dummySeat !== mySeat) && (
          <Hand
            cards={gameState.myHand}
            onPlayCard={onPlayCard}
            isMyTurn={(gameState.currentTurn === mySeat && phase === 'playing') || false}
            playableCards={playableCards}
            position={getPosition(mySeat)}
            isDummy={humanPlaysBoth}
            large
          />
        )}

        {/* Declarer's hand (shown when human plays both) */}
        {humanPlaysBoth && gameState.declarerHand && gameState.declarerSeat && (
          <Hand
            cards={gameState.declarerHand}
            onPlayCard={onPlayCard}
            isMyTurn={gameState.currentTurn === gameState.declarerSeat && phase === 'playing'}
            playableCards={declarerPlayableCards}
            position={getPosition(gameState.declarerSeat)}
            large
          />
        )}

        {/* Dummy hand (shown when revealed) */}
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
            position={getPosition(gameState.dummySeat)}
            isDummy
            trumpSuit={gameState.contract?.suit}
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
          onReplayHand={() => { setAnalysisText(null); onReplayHand(); }}
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

      {/* Partnership selector overlay — shown whenever the server is
          awaiting a partnership pick (new game with 4 humans, or start
          of a new rubber after the previous one ended). */}
      {gameState.partnershipsPending && phase === 'waiting' && (() => {
        // If any individual scores exist we're at the start of a new rubber
        // (career totals persist across rubbers). Otherwise it's a fresh game.
        const isNewRubber = gameState.individualScores
          && Object.keys(gameState.individualScores).length > 0;
        return (
          <PartnershipSelector
            players={gameState.players}
            myName={myName}
            onChoose={onChoosePartnership}
            title={isNewRubber ? 'Choose Partnerships for New Rubber' : 'Choose Partnerships'}
            subtitle={Object.values(gameState.players || {}).filter(p => p?.seated).length === 4
              ? undefined
              : 'Waiting for all 4 players to join...'}
          />
        );
      })()}

      {/* Video feeds — 4 webcam tiles positioned around the table.
          Off by default; the user toggles it on from the top bar. */}
      <VideoFeeds
        socket={socket}
        mySeat={mySeat}
        players={gameState.players}
        enabled={videoEnabled}
      />

      {/* Last trick overlay */}
      {showLastTrick && savedLastTrick.current && (
        <div className="last-trick-overlay" onClick={() => setShowLastTrick(false)}>
          <div className="last-trick-modal" onClick={e => e.stopPropagation()}>
            <h3>Last Trick
              {savedLastTrick.current.winner && (
                <span className="trick-winner-label">
                  — won by {gameState?.players?.[savedLastTrick.current.winner]?.name || savedLastTrick.current.winner}
                </span>
              )}
            </h3>
            <div className="last-trick-compass">
              {['N','E','S','W'].map(seat => {
                const entry = savedLastTrick.current.cards?.find(c => c.seat === seat);
                const isWinner = savedLastTrick.current.winner === seat;
                const pos = getPosition(seat);
                return (
                  <div key={seat} className={`last-trick-pos last-trick-${pos} ${isWinner ? 'trick-winner' : ''}`}>
                    <div className="last-trick-seat-name">{gameState?.players?.[seat]?.name || seat}</div>
                    {entry ? (
                      <div className={`card last-trick-card ${SUIT_COLORS[entry.card.suit]}`}>
                        <div className="card-corner top-left">
                          <span className="card-rank">{entry.card.rank}</span>
                          <span className="card-suit">{SUIT_SYMBOLS[entry.card.suit]}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="last-trick-empty">—</div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="last-trick-close" onClick={() => setShowLastTrick(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Analysis is shown inline in DealReview */}
    </div>
  );
}

// Helper functions

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
