import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [mySeat, setMySeat] = useState(null);
  const [myName, setMyName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('game-state', (state) => setGameState(state));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game-state');
      socket.disconnect();
    };
  }, []);

  const joinGame = useCallback((gameCode, name, seat) => {
    setError(null);
    socket.emit('join-game', { gameCode, name, seat }, (response) => {
      if (response.error) {
        setError(response.error);
      } else {
        setInGame(true);
        setMySeat(response.seat);
        setMyName(name);
      }
    });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('start-game', null, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const makeBid = useCallback((bid) => {
    socket.emit('make-bid', { bid }, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const playCardAction = useCallback((card) => {
    socket.emit('play-card', { card }, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const nextDeal = useCallback(() => {
    socket.emit('next-deal', null, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const newRound = useCallback(() => {
    socket.emit('new-round', null, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  if (!connected) {
    return (
      <div className="app connecting">
        <div className="logo">
          <h1>Bridge Four</h1>
          <p>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (!inGame) {
    return <Lobby onJoin={joinGame} error={error} />;
  }

  return (
    <GameTable
      gameState={gameState}
      mySeat={mySeat}
      myName={myName}
      onStartGame={startGame}
      onBid={makeBid}
      onPlayCard={playCardAction}
      onNextDeal={nextDeal}
      onNewRound={newRound}
      error={error}
    />
  );
}
