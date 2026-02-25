import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ── Paste your Firebase project config here ───────────────────────────────────
// 1. Go to https://console.firebase.google.com → your project → Project settings
// 2. Under "Your apps" → web app → copy the firebaseConfig object below
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const isConfigured = !Object.values(firebaseConfig).includes("REPLACE_ME");

const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db      = isConfigured ? getFirestore(app) : null;
export const storage = isConfigured ? getStorage(app)   : null;
