import { io } from 'socket.io-client';

// In production, connect to same origin. In dev, connect to the local server.
const URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;

// Force WebSocket transport: skips the HTTP polling phase that fails during
// Render cold starts (polling gets a 502 which socket.io treats as permanent).
export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Ping the server every 4 minutes to prevent Render free tier from sleeping.
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  setInterval(() => {
    fetch('/api/ping').catch(() => {});
  }, 4 * 60 * 1000);
}
