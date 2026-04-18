import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoConference } from '../webrtc';

// Mirrors GameTable's relative-compass rotation (my seat is always at the
// bottom). Keep in sync with RELATIVE_POSITIONS in GameTable.jsx.
const RELATIVE_POSITIONS = {
  S: { N: 'top',    E: 'right', S: 'bottom', W: 'left'   },
  W: { N: 'left',   E: 'top',   S: 'right',  W: 'bottom' },
  N: { N: 'bottom', E: 'left',  S: 'top',    W: 'right'  },
  E: { N: 'right',  E: 'bottom',S: 'left',   W: 'top'    },
};
function getPosition(seat, mySeat) {
  return (RELATIVE_POSITIONS[mySeat] || RELATIVE_POSITIONS.S)[seat];
}

// A single video tile bound to a MediaStream.
function VideoTile({ stream, label, position, isLocal }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className={`video-tile video-${position} ${isLocal ? 'local' : ''}`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      ) : (
        <div className="tile-placeholder">No video</div>
      )}
      <div className="tile-label">{label}</div>
    </div>
  );
}

export default function VideoFeeds({ socket, mySeat, players, enabled = true }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { seat: MediaStream }
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [error, setError] = useState(null);
  const confRef = useRef(null);

  // Start/stop the video conference when enabled toggles or mySeat changes.
  useEffect(() => {
    if (!enabled || !mySeat || !socket) return;
    let cancelled = false;
    const conf = new VideoConference(socket);
    confRef.current = conf;
    conf.onLocalStream = (s) => { if (!cancelled) setLocalStream(s); };
    conf.onRemoteStream = (seat, stream) => {
      if (cancelled) return;
      setRemoteStreams(prev => ({ ...prev, [seat]: stream }));
    };
    conf.onRemoteGone = (seat) => {
      if (cancelled) return;
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[seat];
        return next;
      });
    };
    conf.start(mySeat).catch(err => {
      if (!cancelled) setError(err.message || 'Camera unavailable');
    });
    return () => {
      cancelled = true;
      conf.stop();
      confRef.current = null;
      setLocalStream(null);
      setRemoteStreams({});
    };
  }, [enabled, mySeat, socket]);

  // Sync peer list whenever the human seats change.
  useEffect(() => {
    if (!confRef.current || !mySeat || !players) return;
    const otherHumanSeats = ['N', 'E', 'S', 'W'].filter(
      s => s !== mySeat && players[s] && !players[s].isBot
    );
    confRef.current.syncPeers(otherHumanSeats);
  }, [mySeat, players]);

  const toggleVideo = useCallback(() => {
    if (confRef.current) setVideoOn(confRef.current.toggleVideo());
  }, []);
  const toggleAudio = useCallback(() => {
    if (confRef.current) setAudioOn(confRef.current.toggleAudio());
  }, []);

  if (!enabled || !mySeat) return null;

  const seats = ['N', 'E', 'S', 'W'];
  return (
    <>
      {seats.map(seat => {
        const player = players?.[seat];
        if (!player) return null;
        if (player.isBot) return null;
        const isLocal = seat === mySeat;
        const stream = isLocal ? localStream : remoteStreams[seat];
        return (
          <VideoTile
            key={seat}
            stream={stream}
            label={player.name || seat}
            position={getPosition(seat, mySeat)}
            isLocal={isLocal}
          />
        );
      })}
      <div className="video-controls">
        <button
          className={videoOn ? 'active' : 'off'}
          onClick={toggleVideo}
          title="Toggle camera"
        >
          {videoOn ? 'Cam On' : 'Cam Off'}
        </button>
        <button
          className={audioOn ? 'active' : 'off'}
          onClick={toggleAudio}
          title="Toggle microphone"
        >
          {audioOn ? 'Mic On' : 'Mic Off'}
        </button>
        {error && <span style={{ color: '#faa', fontSize: '0.75rem' }}>{error}</span>}
      </div>
    </>
  );
}
