import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const COOKIE = 'adhd_session';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function getSessionId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/adhd_session=([^;]+)/);
  return match ? match[1] : null;
}

export async function createSession(userId: string, email: string): Promise<void> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await setDoc(doc(db, 'sessions', sessionId), {
    userId,
    email,
    createdAt: now,
    lastSeenAt: now,
    active: true,
  });

  document.cookie = `${COOKIE}=${sessionId}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export async function endSession(): Promise<void> {
  const sessionId = getSessionId();

  if (sessionId) {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        active: false,
        endedAt: new Date().toISOString(),
      });
    } catch {
      // session doc may not exist — ignore
    }
  }

  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
