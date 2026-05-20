import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  try {
    const user = await adminAuth.getUserByEmail(email);

    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', user.uid)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = snap.docs[0].data() as UserProfile;

    let supervisorEmail: string | null = null;
    if (profile.supervisorId) {
      const supSnap = await adminDb
        .collection('userProfiles')
        .where('userId', '==', profile.supervisorId)
        .limit(1)
        .get();
      if (!supSnap.empty) {
        supervisorEmail = (supSnap.docs[0].data() as UserProfile).email;
      }
    }

    return NextResponse.json({ supervisorEmail });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('[api/profile]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
