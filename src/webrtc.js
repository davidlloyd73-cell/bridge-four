// Simple full-mesh WebRTC peer manager for the 4 players in a game.
// One RTCPeerConnection per remote seat, signalling relayed through the
// existing Socket.IO server (see server/index.js: 'webrtc-signal').
//
// Usage:
//   const mgr = new VideoConference(socket);
//   await mgr.start(mySeat);                     // ask for camera/mic
//   mgr.onRemoteStream = (seat, stream) => {...} // called when a peer connects
//   mgr.onRemoteGone = (seat) => {...}
//   mgr.connectTo(['N','E','S','W'].filter(s => s !== mySeat));
//   mgr.stop();

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Seats are compared as strings, so we fix a canonical order for deciding
// which side is the "offerer" in a pair (the lower one).
const SEAT_ORDER = ['N', 'E', 'S', 'W'];
function isOfferer(mySeat, otherSeat) {
  return SEAT_ORDER.indexOf(mySeat) < SEAT_ORDER.indexOf(otherSeat);
}

export class VideoConference {
  constructor(socket) {
    this.socket = socket;
    this.mySeat = null;
    this.localStream = null;
    // seat -> RTCPeerConnection
    this.peers = new Map();
    // seat -> MediaStream
    this.remoteStreams = new Map();
    this.onRemoteStream = null; // (seat, stream) => void
    this.onRemoteGone = null;   // (seat) => void
    this.onLocalStream = null;  // (stream) => void
    this.videoEnabled = true;
    this.audioEnabled = true;
    this._signalHandler = this._handleSignal.bind(this);
    this.socket.on('webrtc-signal', this._signalHandler);
  }

  async start(mySeat) {
    this.mySeat = mySeat;
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: true,
      });
      if (this.onLocalStream) this.onLocalStream(this.localStream);
      return this.localStream;
    } catch (err) {
      console.warn('Could not get local media:', err.message);
      throw err;
    }
  }

  // Given a list of seats that are currently in the game, ensure we have
  // a peer connection to each of them. Called whenever the seat roster
  // changes (new player joins, partnership rotation, etc.).
  syncPeers(otherSeats) {
    const wanted = new Set(otherSeats);
    // Drop peers that are no longer in the game
    for (const seat of Array.from(this.peers.keys())) {
      if (!wanted.has(seat)) {
        this._closePeer(seat);
      }
    }
    // Add new peers
    for (const seat of wanted) {
      if (!this.peers.has(seat)) {
        this._createPeer(seat);
        // The offerer initiates the negotiation
        if (isOfferer(this.mySeat, seat)) {
          this._negotiate(seat);
        }
      }
    }
  }

  _createPeer(seat) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks so the remote receives our stream
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // ICE -> relay to peer
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.socket.emit('webrtc-signal', {
          to: seat,
          type: 'ice',
          payload: ev.candidate.toJSON(),
        });
      }
    };

    // Incoming remote track
    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      this.remoteStreams.set(seat, stream);
      if (this.onRemoteStream) this.onRemoteStream(seat, stream);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // Could attempt to reconnect; for now just clean up
        if (pc.connectionState === 'failed') {
          this._closePeer(seat);
        }
      }
    };

    this.peers.set(seat, pc);
    return pc;
  }

  async _negotiate(seat) {
    const pc = this.peers.get(seat);
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit('webrtc-signal', {
        to: seat,
        type: 'offer',
        payload: { sdp: offer.sdp, type: offer.type },
      });
    } catch (err) {
      console.warn(`Negotiation to ${seat} failed:`, err.message);
    }
  }

  async _handleSignal({ from, type, payload }) {
    if (!from || from === this.mySeat) return;
    let pc = this.peers.get(from);
    // If an offer arrives before we've created the peer (e.g. peer was the
    // offerer and we hadn't sync'd yet), create it on the fly.
    if (!pc) {
      pc = this._createPeer(from);
    }
    try {
      if (type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('webrtc-signal', {
          to: from,
          type: 'answer',
          payload: { sdp: answer.sdp, type: answer.type },
        });
      } else if (type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
        }
      } else if (type === 'ice') {
        try {
          await pc.addIceCandidate(payload);
        } catch (err) {
          // Sometimes candidates arrive before remote description is set
          console.warn(`ICE add failed from ${from}:`, err.message);
        }
      }
    } catch (err) {
      console.warn(`Signal handling error from ${from} (${type}):`, err.message);
    }
  }

  _closePeer(seat) {
    const pc = this.peers.get(seat);
    if (pc) {
      try { pc.close(); } catch (_) {}
      this.peers.delete(seat);
    }
    if (this.remoteStreams.has(seat)) {
      this.remoteStreams.delete(seat);
      if (this.onRemoteGone) this.onRemoteGone(seat);
    }
  }

  toggleVideo() {
    this.videoEnabled = !this.videoEnabled;
    if (this.localStream) {
      for (const t of this.localStream.getVideoTracks()) {
        t.enabled = this.videoEnabled;
      }
    }
    return this.videoEnabled;
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    if (this.localStream) {
      for (const t of this.localStream.getAudioTracks()) {
        t.enabled = this.audioEnabled;
      }
    }
    return this.audioEnabled;
  }

  stop() {
    this.socket.off('webrtc-signal', this._signalHandler);
    for (const seat of Array.from(this.peers.keys())) {
      this._closePeer(seat);
    }
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
      this.localStream = null;
    }
  }
}
