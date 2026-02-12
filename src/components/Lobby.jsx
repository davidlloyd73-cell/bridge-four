import React, { useState } from 'react';

const SEATS = [
  { id: 'N', label: 'North' },
  { id: 'E', label: 'East' },
  { id: 'S', label: 'South' },
  { id: 'W', label: 'West' },
];

export default function Lobby({ onJoin, error }) {
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState('bridge1');
  const [seat, setSeat] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim() && seat) {
      onJoin(gameCode.trim(), name.trim(), seat);
    }
  };

  return (
    <div className="app lobby-screen">
      <div className="lobby">
        <h1>Bridge Four</h1>
        <p className="subtitle">Chicago Bridge for Friends</p>

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Game Room</label>
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              placeholder="Room code"
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>Choose Your Seat</label>
            <div className="seat-picker">
              {SEATS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`seat-btn ${seat === s.id ? 'selected' : ''}`}
                  onClick={() => setSeat(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            type="submit"
            className="join-btn"
            disabled={!name.trim() || !seat}
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
}
