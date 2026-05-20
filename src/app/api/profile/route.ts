import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';
import { profileGetSchema } from './schema';

export async function GET(req: NextRequest) {
  const parsed = profileGetSchema.safeParse({
    email: req.nextUrl.searchParams.get('email'),
  });
  if (!parsed.success) {
    console.error(
      '[api/profile GET] 400 invalid params:',
      parsed.error.flatten()
    );
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  try {
    const user = await adminAuth.getUserByEmail(email);

    const snap = await adminDb
      .collection('userProfiles')
      .where('userId', '==', user.uid)
      .limit(1)
      .get();

    if (snap.empty) {
      console.error(
        '[api/profile GET] 404 profile not found for email:',
        email
      );
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
      console.error(
        '[api/profile GET] 404 auth user not found for email:',
        email
      );
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('[api/profile]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
