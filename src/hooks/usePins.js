import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  serverTimestamp, doc, query, orderBy, getDocs, where, deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isConfigured } from '../firebase';

const PINS_COLLECTION = 'pins';
const TTL_DAYS = 7;

// Compress an image File to a Blob (max 1200px wide, JPEG 0.82)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1200;
      let { width, height } = img;
      if (width > MAX_W) {
        height = Math.round((height * MAX_W) / width);
        width = MAX_W;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function usePins() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Real-time listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, PINS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const cutoff = now - TTL_DAYS * 24 * 60 * 60 * 1000;

        // Auto-delete expired pins (runs on every client that is open — harmless)
        snapshot.docs.forEach((d) => {
          const ts = d.data().createdAt?.toMillis?.() ?? 0;
          if (ts && ts < cutoff && !d.data().removed) {
            updateDoc(doc(db, PINS_COLLECTION, d.id), { removed: true }).catch(() => {});
          }
        });

        setPins(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  // ── Add a pin (upload photo first, then write Firestore doc) ────────────────
  const addPin = useCallback(async ({ file, from, caption }) => {
    if (!isConfigured || !db || !storage) throw new Error('Firebase not configured');

    let imageUrl = '';
    if (file) {
      const blob = await compressImage(file);
      const storageRef = ref(storage, `pins/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      imageUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, PINS_COLLECTION), {
      from: from.trim() || 'Family',
      caption: caption.trim(),
      imageUrl,
      createdAt: serverTimestamp(),
      removed: false,
    });
  }, []);

  // ── Remove a pin from the wall (mark removed, stays in archive) ─────────────
  const removePin = useCallback(async (id) => {
    if (!isConfigured || !db) return;
    await updateDoc(doc(db, PINS_COLLECTION, id), { removed: true });
  }, []);

  return { pins, loading, error, addPin, removePin };
}
