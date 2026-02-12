import { io } from 'socket.io-client';

// In production, connect to same origin. In dev, connect to the local server.
const URL = import.meta.env.DEV ? 'http://localhost:3001' : undefined;

export const socket = io(URL, {
  autoConnect: false,
});
