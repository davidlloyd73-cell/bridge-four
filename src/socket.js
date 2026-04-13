import { io } from 'socket.io-client';

// In production, connect to same origin. In dev, connect to the local server.
const URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;

export const socket = io(URL, {
  autoConnect: false,
});

// Ping the server every 8 minutes to prevent Render free tier from sleeping.
// Without this, the server can spin down mid-session and drop the 4th player's connection.
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  setInterval(() => {
    fetch('/api/ping').catch(() => {});
  }, 8 * 60 * 1000);
}
