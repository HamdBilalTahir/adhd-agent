// Server-only — runs in API routes, uses Firebase Admin SDK
import { adminDb } from './firebase-admin';
import type { Relationship } from '@/types';

const CODE_EXPIRY_HOURS = 48;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  return Array.from(
    { length: 8 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

/**
 * Creates a pending relationship doc with the invite code as the document ID.
 * Returns the generated code.
 */
export async function createInviteCode(supervisorId: string): Promise<string> {
  const code = generateCode();
  const relationship: Relationship = {
    supervisorId,
    superviseeId: null,
    status: 'pending',
    inviteCode: code,
    linkedAt: null,
    createdAt: new Date().toISOString(),
  };

  await adminDb.collection('relationships').doc(code).set(relationship);
  return code;
}

/**
 * Redeems an invite code: updates the relationship to active and links the supervisee.
 * Returns the supervisorId on success, null on invalid/expired/used code.
 */
export async function redeemInviteCode(
  code: string,
  superviseeId: string
): Promise<string | null> {
  const ref = adminDb.collection('relationships').doc(code);
  const snap = await ref.get();

  if (!snap.exists) return null;

  const rel = snap.data() as Relationship;
  if (rel.status !== 'pending') return null;
  if (rel.superviseeId !== null) return null;

  const createdAt = new Date(rel.createdAt).getTime();
  if (Date.now() - createdAt > CODE_EXPIRY_HOURS * 3_600_000) return null;

  await ref.update({
    superviseeId,
    status: 'active',
    linkedAt: new Date().toISOString(),
  });

  return rel.supervisorId;
}
