import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

// Preset players - fixed names and seat assignments.
// All four play in the same shared room.
const PLAYERS = [
  { name: 'David',    seat: 'N', seatName: 'North' },
  { name: 'Hamish',   seat: 'E', seatName: 'East'  },
  { name: 'Vivienne', seat: 'S', seatName: 'South' },
  { name: 'Caroline', seat: 'W', seatName: 'West'  },
];

const GAME_CODE = 'bridge1';

export default function Lobby({ onJoin, error }) {
  const [occupied, setOccupied] = useState({}); // { N: { name, isBot }, ... }
  const [joining, setJoining] = useState(null);

  // Poll the lobby state so everyone can see who has joined.
  useEffect(() => {
    let stopped = false;

    const fetchLobby = () => {
      socket.emit('get-lobby', { gameCode: GAME_CODE }, (res) => {
        if (stopped) return;
        if (res && res.players) setOccupied(res.players);
      });
    };

    fetchLobby();
    const interval = setInterval(fetchLobby, 2000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  // Clear pending join state when an error comes back from the server.
  useEffect(() => {
    if (error) setJoining(null);
  }, [error]);

  const handleJoin = (player) => {
    setJoining(player.name);
    onJoin(GAME_CODE, player.name, player.seat);
  };

  const seatedCount = Object.values(occupied).filter(p => p?.seated && !p?.isBot).length;

  return (
    <div className="app lobby-screen">
      <div className="lobby">
        <h1>Bridge Four</h1>
        <p className="subtitle">Who's playing tonight?</p>

        <div className="preset-players">
          {PLAYERS.map(player => {
            const slot = occupied[player.seat];
            const takenByOther = slot?.seated && !slot.isBot && slot.name !== player.name;
            const takenBySelf  = slot?.seated && !slot.isBot && slot.name === player.name;
            const takenByBot   = slot?.seated && slot.isBot;
            const isJoining    = joining === player.name;

            let statusLabel = null;
            if (takenBySelf)  statusLabel = 'Joined — tap to reconnect';
            else if (takenByOther) statusLabel = `${slot.name} already here`;
            else if (takenByBot)   statusLabel = `Bot "${slot.name}" sitting here`;

            const disabled = takenByOther || isJoining;

            return (
              <button
                key={player.name}
                type="button"
                className={[
                  'preset-player-btn',
                  takenBySelf ? 'self' : '',
                  takenByOther ? 'occupied' : '',
                  takenByBot ? 'bot-sitting' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => !disabled && handleJoin(player)}
                disabled={disabled}
              >
                <span className="preset-name">{player.name}</span>
                <span className="preset-seat">{player.seatName}</span>
                {statusLabel && <span className="preset-status">{statusLabel}</span>}
              </button>
            );
          })}
        </div>

        {error && <div className="error-msg">{error}</div>}

        <p className="lobby-hint">
          {seatedCount === 0
            ? 'No one here yet. Tap your name to sit down.'
            : `${seatedCount} player${seatedCount === 1 ? '' : 's'} waiting. You can add bots once you're in.`}
        </p>
      </div>
    </div>
  );
}
