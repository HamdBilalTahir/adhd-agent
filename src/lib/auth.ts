import { type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

/** Extracts and verifies the Firebase ID token from the Authorization header. Returns the uid. */
export async function verifyToken(req: NextRequest): Promise<string> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const idToken = authorization.slice(7);
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}
