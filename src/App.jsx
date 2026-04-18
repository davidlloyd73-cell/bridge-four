import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Corkboard from './pages/Corkboard';
import Archive from './pages/Archive';
import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#8B0000', color: '#fff', padding: '2rem', height: '100vh', overflow: 'auto' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {this.state.error?.message}
          </pre>
          <h3 style={{ marginTop: '1rem' }}>Stack:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem', color: '#faa' }}>
            {this.state.error?.stack}
          </pre>
          <h3 style={{ marginTop: '1rem' }}>Component Stack:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem', color: '#faa' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    socket.on('game-state', (state) => {
      setGameState(state);
      // The server tags every game-state payload with the recipient's seat.
      // Partnership rotation re-assigns seats mid-session, so keep mySeat
      // in sync with whatever the server now says our seat is.
      if (state?.mySeat) setMySeat(state.mySeat);
    });

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

  const addBots = useCallback(() => {
    socket.emit('add-bots', null, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const replayHandAction = useCallback(() => {
    socket.emit('replay-hand', null, (response) => {
      if (response?.error) setError(response.error);
    });
  }, []);

  const choosePartnership = useCallback((pairing, done) => {
    socket.emit('choose-partnership', pairing, (response) => {
      if (response?.error) setError(response.error);
      done?.();
    });
  }, []);

  const leaveGame = useCallback(() => {
    socket.emit('leave-game', null, (response) => {
      if (response?.error) {
        setError(response.error);
        return;
      }
      setInGame(false);
      setMySeat(null);
      setMyName('');
      setGameState(null);
      setError(null);
    });
  }, []);

  const restartGame = useCallback(() => {
    socket.emit('restart-game', null, (response) => {
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
    <Layout>
      <Routes>
        <Route path="/" element={<Corkboard />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    <ErrorBoundary>
      <GameTable
        gameState={gameState}
        mySeat={mySeat}
        myName={myName}
        onStartGame={startGame}
        onBid={makeBid}
        onPlayCard={playCardAction}
        onNextDeal={nextDeal}
        onNewRound={newRound}
        onAddBots={addBots}
        onReplayHand={replayHandAction}
        onChoosePartnership={choosePartnership}
        onLeaveGame={leaveGame}
        onRestartGame={restartGame}
        error={error}
      />
    </ErrorBoundary>
  );
}
